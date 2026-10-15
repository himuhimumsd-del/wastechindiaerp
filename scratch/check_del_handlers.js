const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

function showFunc(name) {
  const idx = content.indexOf('function ' + name);
  if (idx !== -1) {
    console.log(`\n=== ${name} ===`);
    console.log(content.slice(idx, idx + 1000));
  }
}

showFunc('processMasterDelete');
showFunc('processSignatureDelete');
showFunc('processTemplateDelete');
showFunc('processRoleDelete');
