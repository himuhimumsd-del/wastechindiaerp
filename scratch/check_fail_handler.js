const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('function handleHydrationFailure');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1000));
}
