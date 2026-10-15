const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

console.log('=== INSPECTING deleteRecord ===');
const delIdx = content.indexOf('function deleteRecord(moduleKey, recordId)');
if (delIdx !== -1) {
  console.log(content.slice(delIdx, delIdx + 2000));
}

console.log('\n=== INSPECTING logAudit ===');
const logIdx = content.indexOf('function logAudit(moduleKey, action, recordData)');
if (logIdx !== -1) {
  console.log(content.slice(logIdx, logIdx + 1200));
}
