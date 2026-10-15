const fs = require('fs');

const html = fs.readFileSync('frontend/index.html', 'utf8');
const idx = html.indexOf('id="login-form"');
if (idx !== -1) {
  console.log(html.slice(idx - 200, idx + 1200));
} else {
  console.log('login-form not found');
}
