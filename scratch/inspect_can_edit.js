const fs = require('fs');

const lines = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

for (let i = 5100; i <= 5140; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
