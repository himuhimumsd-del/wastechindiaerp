const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');
console.log('Has \\r\\n:', content.includes('\r\n'));
console.log('Has \\n:', content.includes('\n'));
