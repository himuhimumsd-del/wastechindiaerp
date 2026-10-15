const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Match .from('...') or .from("...")
const matches = [...content.matchAll(/\.from\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
const tables = new Set(matches.map(m => m[1]));
console.log('Tables referenced via .from(...) in frontend/app.js:');
[...tables].sort().forEach(t => console.log('  ' + t));

// Also check any other table references
console.log('\nTotal unique .from() table names:', tables.size);
