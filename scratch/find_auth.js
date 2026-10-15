const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const matches = [...content.matchAll(/function\s+([a-zA-Z0-9_]*auth[a-zA-Z0-9_]*|[a-zA-Z0-9_]*login[a-zA-Z0-9_]*|[a-zA-Z0-9_]*session[a-zA-Z0-9_]*)\s*\(/gi)];
matches.forEach(m => console.log(m[1]));
