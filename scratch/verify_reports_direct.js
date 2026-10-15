const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

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
  const start = content.indexOf(`${k}: function`);
  if (start !== -1) {
    const end = content.indexOf('currentReportExport =', start);
    const body = content.slice(start, end !== -1 ? end + 200 : start + 2500);
    
    // Check getters called
    const getters = [...body.matchAll(/getLive[A-Za-z0-9_]+\(\)/g)].map(m => m[0]);
    // Check state.data references
    const stateData = [...body.matchAll(/state\.data\.([A-Za-z0-9_]+)/g)].map(m => m[1]);
    // Check plant filtering
    const hasPlantFilter = body.includes('plantIds') || body.includes('plantFilterOptions');

    console.log(`\n================ REPORT: ${k} ================`);
    console.log(`Exact Function: reportRenderers.${k}()`);
    console.log(`Live Getters: ${[...new Set(getters)].join(', ') || 'None'}`);
    console.log(`state.data Fallback References: ${[...new Set(stateData)].join(', ') || 'None'}`);
    console.log(`Plant Filtering: ${hasPlantFilter ? 'YES (plantIds filtered)' : 'NO'}`);
  }
});
