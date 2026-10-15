const fs = require('fs');

const app = fs.readFileSync('frontend/app.js', 'utf8');

const lines = app.split('\n');
lines.forEach((line, i) => {
  if (line.includes('USER-001') || line.includes('admin@') || (line.includes('username:') && line.includes('admin'))) {
    console.log(`L${i+1}: ${line.trim()}`);
  }
});
