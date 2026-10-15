const fs = require('fs');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

const hydStart = appContent.indexOf('async function hydrateLiveMasterData() {');
const hydEnd = appContent.indexOf('// =========================================================================\n        // SYSTEM ACCESS & PERMISSIONS FOUNDATION', hydStart);
const hydSection = appContent.substring(hydStart, hydEnd > -1 ? hydEnd : hydStart + 25000);

const lines = hydSection.split('\n');
lines.forEach(l => {
  if (l.includes('// ') && (l.includes('. Live ') || l.includes('Live '))) {
    console.log(l.trim());
  }
});
