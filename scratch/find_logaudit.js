const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('function logAudit(');
if (idx !== -1) {
  const lineNo = content.slice(0, idx).split('\n').length;
  console.log('function logAudit is at line:', lineNo);
  console.log(content.slice(idx, idx + 1000));
} else {
  console.log('function logAudit not found!');
}
