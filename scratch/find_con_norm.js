const fs = require('fs');

const app = fs.readFileSync('frontend/app.js', 'utf8');

const lines = app.split('\n');
lines.forEach((l, i) => {
  if (l.includes('normalize') && l.toLowerCase().includes('consumable')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
