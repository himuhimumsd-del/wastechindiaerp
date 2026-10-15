const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Check deleteRecord
const delIdx = content.indexOf('function deleteRecord');
if (delIdx !== -1) {
  console.log('=== deleteRecord snippet ===');
  console.log(content.slice(delIdx, delIdx + 1200));
}

// Check logAudit password redaction
const logIdx = content.indexOf('function logAudit');
if (logIdx !== -1) {
  console.log('=== logAudit snippet ===');
  console.log(content.slice(logIdx, logIdx + 1200));
}
