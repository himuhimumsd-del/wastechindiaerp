const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const matches = [...content.matchAll(/state\.data\.([a-zA-Z0-9_]+)\s*=\s*state\.liveMasters/g)];
console.log('Matches where state.data is synchronized to state.liveMasters:');
matches.forEach(m => console.log('  ' + m[0]));
