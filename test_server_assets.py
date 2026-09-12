import urllib.request
import sys

files = ['index.html', 'styles.css', 'app.js', 'appliances.js', 'ocr.js']
all_ok = True

for f in files:
    try:
        url = f'http://localhost:8080/{f}'
        req = urllib.request.urlopen(url)
        content = req.read().decode('utf-8')
        mime = req.headers.get('Content-Type')
        print(f'[OK] {f}: Status {req.status}, MIME {mime}, Size {len(content)} chars')
    except Exception as e:
        print(f'[FAIL] {f}: {e}')
        all_ok = False

if not all_ok:
    sys.exit(1)
print('\nAll files successfully verified on HTTP server!')
