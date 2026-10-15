const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Look for functions related to hydration and master saves
const matches = [...content.matchAll(/function\s+([a-zA-Z0-9_]*(?:Master|Hydrat|save|fetch)[a-zA-Z0-9_]*)\s*\(/g)];
const funcs = new Set(matches.map(m => m[1]));
console.log('Matching functions in frontend/app.js:');
[...funcs].sort().forEach(f => console.log('  ' + f));
