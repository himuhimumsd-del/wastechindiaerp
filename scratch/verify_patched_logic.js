const fs = require('fs');

const code = fs.readFileSync('scratch/app_test.js', 'utf8').replace(/\r\n/g, '\n');

console.log('Test 1: Check code contents...');
console.log('buildLiveGateEntryPayload present:', code.includes('function buildLiveGateEntryPayload'));
console.log('processGateSave present:', code.includes('async function processGateSave'));
console.log('gate_entries insert present:', code.includes(".from('gate_entries')") && code.includes(".insert(insertPayload)"));
console.log('gate_entries update present:', code.includes(".from('gate_entries')") && code.includes(".update(updatePayload)"));
console.log('saveRecord gate delegation present:', code.includes("if (moduleKey === 'gateVerification') {\n                return processGateSave();\n            }"));
console.log('window exports present:', code.includes("window.buildLiveGateEntryPayload = buildLiveGateEntryPayload;"));
