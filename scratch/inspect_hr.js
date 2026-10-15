const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');
const lines = content.split('\n');

console.log('=== Lines 10750 - 10765 ===');
for (let i = 10750; i < 10765; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}
