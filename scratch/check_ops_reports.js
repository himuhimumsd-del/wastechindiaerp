const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

function printRendererFull(name) {
  const start = content.indexOf(`${name}: function`);
  if (start !== -1) {
    const end = content.indexOf('function generateId(', start);
    console.log(`\n=== RENDERER ${name} ===`);
    console.log(content.slice(start, start + 3000));
  }
}

printRendererFull('plantPerformance');
printRendererFull('grnReport');
printRendererFull('poReceivedFulfilment');
printRendererFull('poIssuedCommitment');
printRendererFull('materialMovement');
