const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');
const lines = content.split('\n');

function searchAll(term) {
  console.log(`\n=== Matches for ${term} ===`);
  lines.forEach((l, i) => {
    if (l.includes(term)) {
      console.log(`${i + 1}: ${l.trim().substring(0, 140)}`);
    }
  });
}

searchAll('getSupabaseClient');
searchAll('authAuthorized');
searchAll('state.auth');
