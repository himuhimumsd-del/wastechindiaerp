const fs = require('fs');
const { execSync } = require('child_process');

const tests = [
  'scratch/test_wave12_1_sandbox.js',
  'scratch/test_wave12_0_sandbox.js',
  'scratch/test_wave11_8_sandbox.js',
  'scratch/test_wave11_7_sandbox.js',
  'scratch/test_wave11_6_sandbox.js',
  'scratch/test_wave11_5_sandbox.js',
  'scratch/test_wave11_4_sandbox.js',
  'scratch/test_wave11_3_sandbox.js',
  'scratch/test_wave11_3_handlers.js',
  'scratch/test_stage5_unit.js',
  'scratch/test_stage6_unit.js',
  'scratch/test_stage8_machinery_unit.js',
  'scratch/test_wave10_1_unit.js',
  'scratch/test_wave10_8_unit.js',
  'scratch/test_wave10_consumables_unit.js',
  'scratch/check_regressions.js'
];

let totalPassed = 0;
let totalFailed = 0;
let results = [];

for (const t of tests) {
  if (fs.existsSync(t)) {
    try {
      execSync('node ' + t, { stdio: 'pipe' });
      console.log('PASS:', t);
      results.push({ test: t, status: 'PASS' });
      totalPassed++;
    } catch (e) {
      console.error('FAIL:', t, e.message);
      results.push({ test: t, status: 'FAIL', error: e.message });
      totalFailed++;
    }
  } else {
    console.log('SKIP (not found):', t);
  }
}

console.log('\n======================================');
console.log(`TOTAL SUITES: ${results.length}`);
console.log(`PASSED: ${totalPassed}`);
console.log(`FAILED: ${totalFailed}`);
console.log('======================================');
