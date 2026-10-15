const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const sIdx = content.indexOf('async function hydrateLiveMasterData(');
const eIdx = content.indexOf('async function ', sIdx + 50);
console.log('hydrateLiveMasterData length:', eIdx - sIdx);

const fnCode = content.slice(sIdx, eIdx);
const lines = fnCode.split('\n');
lines.forEach((l, idx) => {
    if (l.includes('fetchLiveMaster(') || l.includes('// ') && l.includes('. Live')) {
        console.log(`L${idx}: ${l.trim()}`);
    }
});
