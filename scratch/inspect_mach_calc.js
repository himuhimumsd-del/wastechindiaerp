const fs = require('fs');

const app = fs.readFileSync('frontend/app.js', 'utf8');

const start = app.indexOf('function initMachineLogCalculators()');
if (start > -1) {
  const end = app.indexOf('\n        function ', start + 10);
  console.log(app.substring(start, end > -1 ? end : start + 1000));
} else {
  console.log('initMachineLogCalculators not found');
}
