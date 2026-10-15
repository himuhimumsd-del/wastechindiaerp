const fs = require('fs');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

function printConfig(moduleKey) {
  const start = appContent.indexOf(`${moduleKey}: {`);
  if (start === -1) return console.log(`${moduleKey} not found`);
  const end = appContent.indexOf('},', start);
  console.log(`=== ${moduleKey} config ===`);
  console.log(appContent.substring(start, end + 2));
}

printConfig('machineLogs');
printConfig('consumableLogs');
