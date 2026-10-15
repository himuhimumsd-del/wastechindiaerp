const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');
const lines = content.split('\n');

console.log('=== ALL OCCURRENCES OF "typeof getLive" ACROSS app.js ===');
lines.forEach((line, i) => {
  if (line.includes('typeof getLive')) {
    console.log(`L${i+1}: ${line.trim()}`);
  }
});

console.log('\n=== ALL OCCURRENCES OF ": state.data" ACROSS app.js ===');
lines.forEach((line, i) => {
  if (line.includes(': state.data') || line.includes(': (state.data')) {
    console.log(`L${i+1}: ${line.trim()}`);
  }
});
