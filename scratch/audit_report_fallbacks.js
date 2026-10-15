const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Find all occurrences of ternary with state.data in reportRenderers
const repIdx = content.indexOf('const reportRenderers = {');
const repEnd = content.indexOf('function generateId(', repIdx);
const reportsBlock = content.slice(repIdx, repEnd);

const lines = content.split('\n');

const occurrences = [];
lines.forEach((line, lineIdx) => {
  if (lineIdx >= 10000 && lineIdx <= 14500) { // report renderers area
    if (line.includes('typeof getLive') || line.includes(': state.data')) {
      occurrences.push({ lineNo: lineIdx + 1, text: line.trim() });
    }
  }
});

console.log('Occurrences found in report section:');
occurrences.forEach(o => console.log(`L${o.lineNo}: ${o.text}`));
