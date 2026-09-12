# PowerWise

PowerWise is a browser-based home electricity audit tool. Upload an electricity bill, verify the extracted consumption, estimate appliance usage in kWh, and identify the appliances with the largest energy impact.

## Features

- Bill image upload with browser-side OCR and editable consumption verification.
- Sample bills for quick demonstrations and testing.
- Appliance checklist with wattage, daily usage, quantity, and monthly unit estimates.
- Units-only audit report with energy-hog rankings and savings recommendations.
- Gemini-powered bill extraction fallback and energy advisor chat through the local Python server.
- Debug panel for OCR, API, and audit diagnostics.

## Requirements

- Python 3.9 or newer.
- A modern browser with JavaScript enabled.
- A Gemini API key for server-backed bill extraction and chat.
- Internet access to load Tesseract.js from jsDelivr and call the Gemini API.

No Python packages are required. The server uses only the Python standard library.

## Setup

1. Clone or download the project.
2. Create a `.env` file in the project root. Keep it private and never commit it:

	```env
	GCP_API_KEY="your-gemini-api-key"
	GEMINI_MODEL="gemini-3.6-flash"
	GEMINI_CHAT_MODEL="gemini-3.6-flash"
	```

	`GEMINI-API-KEY` and `GEMINI_API_KEY` are also supported for compatibility with existing environments.

3. Start the local server:

	```powershell
	py -3 server.py
	```

	On systems where `python` is available, use `python server.py` instead.

4. Open <http://localhost:8084> in a browser.

The port can be changed with `POWERWISE_PORT`:

```powershell
$env:POWERWISE_PORT = "8090"
py -3 server.py
```

## How It Works

1. **Bill OCR**: upload a bill image or select a sample bill. PowerWise extracts consumption in kWh or units and lets you correct it.
2. **Appliances**: select appliances and enter quantity and hours used per day.
3. **Audit report**: compare estimated monthly appliance consumption with the bill total, review the top consumers, and inspect recommendations.

The browser calls these local API routes when needed:

- `POST /api/extract-units` accepts a multipart image upload and asks Gemini for structured consumption data.
- `POST /api/chat` accepts a JSON message and audit context for the energy advisor.

## Testing

Run the Python requirement and OCR checks:

```powershell
py -3 verify_requirements.py
py -3 test_units_only_requirements.py
py -3 test_ocr_regex.py
```

Run the JavaScript OCR test with Node.js:

```powershell
node test_ocr.js
```

Check server syntax without starting it:

```powershell
py -3 -m py_compile server.py
```

## Project Structure

| File | Purpose |
| --- | --- |
| `index.html` | Application layout and controls |
| `styles.css` | Visual styling and responsive layout |
| `app.js` | UI state, navigation, chat, and audit rendering |
| `ocr.js` | Image preprocessing, OCR parsing, and sample bills |
| `appliances.js` | Appliance data, unit calculations, and recommendations |
| `server.py` | Static file server and Gemini API proxy |
| `sample-bills/` | Example bill assets |
| `test_*.js`, `test_*.py` | Project checks and OCR tests |

## Security Notes

- Store API credentials only in `.env` or the process environment.
- `.env` is excluded from version control; do not paste credentials into frontend files.
- The Python server blocks direct browser requests for hidden files such as `.env`.
- Treat uploaded bills as sensitive household information and use the app locally unless you add authentication and deployment controls.
