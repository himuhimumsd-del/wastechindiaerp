const fs = require('fs');

const app = fs.readFileSync('frontend/app.js', 'utf8');

const start = app.indexOf('function renderTableModule(');
const end = app.indexOf('\n        function ', start + 10);
const fn = app.substring(start, end);

fn.split('\n').forEach(l => {
  if (l.includes('canEdit') || l.includes('consumableLogs')) {
    console.log(l.trim());
  }
});
