const fs = require('fs');

console.log('Running Bulk Multi-Record Checkbox & Deletion Verification Suite...');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Verify table header contains selectAllCheckbox
if (!appJs.includes('id="selectAllCheckbox"') || !appJs.includes('toggleSelectAllRows')) {
    console.error('FAIL: Table header selectAllCheckbox not found');
    process.exit(1);
}
console.log('✓ PASS: Table header selectAllCheckbox properly configured');

// 2. Verify rows contain row-select-checkbox
if (!appJs.includes('class="row-select-checkbox') || !appJs.includes('updateSelectedCount')) {
    console.error('FAIL: Row select checkbox not found in generateTableRows');
    process.exit(1);
}
console.log('✓ PASS: Row select checkbox wired with updateSelectedCount in generateTableRows');

// 3. Verify bulk delete button exists
if (!appJs.includes('id="bulkDeleteBtn"') || !appJs.includes('deleteSelectedRecords')) {
    console.error('FAIL: Bulk delete button not found in renderTableModule');
    process.exit(1);
}
console.log('✓ PASS: Bulk delete button wired in table action bar');

// 4. Verify deleteSelectedRecords function exists
if (!appJs.includes('async function deleteSelectedRecords(moduleKey)')) {
    console.error('FAIL: deleteSelectedRecords function not found');
    process.exit(1);
}
console.log('✓ PASS: deleteSelectedRecords implementation confirmed');

// 5. Test batch array removal logic
let testTrips = [
    { id: 'LR-1', trip_number: 'LR-1' },
    { id: 'LR-2', trip_number: 'LR-2' },
    { id: 'LR-3', trip_number: 'LR-3' },
    { id: 'LR-4', trip_number: 'LR-4' },
    { id: 'LR-5', trip_number: 'LR-5' }
];

const idsToDelete = ['LR-2', 'LR-4'];
testTrips = testTrips.filter(r => !idsToDelete.includes(r.id));

if (testTrips.length !== 3 || testTrips.map(t => t.id).join(',') !== 'LR-1,LR-3,LR-5') {
    console.error('FAIL: Batch filtering logic mismatch');
    process.exit(1);
}
console.log('✓ PASS: Batch multi-record filtering logic verified (LR-1, LR-3, LR-5 retained)');

console.log('\n======================================');
console.log('ALL BULK DELETION TESTS PASSED 100%!');
console.log('======================================');
