// Test suite for PowerWise Bill OCR Parsing
import { parseElectricityBillText } from './ocr.js';

const testCases = [
  // Required specific phrases from prompt:
  { text: "Your monthly consumption is 245 units for July.", expectedUnits: 245 },
  { text: "Active energy consumption: 245 kWh recorded.", expectedUnits: 245 },
  { text: "Consumption: 245", expectedUnits: 245 },
  { text: "Units Consumed 245", expectedUnits: 245 },
  { text: "Total Consumption 245 Units", expectedUnits: 245 },
  
  // Variations across discoms:
  { text: "Total Billed Units: 450 kWh\nTotal Amount Payable: Rs. 3850.00", expectedUnits: 450, expectedAmount: 3850 },
  { text: "Units Consumed: 380\nNet Payable: ₹ 3,120", expectedUnits: 380, expectedAmount: 3120 },
  { text: "Meter Reading Summary\nConsumption 310\nBill Amount: 2650", expectedUnits: 310, expectedAmount: 2650 },
  { text: "Billed Units: 195.0\nNet Due Amount: Rs. 1650", expectedUnits: 195, expectedAmount: 1650 },
  { text: "Total Consumption = 520 Units\nPayable Amount: ₹ 4,500.00", expectedUnits: 520, expectedAmount: 4500 },
  { text: "245 units", expectedUnits: 245 },
  { text: "Recorded: 245 kWh", expectedUnits: 245 },
  { text: "Consumption: 245 kWh", expectedUnits: 245 },
  { text: "Consumption is 245 units", expectedUnits: 245 },
  { text: "Total Consumption (kWh): 450", expectedUnits: 450 },
  { text: "Units Consumed (kWh) = 380", expectedUnits: 380 },
  { text: "Consumed Units: 310", expectedUnits: 310 },
  { text: "Present Reading: 12540\nPrevious Reading: 12295", expectedUnits: 245 },
  { text: "Present Meter Reading 8,450\nPrevious Meter Reading 8,000", expectedUnits: 450 },
  { text: "Current Reading = 1500\nLast Reading = 1250", expectedUnits: 250 }
];

console.log("Running OCR regex parsing tests...\n");
let passed = 0;
let failed = 0;

testCases.forEach((tc, idx) => {
  const result = parseElectricityBillText(tc.text);
  const unitsMatch = (result.units === tc.expectedUnits);
  const amountMatch = (tc.expectedAmount === undefined || result.amount === tc.expectedAmount);

  if (unitsMatch && amountMatch) {
    console.log(`[PASS] Case ${idx + 1}: "${tc.text.replace(/\n/g, ' ')}" => Units: ${result.units}, Amount: ${result.amount}`);
    passed++;
  } else {
    console.error(`[FAIL] Case ${idx + 1}: "${tc.text.replace(/\n/g, ' ')}"`);
    console.error(`       Expected Units: ${tc.expectedUnits}, Got: ${result.units}`);
    if (tc.expectedAmount !== undefined) {
      console.error(`       Expected Amount: ${tc.expectedAmount}, Got: ${result.amount}`);
    }
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests.`);
if (failed > 0) process.exit(1);
