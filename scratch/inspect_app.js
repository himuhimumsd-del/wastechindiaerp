const fs = require('fs');
const crypto = require('crypto');

const content = fs.readFileSync('frontend/app.js', 'utf8');
console.log('SHA-256:', crypto.createHash('sha256').update(content).digest('hex').toUpperCase());
const lines = content.split('\n');
console.log('Total lines:', lines.length);

function search(term) {
  console.log(`\n--- Search: ${term} ---`);
  lines.forEach((l, i) => {
    if (l.includes(term)) {
      console.log(`Line ${i + 1}: ${l.trim().substring(0, 150)}`);
    }
  });
}

search('buildLiveGateEntryPayload');
search('processGateSave');
search('getLiveGateEntries');
search('getLiveTrips');
search('normalizeLiveGateEntry');
search('gate_entries');
