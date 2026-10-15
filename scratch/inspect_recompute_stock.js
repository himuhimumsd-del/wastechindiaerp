const fs = require('fs');

const lines = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

for (let i = 8260; i <= 8310; i++) {
  if (i - 1 < lines.length) {
    console.log(`${i}: ${lines[i-1]}`);
  }
}
