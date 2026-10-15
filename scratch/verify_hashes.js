const crypto = require('crypto');
const fs = require('fs');

function hash(f) {
  return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
}

console.log('frontend/index.html:         ', hash('frontend/index.html'));
console.log('frontend/styles.css:         ', hash('frontend/styles.css'));
console.log('frontend/data-provider.js:   ', hash('frontend/data-provider.js'));
console.log('frontend/supabase-client.js: ', hash('frontend/supabase-client.js'));
console.log('index (29).html:             ', hash('index (29).html'));
console.log('frontend/app.js:             ', hash('frontend/app.js'));

const migrations = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql'));
console.log('\nMigrations count:', migrations.length);
migrations.forEach((m, i) => console.log(`  ${i+1}. ${m}`));
