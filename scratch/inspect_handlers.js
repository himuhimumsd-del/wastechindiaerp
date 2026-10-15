const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

function showFunc(name) {
  const idx = content.indexOf('function ' + name);
  if (idx !== -1) {
    console.log(`\n=== FUNCTION ${name} ===`);
    console.log(content.slice(idx, idx + 1500));
  } else {
    console.log(`\n=== FUNCTION ${name} NOT FOUND ===`);
  }
}

showFunc('fetchLiveMaster');
showFunc('hydrateLiveMasterData');
showFunc('processMasterSave');
showFunc('processMasterDelete');
