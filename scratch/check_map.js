const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const idx = content.indexOf('MASTER_PERSISTENCE_MAP');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1800));
}
