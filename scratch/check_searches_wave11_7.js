const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');

const searches = [
  'attendance',
  'payroll_ledger',
  "from('attendance')",
  "from('payroll_ledger')",
  '.insert(',
  '.update(',
  'processSmartAttendance',
  'runPayrollGeneration',
  'normalizeLiveAttendance',
  'normalizeLivePayrollLedger'
];

searches.forEach(s => {
  const parts = content.split(s);
  console.log(`${s}: ${parts.length - 1} occurrences`);
});
