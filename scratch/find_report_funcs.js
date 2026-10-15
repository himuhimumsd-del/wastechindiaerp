const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const matches = [...content.matchAll(/function\s+(render[a-zA-Z0-9_]*Report[a-zA-Z0-9_]*|generate[a-zA-Z0-9_]*Report[a-zA-Z0-9_]*|[a-zA-Z0-9_]*ReportData)\s*\(/g)];
console.log('Report functions:');
matches.forEach(m => console.log('  ' + m[1]));

// Also look for how reports are rendered:
const idx = content.indexOf('function generateReport(');
if (idx !== -1) {
  console.log('\n=== function generateReport ===');
  console.log(content.slice(idx, idx + 2000));
}
