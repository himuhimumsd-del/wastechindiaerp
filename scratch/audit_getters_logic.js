const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const getters = [
  'getLivePoReceived',
  'getLivePoIssued',
  'getLiveGrn',
  'getLiveConsumables',
  'getLiveParties',
  'getLiveItems',
  'getLiveInvoices',
  'getLiveReceivedInvoices',
  'getLiveTrips',
  'getLiveGateEntries',
  'getLiveMachineLogs',
  'getLiveConsumableLogs',
  'getLiveAttendance',
  'getLivePayrollLedger'
];

getters.forEach(g => {
  const idx = content.indexOf(`function ${g}(`);
  if (idx !== -1) {
    const endIdx = content.indexOf('function ', idx + 10);
    console.log(`\n=== GETTER: ${g} ===`);
    console.log(content.slice(idx, endIdx !== -1 ? endIdx : idx + 600).trim());
  } else {
    console.log(`\n=== GETTER: ${g} NOT FOUND ===`);
  }
});
