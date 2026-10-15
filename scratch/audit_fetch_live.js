const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const regex = /fetchLiveMaster\(\s*['"]([a-zA-Z0-9_]+)['"]/g;
const matches = [];
let m;
while ((m = regex.exec(content)) !== null) {
    matches.push(m[1]);
}
console.log('Tables fetched via fetchLiveMaster:');
console.log([...new Set(matches)]);
