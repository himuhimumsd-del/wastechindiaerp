const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = 1221894;
const slice = content.slice(idx, idx + 25000);

const loadedMatches = [...slice.matchAll(/state\.liveMasterLoaded\.([a-zA-Z0-9_]+)\s*=\s*(true|false)/g)];
console.log('state.liveMasterLoaded flags updated in hydrateLiveMasterData:');
[...new Set(loadedMatches.map(m => `${m[1]} = ${m[2]}`))].forEach(s => console.log('  ' + s));
