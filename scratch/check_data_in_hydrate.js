const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('function hydrateLiveMasterData');
const endIdx = content.indexOf('function fetchLiveMaster', idx);
const block = content.slice(idx, endIdx !== -1 ? endIdx : idx + 10000);

const matches = [...block.matchAll(/state\.data\.([a-zA-Z0-9_]+)\s*=[^;]+/g)];
console.log('Assignments to state.data inside hydrateLiveMasterData:');
matches.forEach(m => console.log('  ' + m[0]));
