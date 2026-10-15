const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const reports = [
  'plantPerformance',
  'grnReport',
  'poReceivedFulfilment',
  'poIssuedCommitment',
  'materialMovement',
  'payrollRegister',
  'salesInvoiceRegister',
  'purchaseInvoiceRegister',
  'consumableStock',
  'attendanceRegister',
  'overtimeReport',
  'machinePerformance',
  'gateMovement',
  'fleetTripRegister'
];

reports.forEach(rep => {
  console.log(`\n================== REPORT: ${rep} ==================`);
  // Find where report is rendered or data is prepared
  let idx = content.indexOf(`case '${rep}':`);
  if (idx === -1) idx = content.indexOf(`'${rep}':`);
  if (idx === -1) idx = content.indexOf(`${rep}:`);
  if (idx !== -1) {
    console.log(content.slice(idx, idx + 1000));
  } else {
    // Search for function or usage
    const reg = new RegExp(`function\\s+render(?:Report)?${rep}`, 'i');
    const m = content.match(reg);
    if (m) {
      const fIdx = content.indexOf(m[0]);
      console.log(content.slice(fIdx, fIdx + 1000));
    } else {
      console.log('Case not found directly, searching string occurrences:');
      let pos = 0;
      let count = 0;
      while ((pos = content.indexOf(rep, pos)) !== -1 && count < 3) {
        console.log(`Occurrence at ${pos}: ` + content.slice(pos - 50, pos + 150));
        pos += rep.length;
        count++;
      }
    }
  }
});
