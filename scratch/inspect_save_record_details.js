const fs = require('fs');

const lines = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

for (let i = 7950; i <= 8045; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
