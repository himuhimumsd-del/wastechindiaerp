const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const delIdx = content.indexOf('function deleteRecord(moduleKey, recordId)');
const endIdx = content.indexOf('function openRecordModal', delIdx);
console.log(content.slice(delIdx, endIdx));
