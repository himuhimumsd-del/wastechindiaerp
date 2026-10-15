const fs = require('fs');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

function printLines(startSnippet, endSnippet) {
  const start = appContent.indexOf(startSnippet);
  const end = appContent.indexOf(endSnippet, start);
  console.log(appContent.substring(start, end));
}

console.log('--- machineLogs schema ---');
printLines("machineLogs: { title: 'Machine Logs'", "vehicleMaster: {");

console.log('--- consumableLogs schema ---');
printLines("consumableLogs: { title: 'Consumable Logs'", "systemSettings: {");
