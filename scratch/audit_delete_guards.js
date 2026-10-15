const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const sIdx = content.indexOf('function checkMasterDeletionDependencies(');
const eIdx = content.indexOf('async function processMasterSave(', sIdx);
console.log('checkMasterDeletionDependencies:');
console.log(content.slice(sIdx, eIdx));
