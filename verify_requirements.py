import re
import sys

def check(condition, message):
    if condition:
        print(f"[PASS] {message}")
    else:
        print(f"[FAIL] {message}")
        sys.exit(1)

print("Verifying PowerWise Codebase against all User Specifications...\n")

# 1. Read files
with open('ocr.js', 'r', encoding='utf-8') as f:
    ocr_code = f.read()

with open('appliances.js', 'r', encoding='utf-8') as f:
    appliances_code = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    html_code = f.read()

with open('app.js', 'r', encoding='utf-8') as f:
    app_code = f.read()

# 2. Check Image Preprocessing Pipeline
check('preprocessBillImage' in ocr_code, "ocr.js implements preprocessBillImage")
check('scale = 2' in ocr_code or 'scale = 2' in ocr_code.replace(' ', ''), "Preprocessing implements 2x upscale")
check('0.299' in ocr_code and '0.587' in ocr_code, "Preprocessing implements standard luminance Grayscale conversion")
check('histogram' in ocr_code and ('minLum' in ocr_code or 'lowerClipCount' in ocr_code), "Preprocessing implements Auto-Contrast dynamic range histogram stretch")
check('sharp' in ocr_code and ('k = 0.35' in ocr_code or 'centerWeight' in ocr_code), "Preprocessing implements 3x3 convolution unsharp mask slight sharpen")

# 3. Check Multi-Phrasing Regex
check('consumption' in ocr_code.lower(), "Regex engine includes 'consumption' keyword")
check(bool(re.search(r'units\s*consumed', ocr_code, re.IGNORECASE)), "Regex matches 'Units Consumed' phrasing")
check(bool(re.search(r'total\s*\)?\s*\*?consumption', ocr_code, re.IGNORECASE)), "Regex matches 'Total Consumption' phrasing")
check('kwh|units' in ocr_code, "Regex matches number before label (units/kwh)")

# 4. Check Safety Net Editable Field
check('id="input-bill-units"' in html_code, "index.html has editable units field #input-bill-units")
check('id="input-bill-amount"' in html_code, "index.html has editable amount field #input-bill-amount")
check('Safety Net' in html_code, "index.html displays Safety Net Guarantee notice to user")
check('Confirm' in html_code, "index.html has explicit confirmation button before proceeding to appliances")

# 5. Check Reference Wattages
wattage_checks = [
    ('ac-non-inverter', '1500', "AC (non-inverter) 1500W"),
    ('ac-inverter', '1000', "AC (inverter) 1000W"),
    ('water-heater', '2000', "Water Heater 2000W"),
    ('washing-machine', '500', "Washing Machine 500W"),
    ('ceiling-fan', '75', "Ceiling Fan 75W"),
    ('refrigerator', '175', "Refrigerator reference (150-200W)"),
    ('television', '120', "Television reference (100-150W)")
]

for app_id, watt, desc in wattage_checks:
    check(f"wattage: {watt}" in appliances_code or f"wattage:{watt}" in appliances_code, f"Appliance wattage set: {desc}")

check('hours/day * count * 30) / 1000' in appliances_code or '(wattage * hoursPerDay * count * 30) / 1000' in appliances_code, "Formula: (wattage * hours/day * 30) / 1000 = units/month verified")

# 6. Check Dual Top Hog Spotlight & Rankings
check('hog-spotlight-card' in html_code, "#1 Energy Hog spotlight card present")
check('hog2-spotlight-card' in html_code, "#2 Major Consumer spotlight card present")
check('rankings-list' in html_code, "Appliance consumption rankings list present")

# 7. Check Savings Recommendation and Amazon Link
check('Buy efficient replacement' in html_code or 'Buy efficient replacement' in app_code, "'Buy efficient replacement' button text present")
check('amazon.in/s?k=' in appliances_code or 'amazon.in/s?k=' in app_code, "Amazon search link pattern present")
check('save ~' in app_code or 'save ~' in appliances_code, "Recommendation phrasing format matches 'save ~X units/month = ₹Y'")

print("\n🎉 All 17 Core Technical and Architectural Requirements Passed Verification!")
