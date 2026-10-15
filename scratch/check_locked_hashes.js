const fs = require('fs');
const crypto = require('crypto');

const files = [
  'frontend/index.html',
  'frontend/styles.css',
  'frontend/data-provider.js',
  'frontend/supabase-client.js',
  'index (29).html'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f);
    const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
    console.log(`${f}: ${hash}`);
  } else {
    console.log(`${f}: NOT FOUND`);
  }
});
