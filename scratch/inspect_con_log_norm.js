const fs = require('fs');

const lines = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

for (let i = 1474; i <= 1515; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
