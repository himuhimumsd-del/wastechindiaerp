const fs = require('fs');

const lines = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

for (let i = 8060; i <= 8260; i++) {
  if (i - 1 < lines.length) {
    console.log(`${i}: ${lines[i-1]}`);
  }
}
