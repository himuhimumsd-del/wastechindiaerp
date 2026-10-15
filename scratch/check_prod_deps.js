const fs = require('fs');

const prodFiles = [
  'frontend/index.html',
  'frontend/app.js',
  'frontend/styles.css',
  'frontend/supabase-client.js',
  'frontend/data-provider.js'
];

prodFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasScratch = content.includes('scratch');
  const hasTest = content.includes('test_') || content.includes('run_all_tests');
  const hasIndex29 = content.includes('index (29)');
  console.log(`${file}:`);
  console.log(`  References scratch: ${hasScratch}`);
  console.log(`  References test files: ${hasTest}`);
  console.log(`  References index (29): ${hasIndex29}`);
});
