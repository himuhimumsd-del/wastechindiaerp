const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('created_by')) {
    console.log(`${i+1}: ${l.trim().substring(0, 140)}`);
  }
});
