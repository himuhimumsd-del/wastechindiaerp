const fs = require('fs');

const files = fs.readdirSync('supabase/migrations').sort();
console.log('Total files in supabase/migrations:', files.length);

files.forEach((f, i) => {
  const isCandidate = f.includes('candidate');
  const isBackup = f.includes('backup');
  const isCanonical = !isCandidate && !isBackup && f.endsWith('.sql');
  console.log(`${i+1}. ${f}`);
  console.log(`   Canonical: ${isCanonical ? 'YES' : 'NO'}`);
  console.log(`   Backup/Candidate: ${isBackup || isCandidate ? 'YES' : 'NO'}`);
});
