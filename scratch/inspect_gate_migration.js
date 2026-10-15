const fs = require('fs');
const path = require('path');

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir);
console.log('Migration count:', files.length);

files.forEach(f => {
  const content = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
  if (content.includes('gate_entries')) {
    console.log(`Found gate_entries in ${f}`);
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('CREATE TABLE') || l.includes('created_by') || l.includes('gate_entries')) {
        console.log(`  Line ${idx+1}: ${l.trim()}`);
      }
    });
  }
});
