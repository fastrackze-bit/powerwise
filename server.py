#!/usr/bin/env python3
"""
PowerWise Local Development Web Server
Serves static assets with standard MIME types and CORS headers.
"""

import http.server
import socketserver
import os
import sys
import base64
import json
import mimetypes
import urllib.error
import urllib.request
import time
from email.parser import BytesParser
from email.policy import default

# 8080 is commonly occupied by an older static server; use the API-capable
# PowerWise port by default while still allowing an explicit override.
PORT = int(os.environ.get('POWERWISE_PORT', '8084'))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


def load_env_file():
    """Load simple KEY=VALUE entries without adding a dotenv dependency."""
    env_path = os.path.join(DIRECTORY, '.env')
    if not os.path.exists(env_path):
        return
    with open(env_path, 'r', encoding='utf-8') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)


def extract_uploaded_image(body, content_type):
    """Extract image bytes and MIME type from a browser multipart request."""
    message = BytesParser(policy=default).parsebytes(
        f'Content-Type: {content_type}\r\n\r\n'.encode() + body
    )
    for part in message.iter_attachments():
        payload = part.get_payload(decode=True)
        if payload:
            return payload, part.get_content_type()
    raise ValueError('No image file was included in the request.')


def extract_units_with_gemini(image_bytes, mime_type):
    """Ask Gemini to identify electricity consumption units from the bill image."""
    started_at = time.perf_counter()
    api_key = (
        os.environ.get('GCP_API_KEY')
        or os.environ.get('GEMINI-API-KEY')
        or os.environ.get('GEMINI_API_KEY')
    )
    if not api_key:
        raise RuntimeError('Gemini API key is not configured on the server.')

    model = os.environ.get('GEMINI_MODEL', 'gemini-3.8-flash')
    endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    prompt = (
        'Analyze this electricity bill image. Extract the total electricity consumption only. '
        'Return JSON only with this exact shape: '
        '{"units": number|null, "provider": string|null, "confidence": "high"|"medium"|"low"}. '
        'Units must be the billed energy consumption in kWh or units, not the meter number, '
        'account number, bill number, date, tariff, amount, or previous reading. '
        'If the bill does not clearly show total consumption, return units as null.'
    )
    request_body = {
        'contents': [{
            'parts': [
                {'text': prompt},
                {'inline_data': {
                    'mime_type': mime_type,
                    'data': base64.b64encode(image_bytes).decode('ascii')
                }}
            ]
        }],
        'generationConfig': {
            'temperature': 0,
            'responseMimeType': 'application/json'
        }
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(request_body).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'x-goog-api-key': api_key
        },
        method='POST'
    )

    try:
        request_started_at = time.perf_counter()
        with urllib.request.urlopen(request, timeout=45) as response:
            response_status = response.status
            response_body = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        detail = error.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Gemini API returned HTTP {error.code}: {detail[:500]}') from error
    except urllib.error.URLError as error:
        raise RuntimeError(f'Gemini API request failed: {error.reason}') from error

    try:
        text = response_body['candidates'][0]['content']['parts'][0]['text']
        result = json.loads(text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise RuntimeError('Gemini returned an invalid extraction response.') from error

    units = result.get('units')
    if units is not None:
        try:
            units = round(float(units))
        except (TypeError, ValueError) as error:
            raise RuntimeError('Gemini returned invalid unit data.') from error
        if not 10 <= units <= 10000:
            units = None

    return {
        'units': units,
        'provider': result.get('provider'),
        'confidence': result.get('confidence', 'low'),
        'source': 'gemini',
        'debug': [
            f'Gemini model: {model}',
            f'Image accepted: {mime_type}, {len(image_bytes)} bytes',
            f'Gemini HTTP response: {response_status}',
            f'Gemini request duration: {round((time.perf_counter() - request_started_at) * 1000)} ms',
            f'Unit validation: {"accepted" if units is not None else "no confident units"}',
            f'Server extraction duration: {round((time.perf_counter() - started_at) * 1000)} ms'
        ]
    }


def ask_gemini(message, audit_context):
    """Answer an energy question using Gemini and the user's current audit context."""
    api_key = (
        os.environ.get('GCP_API_KEY')
        or os.environ.get('GEMINI-API-KEY')
        or os.environ.get('GEMINI_API_KEY')
    )
    if not api_key:
        raise RuntimeError('Gemini API key is not configured on the server.')

    model = os.environ.get('GEMINI_CHAT_MODEL', os.environ.get('GEMINI_MODEL', 'gemini-3.6-flash'))
    endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    system_prompt = (
        'You are PowerWise Energy Advisor. Answer only questions about household electricity, '
        'energy consumption, kWh, appliances, efficiency, bills as consumption data, and energy savings. '
        'If a question is unrelated, briefly say you can only help with electricity and energy topics. '
        'Use the audit context when relevant. Never invent readings or prices. Keep answers practical, '
        'clear, and concise for a homeowner. All calculations must use units/kWh, never currency.'
    )
    request_body = {
        'system_instruction': {'parts': [{'text': system_prompt}]},
        'contents': [{
            'role': 'user',
            'parts': [{
                'text': f'Audit context (JSON): {json.dumps(audit_context)}\n\nQuestion: {message}'
            }]
        }],
        'generationConfig': {'temperature': 0.2, 'maxOutputTokens': 500}
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(request_body).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'x-goog-api-key': api_key
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response_body = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        detail = error.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Gemini chat API returned HTTP {error.code}: {detail[:500]}') from error
    except urllib.error.URLError as error:
        raise RuntimeError(f'Gemini chat request failed: {error.reason}') from error

    try:
        answer = response_body['candidates'][0]['content']['parts'][0]['text'].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise RuntimeError('Gemini returned an invalid chat response.') from error
    if not answer:
        raise RuntimeError('Gemini returned an empty chat response.')
    return {'answer': answer, 'model': model, 'provider': 'gemini'}

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers for seamless local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/chat':
            self.handle_chat_request()
            return
        if self.path != '/api/extract-units':
            self.send_json(404, {'ok': False, 'error': 'Unknown API route.'})
            return

        try:
            content_type = self.headers.get('Content-Type', '')
            request_started_at = time.perf_counter()
            if not content_type.startswith('multipart/form-data'):
                raise ValueError('Expected a multipart image upload.')
            content_length = int(self.headers.get('Content-Length', '0'))
            if content_length <= 0 or content_length > 12 * 1024 * 1024:
                raise ValueError('Image upload must be between 1 byte and 12 MB.')
            image_bytes, mime_type = extract_uploaded_image(self.rfile.read(content_length), content_type)
            print(f'[Gemini debug] image received: {mime_type}, {len(image_bytes)} bytes', flush=True)
            if not mime_type.startswith('image/'):
                raise ValueError('Uploaded file must be an image.')
            result = extract_units_with_gemini(image_bytes, mime_type)
            debug = result.pop('debug', [])
            debug.insert(0, f'Multipart request duration: {round((time.perf_counter() - request_started_at) * 1000)} ms')
            self.send_json(200, {'ok': True, 'parsed': result, 'debug': debug})
        except (ValueError, RuntimeError) as error:
            self.send_json(400, {'ok': False, 'error': str(error)})
        except Exception as error:
            self.send_json(500, {'ok': False, 'error': f'Unexpected extraction error: {error}'})

    def handle_chat_request(self):
        try:
            content_length = int(self.headers.get('Content-Length', '0'))
            if content_length <= 0 or content_length > 64 * 1024:
                raise ValueError('Chat request is empty or too large.')
            payload = json.loads(self.rfile.read(content_length).decode('utf-8'))
            message = str(payload.get('message', '')).strip()
            if not message or len(message) > 2000:
                raise ValueError('Please enter a question up to 2000 characters.')
            context = payload.get('context', {})
            result = ask_gemini(message, context if isinstance(context, dict) else {})
            self.send_json(200, {'ok': True, **result})
        except (ValueError, json.JSONDecodeError, RuntimeError) as error:
            self.send_json(400, {'ok': False, 'error': str(error)})
        except Exception as error:
            self.send_json(500, {'ok': False, 'error': f'Unexpected chat error: {error}'})

    def send_json(self, status, payload):
        response = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def do_GET(self):
        requested_path = self.path.split('?', 1)[0].rstrip('/')
        if requested_path == '/.env' or os.path.basename(requested_path).startswith('.'):
            self.send_error(404, 'Not found')
            return
        super().do_GET()

    def guess_type(self, path):
        # Ensure proper ES module MIME types
        if path.endswith('.js'):
            return 'text/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        return super().guess_type(path)

if __name__ == '__main__':
    load_env_file()
    os.chdir(DIRECTORY)
    # Allow socket address reuse to avoid bind errors on restart
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"=====================================================")
        print(f" PowerWise Energy Audit Server is live!")
        print(f" URL: http://localhost:{PORT}")
        print(f" Directory: {DIRECTORY}")
        print(f" Press Ctrl+C to stop.")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
            sys.exit(0)
