const fs = require('fs');

console.log('Running Sequential ID Generation Verification Suite...');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Verify getNextSequentialId is defined and correctly structured in app.js
if (!appJs.includes('function getNextSequentialId(')) {
    console.error('FAIL: getNextSequentialId not found in frontend/app.js');
    process.exit(1);
}
console.log('✓ PASS: getNextSequentialId function defined in frontend/app.js');

// 2. Verify module prefix mappings
if (!appJs.includes("'trips': 'LR'") || !appJs.includes("'gateVerification': 'GATE'")) {
    console.error('FAIL: Missing key operational prefix mappings');
    process.exit(1);
}
console.log('✓ PASS: Operational prefix mappings verified (trips -> LR, gateVerification -> GATE)');

// 3. Verify trips payload uses LR prefix
if (!appJs.includes("generateId('LR', 'trips')")) {
    console.error('FAIL: buildLiveTripPayload does not use LR prefix for sequential trip numbering');
    process.exit(1);
}
console.log('✓ PASS: buildLiveTripPayload updated with sequential LR generation');

// 4. Verify gateVerification uses GATE prefix
if (!appJs.includes("generateId('GATE', 'gateVerification')")) {
    console.error('FAIL: buildLiveGateEntryPayload does not use GATE prefix');
    process.exit(1);
}
console.log('✓ PASS: buildLiveGateEntryPayload updated with sequential GATE generation');

// 5. Verify consumableLogs uses CML prefix
if (!appJs.includes("generateId('CML', 'consumableLogs')")) {
    console.error('FAIL: buildLiveConsumableLogPayload does not use CML prefix');
    process.exit(1);
}
console.log('✓ PASS: buildLiveConsumableLogPayload updated with sequential CML generation');

// 6. Test the actual execution of getNextSequentialId in a sandbox
const sandbox = {};
const codeToEval = `
let state = {
    currentModule: 'trips',
    liveMasters: { trips: [] },
    data: { trips: [] }
};
${appJs.slice(appJs.indexOf('const modulePrefixMap ='), appJs.indexOf('// ============ DERIVED STATUS & PO CONSUMPTION ============') - 1)}
sandbox.generateId = generateId;
sandbox.getNextSequentialId = getNextSequentialId;
sandbox.state = state;
`;

try {
    eval(codeToEval);
} catch (e) {
    console.error('FAIL in evaluating sequential engine:', e.message);
    process.exit(1);
}

// Test 6a: First trip should be LR-1
let lr1 = sandbox.generateId('LR', 'trips');
if (lr1 !== 'LR-1') {
    console.error(`FAIL: Expected LR-1 but got ${lr1}`);
    process.exit(1);
}
console.log(`✓ PASS: First Trip ID generated: ${lr1}`);

// Test 6b: Add LR-1 to state and expect LR-2
sandbox.state.data.trips.push({ id: 'LR-1', trip_number: 'LR-1' });
let lr2 = sandbox.generateId('LR', 'trips');
if (lr2 !== 'LR-2') {
    console.error(`FAIL: Expected LR-2 but got ${lr2}`);
    process.exit(1);
}
console.log(`✓ PASS: Second Trip ID sequentially generated: ${lr2}`);

// Test 6c: Even with legacy TRP-3411, it starts from next available LR
sandbox.state.data.trips.push({ id: 'TRP-3411', trip_number: 'TRP-3411' });
sandbox.state.data.trips.push({ id: 'TRP-7944', trip_number: 'TRP-7944' });
let lr3 = sandbox.generateId('LR', 'trips');
if (lr3 !== 'LR-2') {
    // Since LR-1 was added, next is LR-2
    console.error(`FAIL: Expected LR-2 but got ${lr3}`);
    process.exit(1);
}
console.log(`✓ PASS: Robust against legacy 4-digit random TRP numbers: next LR is ${lr3}`);

// Test 6d: Gate Verification sequential
sandbox.state.data.gateVerification = [{ id: 'GATE-1' }, { id: 'GATE-2' }];
let gate3 = sandbox.generateId('GATE', 'gateVerification');
if (gate3 !== 'GATE-3') {
    console.error(`FAIL: Expected GATE-3 but got ${gate3}`);
    process.exit(1);
}
console.log(`✓ PASS: Gate Entry sequentially generated: ${gate3}`);

// Test 6e: User Accounts sequential with 3-digit padding
sandbox.state.data.usersMaster = [{ id: 'USER-001' }, { id: 'USER-002' }];
let user3 = sandbox.generateId('USER', 'usersMaster');
if (user3 !== 'USER-003') {
    console.error(`FAIL: Expected USER-003 but got ${user3}`);
    process.exit(1);
}
console.log(`✓ PASS: User Account sequentially generated with padding: ${user3}`);

// Test 6f: Parties Master sequential
sandbox.state.data.partiesMaster = [{ id: 'PAR-1' }, { id: 'PAR-2' }, { id: 'PAR-3' }];
let par4 = sandbox.generateId('PAR', 'partiesMaster');
if (par4 !== 'PAR-4') {
    console.error(`FAIL: Expected PAR-4 but got ${par4}`);
    process.exit(1);
}
console.log(`✓ PASS: Party Master sequentially generated: ${par4}`);

console.log('\n======================================');
console.log('ALL SEQUENTIAL ID TESTS PASSED 100%!');
console.log('======================================');
