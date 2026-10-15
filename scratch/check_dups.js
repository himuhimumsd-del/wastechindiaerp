const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const matches = [];
let pos = 0;
while ((pos = content.indexOf('safeSnapshot', pos)) !== -1) {
  const lineNo = content.slice(0, pos).split('\n').length;
  matches.push({ pos, lineNo, snippet: content.slice(pos - 20, pos + 80).trim() });
  pos += 'safeSnapshot'.length;
}

console.log('Total occurrences of safeSnapshot:', matches.length);
matches.forEach(m => console.log(`Line ${m.lineNo}: ${m.snippet}`));
