const fs = require('fs');

const app = fs.readFileSync('frontend/app.js', 'utf8');
const idx = app.indexOf('async function loginWithCredentials');
console.log(app.slice(idx, idx + 2500));
