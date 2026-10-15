const fs = require('fs');
const html = fs.readFileSync('frontend/index.html', 'utf8');
const js = fs.readFileSync('frontend/app.js', 'utf8');

console.log('--- Search saveRecord in index.html ---');
html.split('\n').forEach((l, i) => {
  if (l.includes('saveRecord')) {
    console.log(`index.html:${i+1}: ${l.trim()}`);
  }
});

console.log('--- Search saveRecord in app.js ---');
js.split('\n').forEach((l, i) => {
  if (l.includes('saveRecord')) {
    console.log(`app.js:${i+1}: ${l.trim()}`);
  }
});
