const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('const reportRenderers = {');
if (idx !== -1) {
  const endIdx = content.indexOf('function generateId(', idx);
  const block = content.slice(idx, endIdx !== -1 ? endIdx : idx + 35000);
  
  const reportKeys = [
    'plantPerformance',
    'fleetTripRegister',
    'gateMovement',
    'grnReport',
    'materialMovement',
    'consumableStock',
    'poReceivedFulfilment',
    'poIssuedCommitment',
    'salesInvoiceRegister',
    'purchaseInvoiceRegister',
    'machinePerformance',
    'attendanceRegister',
    'payrollRegister',
    'overtimeReport'
  ];

  reportKeys.forEach(k => {
    const kIdx = block.indexOf(`${k}: function`);
    if (kIdx !== -1) {
      console.log(`\n================ REPORT RENDERER: ${k} ================`);
      console.log(block.slice(kIdx, kIdx + 1500));
    } else {
      console.log(`\n================ REPORT RENDERER: ${k} NOT FOUND ================`);
    }
  });
}
