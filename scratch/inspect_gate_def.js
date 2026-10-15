const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');
const lines = content.split('\n');

for (let i = 104; i <= 112; i++) {
  console.log(`${i}: ${lines[i - 1]}`);
}
