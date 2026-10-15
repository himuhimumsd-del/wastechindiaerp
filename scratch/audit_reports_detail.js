const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Check reportRenderers for each report
const sIdx = content.indexOf('const reportRenderers = {');
const eIdx = content.indexOf('// ============ DASHBOARD STATS', sIdx);
const reportsCode = content.slice(sIdx, eIdx !== -1 ? eIdx : sIdx + 75000);

const reports = [
    { key: 'plantPerformance', name: 'Plant Performance Summary' },
    { key: 'fleetTripRegister', name: 'Fleet & Trip Register' },
    { key: 'gateMovement', name: 'Gate Movement Report' },
    { key: 'grnReport', name: 'GRN / Material Receipt Report' },
    { key: 'materialMovement', name: 'Material Movement / Stock Report' },
    { key: 'consumableStock', name: 'Consumable & Spare Stock Report' },
    { key: 'poReceivedFulfilment', name: 'PO Received / Customer Fulfilment' },
    { key: 'poIssuedCommitment', name: 'PO Issued / Purchase Commitment' },
    { key: 'salesInvoiceRegister', name: 'Sales Invoice Register' },
    { key: 'purchaseInvoiceRegister', name: 'Purchase Invoice Register' },
    { key: 'machinePerformance', name: 'Machine Performance Report' },
    { key: 'attendanceRegister', name: 'Attendance Register & Summary' },
    { key: 'payrollRegister', name: 'Payroll Register' },
    { key: 'overtimeReport', name: 'Overtime Report' }
];

reports.forEach(rep => {
    const rIdx = reportsCode.indexOf(rep.key + ':');
    if (rIdx === -1) {
        console.log(`[${rep.key}] NOT FOUND`);
        return;
    }
    const snippet = reportsCode.slice(rIdx, rIdx + 2000);
    // Find arrays filtered
    const arrayFilters = [...snippet.matchAll(/(?:state\.(?:data|liveMasters)\.[a-zA-Z0-9_]+|getLive[a-zA-Z0-9_]+\(\))/g)].map(m => m[0]);
    console.log(`=== Report: ${rep.name} (${rep.key}) ===`);
    console.log('  Data sources accessed:', [...new Set(arrayFilters)]);
});
