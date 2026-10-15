const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Search for supporting master references or dynamic table references
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('saveSupportingMasterLive') || line.includes('getMasterTable') || line.includes('TABLE_MAP') || line.includes('deleteRecord')) {
    console.log(`L${i+1}: ${line.trim().slice(0, 100)}`);
  }
});
