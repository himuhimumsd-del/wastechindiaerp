const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

function showGetLive(name) {
  const idx = content.indexOf(`function ${name}(`);
  if (idx !== -1) {
    console.log(`\n=== ${name} ===`);
    console.log(content.slice(idx, idx + 1000));
  } else {
    console.log(`\n=== ${name} NOT FOUND ===`);
  }
}

showGetLive('getLivePoReceived');
showGetLive('getLivePoIssued');
showGetLive('getLiveGrn');
showGetLive('getLiveInvoices');
showGetLive('getLiveReceivedInvoices');
showGetLive('getLiveTrips');
showGetLive('getLiveGateVerification');
showGetLive('getLiveMachineLogs');
showGetLive('getLiveConsumableLogs');
showGetLive('getLivePayrollLedger');
showGetLive('getLiveAttendance');
