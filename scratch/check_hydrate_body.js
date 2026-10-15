const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('function hydrateLiveMasterData');
// Find end of function
console.log('hydrateLiveMasterData starts at:', idx);
console.log(content.slice(idx, idx + 2000));
