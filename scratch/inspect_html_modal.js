const fs = require('fs');
const content = fs.readFileSync('frontend/index.html', 'utf8');
const lines = content.split('\n');

for (let i = 135; i <= 175; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
