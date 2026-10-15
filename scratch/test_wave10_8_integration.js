const fs = require('fs');
const assert = require('assert');

const appContent = fs.readFileSync('frontend/app.js', 'utf8').replace(/\r\n/g, '\n');

console.log('--- Test D: hydrateLiveMasterData includes items ---');
assert(appContent.includes("const itemCols = 'id, name, hsn_code, description, default_unit_id, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active';"), 'itemCols definition missing or mismatched');
assert(appContent.includes("fetchLiveMaster(\n                    'items',\n                    itemCols"), 'fetchLiveMaster for items missing');
assert(appContent.includes("state.liveMasters.items = liveItems;"), 'state.liveMasters.items assignment missing');
console.log('✓ hydrateLiveMasterData correctly includes items with exact 10 columns');

console.log('\n--- Test E: renderTableModule renders live data for itemMaster ---');
const rtmIndex = appContent.indexOf('function renderTableModule(');
const rtmBlock = appContent.slice(rtmIndex, rtmIndex + 2000);
assert(rtmBlock.includes("if (moduleKey === 'itemMaster') {\n                allData = getLiveItems();"), 'itemMaster branch in renderTableModule missing');
console.log('✓ renderTableModule assigns allData = getLiveItems() for itemMaster');

console.log('\n--- Test F: Downstream item dropdowns resolve itemMaster via getLiveItems() ---');
const dsBlock = appContent.slice(appContent.indexOf("else if (field.dataSource) {"), appContent.indexOf("else if (field.dataSource) {") + 1500);
assert(dsBlock.includes("else if (field.dataSource.module === 'itemMaster') {\n                            related = getLiveItems();"), 'dataSource.module === itemMaster branch missing');
console.log('✓ Dropdown dataSource handler uses getLiveItems() for itemMaster');

console.log('\n--- Test Window Exports ---');
assert(appContent.includes('window.normalizeLiveItem = normalizeLiveItem;'), 'window.normalizeLiveItem missing');
assert(appContent.includes('window.getLiveItems = getLiveItems;'), 'window.getLiveItems missing');
console.log('✓ window.normalizeLiveItem and window.getLiveItems properly exposed');

console.log('\nAll integration assertions PASSED!');
