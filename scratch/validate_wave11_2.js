const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== WAVE 11.2 FINAL VALIDATION ===\n');

// 1. Syntax check
try {
  execSync('node -c frontend/app.js', { stdio: 'pipe' });
  console.log('1. node -c frontend/app.js: PASSED');
} catch (e) {
  console.error('1. node -c frontend/app.js: FAILED', e.message);
  process.exit(1);
}

// 2. Search for final Gate write path in frontend/app.js
const appContent = fs.readFileSync('frontend/app.js', 'utf8');

function searchMatches(term) {
  const lines = appContent.split(/\r?\n/);
  const hits = [];
  lines.forEach((l, i) => {
    if (l.includes(term)) {
      hits.push({ line: i + 1, snippet: l.trim().substring(0, 120) });
    }
  });
  return hits;
}

console.log('\n2. Pattern Matches:');
['buildLiveGateEntryPayload', 'processGateSave', 'gate_entries', "from('gate_entries')", '.insert(', '.update('].forEach(term => {
  const matches = searchMatches(term);
  console.log(`- "${term}": ${matches.length} match(es)`);
  matches.forEach(m => console.log(`    Line ${m.line}: ${m.snippet}`));
});

// 3. Confirm locked files unchanged
console.log('\n3. Locked File Hashes:');
const lockedFiles = {
  'frontend/index.html': '0461EED4640EEFFEC9D4EAD556BD57535BCC5FB38E59D42232CEB6ABCA22D012',
  'frontend/styles.css': 'ABBFDF4C9FAF231C446099E97620E3253D3D5180B973654C32E326C450715A3B',
  'frontend/data-provider.js': '4444F94D43BA34F032FAF129F6789AC51524EC5FF403B602F31EE2AF1A8A838C',
  'frontend/supabase-client.js': '28F29FA2BE3FB4868EA99DA63E5D6E885FAFCD665C4087CA8D7FB50FD276F94D',
  'index (29).html': '379D371ECD5BA097C1055FE8D61564D3FB76DD17347C68D268A12E7BFD269B23'
};

let lockedPass = true;
for (const [file, expectedHash] of Object.entries(lockedFiles)) {
  const currentHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
  const match = currentHash === expectedHash;
  if (!match) lockedPass = false;
  console.log(`  ${file}: ${match ? 'MATCH' : 'MISMATCH'} (${currentHash})`);
}
console.log('Locked files check:', lockedPass ? 'ALL PASSED' : 'FAILED');

// 4. Migration count and files
console.log('\n4. Migrations Check:');
const migrationDir = 'supabase/migrations';
const migrations = fs.readdirSync(migrationDir);
console.log('Migration count:', migrations.length, '(expected: 13)');
console.log('Migrations exact count check:', migrations.length === 13 ? 'PASSED' : 'FAILED');

// 5. Git diff check (confirm ONLY frontend/app.js is modified)
console.log('\n5. Git status check:');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log('Git porcelain status:');
  console.log(status.trim());
} catch (e) {
  console.log('Git status error:', e.message);
}

// 6. SHA-256 of frontend/app.js
console.log('\n6. Final SHA-256 of frontend/app.js:');
const finalHash = crypto.createHash('sha256').update(fs.readFileSync('frontend/app.js')).digest('hex').toUpperCase();
console.log(finalHash);
