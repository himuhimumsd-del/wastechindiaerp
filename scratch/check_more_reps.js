const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

function printRepHead(name) {
  const idx = content.indexOf(`${name}: function`);
  if (idx !== -1) {
    console.log(`\n=== ${name} ===`);
    console.log(content.slice(idx, idx + 1000));
  }
}

printRepHead('fleetTripRegister');
printRepHead('grnReport');
printRepHead('consumableStock');
