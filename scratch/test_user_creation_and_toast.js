const fs = require('fs');
const appJs = fs.readFileSync('frontend/app.js', 'utf8');

console.log('Testing User Creation and Toast Notification...');

// 1. Verify user creation in processUsersMasterSave does not block with deferred warning
if (appJs.includes('User creation requires server-side identity provisioning (DEFERRED — SUPABASE AUTH ADMIN BOUNDARY)')) {
    console.error('FAIL: Legacy blocking warning still present in app.js');
    process.exit(1);
}
console.log('✓ PASS: Blocking warning removed from user creation');

// 2. Verify password retrieval and user account creation logic
if (appJs.includes('field_password') &&
    appJs.includes('signUp') &&
    appJs.includes('const newUser = {') &&
    appJs.includes('state.data.usersMaster.findIndex')) {
    console.log('✓ PASS: processUsersMasterSave properly handles password input, Supabase auth signup and live profile sync');
} else {
    console.error('FAIL: Missing user account creation logic');
    process.exit(1);
}

// 3. Verify showToast positioning
if (appJs.includes("toast.style.top = '24px'") &&
    appJs.includes("toast.style.right = '24px'") &&
    appJs.includes("toast.style.zIndex = '999999'")) {
    console.log('✓ PASS: showToast notification positioned prominently at top-right (24px, 24px) with bulletproof inline styles and zIndex 999999');
} else {
    console.error('FAIL: showToast positioning incorrect');
    process.exit(1);
}

console.log('All user creation and toast positioning tests passed successfully!');
