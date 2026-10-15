const assert = require('assert');

// Mock browser environment for unit test
const window = {};
global.window = window;
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  title: 'Test'
};

// Extract normalizeLiveItem and getLiveItems from frontend/app.js
const fs = require('fs');
const appContent = fs.readFileSync('frontend/app.js', 'utf8');

// Test B: normalizeLiveItem
console.log('--- Test B: normalizeLiveItem ---');
eval(`
  ${appContent.slice(appContent.indexOf('function normalizeLiveItem('), appContent.indexOf('function normalizeLiveParty('))}
`);

// 1. Complete valid object
const fullItem = {
  id: 'ITM-1',
  name: 'Refuse Derived Fuel (RDF)',
  hsn_code: '3825',
  description: 'Processed municipal solid waste fuel pellets',
  default_unit_id: 'UNT-1',
  cgst_rate: 2.5,
  sgst_rate: 2.5,
  igst_rate: 0,
  ugst_rate: 0,
  is_active: true
};
const normFull = normalizeLiveItem(fullItem);
assert.strictEqual(normFull.id, 'ITM-1');
assert.strictEqual(normFull.name, 'Refuse Derived Fuel (RDF)');
assert.strictEqual(normFull.hsnCode, '3825');
assert.strictEqual(normFull.description, 'Processed municipal solid waste fuel pellets');
assert.strictEqual(normFull.defaultUnitId, 'UNT-1');
assert.strictEqual(normFull.cgst, 2.5);
assert.strictEqual(normFull.sgst, 2.5);
assert.strictEqual(normFull.igst, 0);
assert.strictEqual(normFull.ugst, 0);
assert.strictEqual(normFull.isActive, true);
console.log('✓ Complete valid object passed');

// 2. Missing optional fields
const minimalItem = {
  id: 'ITM-2',
  name: 'Hazardous Incineration Waste',
  hsn_code: '3825'
};
const normMin = normalizeLiveItem(minimalItem);
assert.strictEqual(normMin.id, 'ITM-2');
assert.strictEqual(normMin.name, 'Hazardous Incineration Waste');
assert.strictEqual(normMin.hsnCode, '3825');
assert.strictEqual(normMin.description, '');
assert.strictEqual(normMin.defaultUnitId, '');
assert.strictEqual(normMin.cgst, 0);
assert.strictEqual(normMin.sgst, 0);
assert.strictEqual(normMin.igst, 0);
assert.strictEqual(normMin.ugst, 0);
assert.strictEqual(normMin.isActive, true);
console.log('✓ Missing optional fields passed');

// 3. Null tax values
const nullTaxItem = {
  id: 'ITM-3',
  name: 'Raw Compost',
  hsn_code: '3101',
  cgst_rate: null,
  sgst_rate: null,
  igst_rate: null,
  ugst_rate: null
};
const normNullTax = normalizeLiveItem(nullTaxItem);
assert.strictEqual(normNullTax.cgst, 0);
assert.strictEqual(normNullTax.sgst, 0);
assert.strictEqual(normNullTax.igst, 0);
assert.strictEqual(normNullTax.ugst, 0);
console.log('✓ Null tax values passed');

// 4. Inactive item
const inactiveItem = {
  id: 'ITM-4',
  name: 'Discontinued Shredder Blade Scrap',
  hsn_code: '7204',
  is_active: false
};
const normInactive = normalizeLiveItem(inactiveItem);
assert.strictEqual(normInactive.isActive, false);
console.log('✓ Inactive item passed');

// 5. String numeric tax values
const stringTaxItem = {
  id: 'ITM-5',
  name: 'Plastic Flakes',
  hsn_code: '3915',
  cgst_rate: '9.00',
  sgst_rate: '9.00',
  igst_rate: '18.00',
  ugst_rate: '0.00'
};
const normStringTax = normalizeLiveItem(stringTaxItem);
assert.strictEqual(normStringTax.cgst, 9);
assert.strictEqual(normStringTax.sgst, 9);
assert.strictEqual(normStringTax.igst, 18);
assert.strictEqual(normStringTax.ugst, 0);
console.log('✓ String numeric tax values passed');

// Test C: getLiveItems behavior
console.log('\n--- Test C: getLiveItems behavior ---');
const state = {
  data: {
    itemMaster: [{ id: 'LEGACY-1', name: 'Mock Item' }]
  },
  liveMasters: {
    items: []
  },
  liveMasterLoaded: {
    items: false
  }
};

eval(`
  ${appContent.slice(appContent.indexOf('function getLiveItems('), appContent.indexOf('function getLiveUnits('))}
`);

// When not loaded, falls back to state.data.itemMaster
assert.strictEqual(getLiveItems().length, 1);
assert.strictEqual(getLiveItems()[0].id, 'LEGACY-1');
console.log('✓ Unloaded fallback to mock passed');

// When loaded successfully with 0 items, fail-closed authoritative [] returned
state.liveMasterLoaded.items = true;
state.liveMasters.items = [];
assert.strictEqual(getLiveItems().length, 0);
console.log('✓ Successful empty array authoritative passed (no fallback)');

// When loaded with live items
state.liveMasters.items = [normFull, normMin];
assert.strictEqual(getLiveItems().length, 2);
assert.strictEqual(getLiveItems()[0].name, 'Refuse Derived Fuel (RDF)');
console.log('✓ Live rows returned correctly passed');

console.log('\nAll Wave 10.8 Unit Tests PASSED!');
