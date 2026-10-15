
const fs = require('fs');
const code = fs.readFileSync('frontend/data-provider.js', 'utf8');

// evaluate code; in Node.js top-level, it attaches to global.WasteTechDataProvider
eval(code);
const dp = global.WasteTechDataProvider;

console.log('API loaded:', !!dp);

// Test Correction 2: getTableName for composite vs single
console.log('companyMaster tableName:', dp.getTableName('companyMaster'));
console.log('partiesMaster tableName:', dp.getTableName('partiesMaster'));
console.log('usersMaster tableName:', dp.getTableName('usersMaster'));
console.log('grn tableName:', dp.getTableName('grn'));
console.log('invoices tableName:', dp.getTableName('invoices'));

if (dp.getTableName('companyMaster') !== null) throw new Error('companyMaster should be null');
if (dp.getTableName('partiesMaster') !== null) throw new Error('partiesMaster should be null');
if (dp.getTableName('usersMaster') !== null) throw new Error('usersMaster should be null');
if (dp.getTableName('grn') !== null) throw new Error('grn should be null');
if (dp.getTableName('invoices') !== 'sales_invoices') throw new Error('invoices should be sales_invoices');

// Test Correction 1: mapToDatabase allow-list
const testInput = {
    id: 'INV-101',
    client: 'CUST-1',
    date: '2024-05-10',
    totalAmount: 5000,
    unmappedFoo: 'danger',
    unknownSecret: 999,
    extraUiState: true
};
const mapped = dp.mapToDatabase('invoices', testInput);
console.log('Mapped invoices object keys:', Object.keys(mapped));
console.log('Mapped invoices object:', JSON.stringify(mapped));

if (mapped.unmappedFoo !== undefined) throw new Error('unmappedFoo should NOT be emitted');
if (mapped.unknownSecret !== undefined) throw new Error('unknownSecret should NOT be emitted');
if (mapped.extraUiState !== undefined) throw new Error('extraUiState should NOT be emitted');
if (mapped.invoice_number !== 'INV-101') throw new Error('id should map to invoice_number');
if (mapped.party_id !== 'CUST-1') throw new Error('client should map to party_id');
if (mapped.total_amount !== 5000) throw new Error('totalAmount should map to total_amount');

// Test unmapped module returns empty object
const unmappedModResult = dp.mapToDatabase('nonExistentModule', { a: 1, b: 2 });
if (Object.keys(unmappedModResult).length !== 0) throw new Error('Unmapped module should return empty object');

// Test Correction 3: auditLogs rawSnapshot
const auditInput = {
    id: 'AUD-1',
    moduleKey: 'trips',
    recordId: '36422655',
    action: 'Update',
    details: 'Status changed',
    rawSnapshot: '{"status":"Completed"}',
    companyId: 'COMP-1'
};
const mappedAudit = dp.mapToDatabase('auditLogs', auditInput);
console.log('Mapped auditLogs object:', JSON.stringify(mappedAudit));
if (mappedAudit.rawSnapshot !== undefined) throw new Error('rawSnapshot should NOT be emitted');
if (mappedAudit.after_state !== undefined) throw new Error('after_state should NOT be emitted');
if (mappedAudit.before_state !== undefined) throw new Error('before_state should NOT be emitted');
if (mappedAudit.entity_type !== 'trips') throw new Error('moduleKey should map to entity_type');
if (mappedAudit.entity_id !== '36422655') throw new Error('recordId should map to entity_id');
if (mappedAudit.companyId !== 'COMP-1') throw new Error('companyId should map to companyId');

console.log('ALL NODE BEHAVIORAL TESTS PASSED SUCCESSFULLY!');
