const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');

const startIdx = content.indexOf('modulesConfig = {');
const targetKeys = ['receivedInvoice', 'payrollLedger', 'grn', 'invoices', 'machineLogs', 'consumableLogs', 'poIssued', 'poReceived', 'trips', 'gateVerification'];

targetKeys.forEach(k => {
  const modStart = content.indexOf(k + ':', startIdx);
  if (modStart !== -1) {
    const schemaIdx = content.indexOf('schema:', modStart);
    const bracketOpen = content.indexOf('[', schemaIdx);
    let depth = 0;
    let bracketClose = -1;
    for (let i = bracketOpen; i < bracketOpen + 15000; i++) {
      if (content[i] === '[') depth++;
      else if (content[i] === ']') {
        depth--;
        if (depth === 0) { bracketClose = i; break; }
      }
    }
    const schemaStr = content.slice(bracketOpen, bracketClose + 1);
    const keys = [];
    const re = /key:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(schemaStr)) !== null) {
      keys.push(m[1]);
    }
    console.log(`\n=== ${k} (${keys.length} fields) ===\n${keys.join(', ')}`);
  }
});
