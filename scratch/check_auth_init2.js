const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('initLiveAuthSession');
if (idx !== -1) {
  console.log(content.slice(idx - 30, idx + 2500));
}
