import re

def parse_electricity_bill_text(raw_text):
    result = {
        'units': None,
        'amount': None,
        'provider': None,
        'confidence': 'low',
        'rawText': raw_text
    }
    if not raw_text:
        return result
    
    # Strip commas from numbers
    normalized = re.sub(r'(\d),(\d)', r'\1\2', raw_text)

    # 1. Provider detection
    if re.search(r'tata\s*power', normalized, re.IGNORECASE):
        result['provider'] = 'Tata Power'
    elif re.search(r'bescom', normalized, re.IGNORECASE):
        result['provider'] = 'BESCOM'
    elif re.search(r'msedcl|mahadiscom', normalized, re.IGNORECASE):
        result['provider'] = 'MSEDCL'
    elif re.search(r'adani', normalized, re.IGNORECASE):
        result['provider'] = 'Adani Electricity'
    elif re.search(r'torrent', normalized, re.IGNORECASE):
        result['provider'] = 'Torrent Power'
    elif re.search(r'bses', normalized, re.IGNORECASE):
        result['provider'] = 'BSES'

    # 2. Units (kWh) extraction
    # Specific patterns covering:
    # - "Total Consumption 245 Units"
    # - "Consumption: 245" or "Consumption 245"
    # - "Units Consumed 245"
    # - "245 units", "245 kWh"
    unit_patterns = [
        # Match 'Total Consumption 245 Units' or 'Consumption 245 Units' or 'Units Consumed: 245 Units'
        r'(?:total\s*)?consumption[\s\:\-=|]+([0-9]{1,5}(?:\.[0-9]+)?)(?:\s*(?:units|kwh))?',
        r'units\s*consumed[\s\:\-=|]+([0-9]{1,5}(?:\.[0-9]+)?)(?:\s*(?:units|kwh))?',
        r'(?:total\s*units|billed\s*units|net\s*units|energy\s*units|actual\s*consumption|energy\s*consumption|billed\s*consumption|monthly\s*consumption)[\s\:\-=|]+([0-9]{1,5}(?:\.[0-9]+)?)(?:\s*(?:units|kwh))?',
        # Number before label: '245 units', '245 kWh', '245.5 kwh'
        r'([0-9]{2,5}(?:\.[0-9]+)?)\s*(?:kwh|units(?:\s*consumed)?)\b',
        # Standalone 'Units: 245', 'kWh: 245'
        r'\b(?:units|kwh)[\s\:\-=|]+([0-9]{2,5}(?:\.[0-9]+)?)\b'
    ]

    for pat in unit_patterns:
        m = re.search(pat, normalized, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 10 <= val <= 10000:
                result['units'] = round(val)
                break

    # 3. Amount extraction
    amount_patterns = [
        r'(?:net\s*payable|total\s*amount\s*payable|amount\s*payable|total\s*amount\s*due|net\s*amount|total\s*due|bill\s*amount|payable\s*amount|amount\s*due|net\s*bill\s*amount|current\s*demand)[\s\:\-=\u20B9₹Rs\.]*([0-9]+(?:\.[0-9]{2})?)',
        r'(?:[\u20B9₹]|rs\.?|inr)\s*([0-9]{3,6}(?:\.[0-9]{2})?)',
        r'(?:total\s*charge|grand\s*total)[\s\:\-=\u20B9₹Rs\.]*([0-9]+(?:\.[0-9]{2})?)'
    ]

    for pat in amount_patterns:
        m = re.search(pat, normalized, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 100 <= val <= 500000:
                result['amount'] = round(val)
                break

    if result['units'] and result['amount']:
        result['confidence'] = 'high'
    elif result['units'] or result['amount']:
        result['confidence'] = 'medium'

    return result

test_cases = [
    ("Your monthly consumption is 245 units for July.", 245, None),
    ("Active energy consumption: 245 kWh recorded.", 245, None),
    ("Consumption: 245", 245, None),
    ("Units Consumed 245", 245, None),
    ("Total Consumption 245 Units", 245, None),
    ("Total Billed Units: 450 kWh\nTotal Amount Payable: Rs. 3850.00", 450, 3850),
    ("Units Consumed: 380\nNet Payable: ₹ 3,120", 380, 3120),
    ("Meter Reading Summary\nConsumption 310\nBill Amount: 2650", 310, 2650),
    ("Billed Units: 195.0\nNet Due Amount: Rs. 1650", 195, 1650),
    ("Total Consumption = 520 Units\nPayable Amount: ₹ 4,500.00", 520, 4500),
    ("245 units", 245, None),
    ("Recorded: 245 kWh", 245, None),
    ("Consumption: 245 kWh", 245, None)
]

passed = 0
for text, exp_units, exp_amt in test_cases:
    res = parse_electricity_bill_text(text)
    u_ok = (res['units'] == exp_units)
    a_ok = (exp_amt is None or res['amount'] == exp_amt)
    if u_ok and a_ok:
        print(f"[PASS] '{text.replace('\n', ' ')}' -> Units: {res['units']}, Amount: {res['amount']}")
        passed += 1
    else:
        print(f"[FAIL] '{text.replace('\n', ' ')}' -> Got {res['units']}, {res['amount']} (Expected {exp_units}, {exp_amt})")

print(f"\n{passed}/{len(test_cases)} tests passed.")
if passed != len(test_cases):
    exit(1)
