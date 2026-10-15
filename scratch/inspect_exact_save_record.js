const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');
const lines = content.split('\n');

for (let i = 7825; i <= 7845; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
