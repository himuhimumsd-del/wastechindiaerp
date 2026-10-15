const fs = require('fs');

const app = fs.readFileSync('frontend/app.js', 'utf8');

function printFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start === -1) return console.log(`${name} NOT found`);
  const end = app.indexOf('\n        function ', start + 10);
  console.log(`\n=== ${name} ===`);
  console.log(app.substring(start, end > -1 ? end : start + 1500));
}

printFunction('normalizeLiveMachineLog');
printFunction('normalizeLiveConsumableMovement');
printFunction('getLiveMachineLogs');
printFunction('getLiveConsumableLogs');
