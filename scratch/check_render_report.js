const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('function renderReportTable');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 4000));
}
