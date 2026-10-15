const fs = require('fs');
const js = fs.readFileSync('frontend/app.js', 'utf8');

js.split('\n').forEach((l, i) => {
  if (l.includes('modal-footer')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
