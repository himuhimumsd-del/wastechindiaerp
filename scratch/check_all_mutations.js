const fs = require('fs');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

// Find all occurrences of .insert or .update or .delete in app.js
const lines = appContent.split(/\r?\n/);
lines.forEach((l, idx) => {
  if (idx > 500 && (l.includes('.insert(') || l.includes('.update(') || l.includes('.delete(') || l.includes('.upsert('))) {
    console.log(`Line ${idx+1}: ${l.trim().substring(0, 120)}`);
  }
});
