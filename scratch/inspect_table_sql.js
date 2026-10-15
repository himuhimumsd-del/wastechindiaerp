const fs = require('fs');
const content = fs.readFileSync('supabase/migrations/20260912000007_wave7_operational_logistics_receiving.sql', 'utf8');
const lines = content.split('\n');

for (let i = 125; i <= 188; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}

console.log('\n--- Policies ---');
for (let i = 365; i <= 405; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
