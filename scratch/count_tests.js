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

tests.forEach(t => {
  try {
    const out = execSync('node ' + t, { encoding: 'utf8' });
    const lines = out.split('\n').filter(l => l.includes('✓') || l.includes('PASS') || l.includes('Test '));
    console.log(`\n=== SUITE: ${t} ===`);
    console.log(`Exit 0. Sample assertions/tests count: ${lines.length}`);
    console.log(lines.slice(0, 5).join('\n'));
  } catch (e) {
    console.log(`=== SUITE: ${t} FAILED ===`, e.message);
  }
});
