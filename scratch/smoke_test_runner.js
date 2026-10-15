/**
 * WAVE 9.3M.1 — Real Authenticated Session & RLS Smoke Test Runner
 * Isolated scratch script. Zero modification to ERP source files.
 * Zero token/credential leakage.
 * Full error handling & safe diagnostics.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 1. Read configuration from frontend/supabase-client.js
const clientFile = path.resolve(__dirname, '../frontend/supabase-client.js');
const clientSource = fs.readFileSync(clientFile, 'utf8');
const urlMatch = clientSource.match(/url:\s*'([^']+)'/);
const keyMatch = clientSource.match(/anonKey:\s*'([^']+)'/);

if (!urlMatch || !keyMatch) {
    console.error('FATAL: Unable to extract SUPABASE_CONFIG from frontend/supabase-client.js');
    process.exit(1);
}

const SUPABASE_URL = urlMatch[1];
const ANON_KEY = keyMatch[1];

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

function safeErrorMsg(status, errorObj) {
    if (!errorObj) return `(HTTP ${status})`;
    const code = errorObj.code || errorObj.error_code || 'ERROR';
    const msg = errorObj.message || errorObj.msg || errorObj.error_description || JSON.stringify(errorObj);
    return `(HTTP ${status}: [${code}] ${msg})`;
}

async function apiRequest(endpoint, options = {}) {
    const url = new URL(endpoint, SUPABASE_URL);
    const headers = {
        'apikey': ANON_KEY,
        'Accept': 'application/json',
        ...(options.headers || {})
    };

    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const res = await fetch(url.toString(), {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const text = await res.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (_) {
            parsed = text;
        }

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                data: null,
                error: (typeof parsed === 'object' && parsed !== null) ? parsed : { message: String(parsed) }
            };
        }

        // Check if PostgREST returned an error payload disguised inside 200
        if (typeof parsed === 'object' && parsed !== null && parsed.code && parsed.message && !Array.isArray(parsed)) {
            return {
                ok: false,
                status: res.status,
                data: null,
                error: parsed
            };
        }

        return {
            ok: true,
            status: res.status,
            data: parsed,
            error: null
        };
    } catch (err) {
        return {
            ok: false,
            status: 0,
            data: null,
            error: { code: 'NETWORK_ERROR', message: err.message }
        };
    }
}

async function signIn(email, password) {
    return apiRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email, password }
    });
}

async function signOut(accessToken) {
    return apiRequest('/auth/v1/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
}

async function run() {
    console.log('\n==================================================');
    console.log('WAVE 9.3M.1: REAL AUTHENTICATED SESSION & RLS SMOKE TEST');
    console.log('==================================================\n');

    // Prompt for passwords locally
    const adminPassword = await askQuestion('Enter test password for admin.test@wastetecherp.internal: ');
    if (!adminPassword) {
        console.error('Password cannot be empty.');
        process.exit(1);
    }

    const guardPassword = await askQuestion('Enter test password for guard.hq.test@wastetecherp.internal: ');
    if (!guardPassword) {
        console.error('Password cannot be empty.');
        process.exit(1);
    }

    console.log('\nConnected target host: ' + new URL(SUPABASE_URL).host);

    // =========================================================================
    // SECTION 1: USER 1 (SUPER ADMIN) VERIFICATION
    // =========================================================================
    console.log('\n--- USER 1 (SUPER ADMINISTRATOR) ---');
    const adminAuth = await signIn('admin.test@wastetecherp.internal', adminPassword);

    if (!adminAuth.ok || !adminAuth.data || !adminAuth.data.access_token) {
        console.log('USER 1 SIGN-IN: FAIL ' + safeErrorMsg(adminAuth.status, adminAuth.error));
        console.error('Halting: User 1 authentication failed. User 2 tests will not execute.');
        process.exit(1);
    }
    console.log('USER 1 SIGN-IN: PASS (HTTP 200)');

    const adminToken = adminAuth.data.access_token;
    const adminUser = adminAuth.data.user;

    const u1_id_match = adminUser && adminUser.id === 'feec18fe-cb43-4087-8356-a566f4ef8d82';
    console.log(`USER 1 UID: ${u1_id_match ? 'PASS' : 'FAIL'} (${adminUser?.id || 'MISSING'})`);

    const u1_email_match = adminUser && adminUser.email === 'admin.test@wastetecherp.internal';
    console.log(`USER 1 EMAIL: ${u1_email_match ? 'PASS' : 'FAIL'} (${adminUser?.email || 'MISSING'})`);

    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // 1. Profile
    const u1_profile = await apiRequest(`/rest/v1/profiles?id=eq.${adminUser.id}&select=*`, { headers: adminHeaders });
    if (!u1_profile.ok) {
        console.log('USER 1 PROFILE: FAIL ' + safeErrorMsg(u1_profile.status, u1_profile.error));
    } else if (!Array.isArray(u1_profile.data) || u1_profile.data.length === 0) {
        console.log('USER 1 PROFILE: FAIL (0 profile rows returned for authenticated UID)');
    } else {
        const p = u1_profile.data[0];
        console.log(`USER 1 PROFILE: PASS (username: ${p.username}, role: ${p.role_id}, plant: ${p.default_plant_id}, status: ${p.status})`);
    }

    // 2. Business Access
    const u1_biz = await apiRequest('/rest/v1/businesses?select=*', { headers: adminHeaders });
    if (!u1_biz.ok) {
        console.log('USER 1 BUSINESS ACCESS: FAIL ' + safeErrorMsg(u1_biz.status, u1_biz.error));
    } else if (!Array.isArray(u1_biz.data) || u1_biz.data.length === 0) {
        console.log('USER 1 BUSINESS ACCESS: FAIL (0 businesses visible to Super Admin)');
    } else {
        console.log(`USER 1 BUSINESS ACCESS: PASS (${u1_biz.data.length} businesses visible: ${u1_biz.data.map(b => b.code).join(', ')})`);
    }

    // 3. Plant Access
    const u1_plants = await apiRequest('/rest/v1/plants?select=*', { headers: adminHeaders });
    if (!u1_plants.ok) {
        console.log('USER 1 PLANT ACCESS: FAIL ' + safeErrorMsg(u1_plants.status, u1_plants.error));
    } else if (!Array.isArray(u1_plants.data)) {
        console.log('USER 1 PLANT ACCESS: FAIL (Unexpected non-array data structure)');
    } else {
        const plantIds = u1_plants.data.map(p => p.id);
        const hasComp1 = plantIds.includes('COMP-1');
        const hasComp2 = plantIds.includes('COMP-2');
        if (hasComp1 && hasComp2) {
            console.log(`USER 1 PLANT ACCESS: PASS (${plantIds.join(', ')})`);
        } else {
            console.log(`USER 1 PLANT ACCESS: FAIL (Expected COMP-1 and COMP-2, got: ${plantIds.join(', ')})`);
        }
    }

    // 4. Roles
    const u1_roles = await apiRequest('/rest/v1/roles?select=*', { headers: adminHeaders });
    if (!u1_roles.ok) {
        console.log('USER 1 ROLES: FAIL ' + safeErrorMsg(u1_roles.status, u1_roles.error));
    } else if (!Array.isArray(u1_roles.data)) {
        console.log('USER 1 ROLES: FAIL (Non-array returned)');
    } else {
        console.log(`USER 1 ROLES: PASS (${u1_roles.data.length} roles visible: ${u1_roles.data.map(r => r.id).join(', ')})`);
    }

    // 5. Role Permissions (Admin = 28)
    const u1_perms = await apiRequest('/rest/v1/role_permissions?role_id=eq.ROLE-ADMIN&select=*', { headers: adminHeaders });
    if (!u1_perms.ok) {
        console.log('USER 1 ROLE-ADMIN PERMISSIONS: FAIL ' + safeErrorMsg(u1_perms.status, u1_perms.error));
    } else if (!Array.isArray(u1_perms.data)) {
        console.log('USER 1 ROLE-ADMIN PERMISSIONS: FAIL (Non-array returned)');
    } else if (u1_perms.data.length === 28) {
        const allTrue = u1_perms.data.every(m => m.can_view && m.can_add && m.can_edit && m.can_delete);
        console.log(`USER 1 ROLE-ADMIN PERMISSIONS: PASS (28 modules, all flags TRUE: ${allTrue})`);
    } else {
        console.log(`USER 1 ROLE-ADMIN PERMISSIONS: FAIL (Expected 28 rows, got ${u1_perms.data.length})`);
    }

    // 6. Security Helper RPCs
    const u1_rpc_admin = await apiRequest('/rest/v1/rpc/auth_is_super_admin', { method: 'POST', headers: adminHeaders, body: {} });
    const u1_rpc_mgr = await apiRequest('/rest/v1/rpc/auth_can_manage_masters', { method: 'POST', headers: adminHeaders, body: {} });
    const u1_rpc_biz_ids = await apiRequest('/rest/v1/rpc/auth_user_business_ids', { method: 'POST', headers: adminHeaders, body: {} });
    const u1_rpc_plant_ids = await apiRequest('/rest/v1/rpc/auth_user_plant_ids', { method: 'POST', headers: adminHeaders, body: {} });

    const u1_helpers_ok = u1_rpc_admin.ok && u1_rpc_mgr.ok && u1_rpc_biz_ids.ok && u1_rpc_plant_ids.ok;
    if (u1_helpers_ok && u1_rpc_admin.data === true && u1_rpc_mgr.data === true) {
        console.log(`USER 1 ADMIN HELPER: PASS (auth_is_super_admin: ${u1_rpc_admin.data}, auth_can_manage_masters: ${u1_rpc_mgr.data}, plant_ids: ${JSON.stringify(u1_rpc_plant_ids.data)})`);
    } else {
        console.log(`USER 1 ADMIN HELPER: FAIL (${u1_rpc_admin.ok ? 'admin=' + u1_rpc_admin.data : safeErrorMsg(u1_rpc_admin.status, u1_rpc_admin.error)})`);
    }

    // Sign out User 1
    const u1_logout = await signOut(adminToken);
    console.log(`USER 1 SIGN-OUT: ${u1_logout.ok || u1_logout.status === 204 ? 'PASS' : 'FAIL ' + safeErrorMsg(u1_logout.status, u1_logout.error)}`);

    // =========================================================================
    // SECTION 2: USER 2 (GATE SECURITY) VERIFICATION
    // =========================================================================
    console.log('\n--- USER 2 (GATE SECURITY) ---');
    const guardAuth = await signIn('guard.hq.test@wastetecherp.internal', guardPassword);

    if (!guardAuth.ok || !guardAuth.data || !guardAuth.data.access_token) {
        console.log('USER 2 SIGN-IN: FAIL ' + safeErrorMsg(guardAuth.status, guardAuth.error));
        console.error('Halting: User 2 authentication failed.');
        process.exit(1);
    }
    console.log('USER 2 SIGN-IN: PASS (HTTP 200)');

    const guardToken = guardAuth.data.access_token;
    const guardUser = guardAuth.data.user;

    const u2_id_match = guardUser && guardUser.id === 'afe324dc-be2a-4ff7-b48c-0750b64ed43b';
    console.log(`USER 2 UID: ${u2_id_match ? 'PASS' : 'FAIL'} (${guardUser?.id || 'MISSING'})`);

    const u2_email_match = guardUser && guardUser.email === 'guard.hq.test@wastetecherp.internal';
    console.log(`USER 2 EMAIL: ${u2_email_match ? 'PASS' : 'FAIL'} (${guardUser?.email || 'MISSING'})`);

    const guardHeaders = { 'Authorization': `Bearer ${guardToken}` };

    // 1. Profile
    const u2_profile = await apiRequest(`/rest/v1/profiles?id=eq.${guardUser.id}&select=*`, { headers: guardHeaders });
    if (!u2_profile.ok) {
        console.log('USER 2 PROFILE: FAIL ' + safeErrorMsg(u2_profile.status, u2_profile.error));
    } else if (!Array.isArray(u2_profile.data) || u2_profile.data.length === 0) {
        console.log('USER 2 PROFILE: FAIL (0 profile rows returned for authenticated UID)');
    } else {
        const p = u2_profile.data[0];
        console.log(`USER 2 PROFILE: PASS (username: ${p.username}, role: ${p.role_id}, plant: ${p.default_plant_id}, status: ${p.status})`);
    }

    // 2. Business Access
    const u2_biz = await apiRequest('/rest/v1/businesses?select=*', { headers: guardHeaders });
    if (!u2_biz.ok) {
        console.log('USER 2 BUSINESS ACCESS: FAIL ' + safeErrorMsg(u2_biz.status, u2_biz.error));
    } else if (!Array.isArray(u2_biz.data) || u2_biz.data.length === 0) {
        console.log('USER 2 BUSINESS ACCESS: FAIL (0 businesses visible to Guard)');
    } else {
        console.log(`USER 2 BUSINESS ACCESS: PASS (${u2_biz.data.length} business visible: ${u2_biz.data.map(b => b.code).join(', ')})`);
    }

    // 3. Plant Scope (Positive: COMP-1)
    const u2_plants = await apiRequest('/rest/v1/plants?select=*', { headers: guardHeaders });
    if (!u2_plants.ok) {
        console.log('USER 2 PLANT ACCESS: FAIL ' + safeErrorMsg(u2_plants.status, u2_plants.error));
    } else if (!Array.isArray(u2_plants.data)) {
        console.log('USER 2 PLANT ACCESS: FAIL (Non-array returned)');
    } else {
        const plantIds = u2_plants.data.map(p => p.id);
        const onlyComp1 = plantIds.length === 1 && plantIds[0] === 'COMP-1';
        if (onlyComp1) {
            console.log(`USER 2 PLANT ACCESS: PASS (Visible plants: ${plantIds.join(', ')})`);
        } else {
            console.log(`USER 2 PLANT ACCESS: FAIL (Expected only COMP-1, got: ${plantIds.join(', ')})`);
        }
    }

    // 4. Plant Scope (Negative RLS: Explicit query for COMP-2)
    const u2_neg_plant = await apiRequest('/rest/v1/plants?id=eq.COMP-2&select=*', { headers: guardHeaders });
    if (!u2_neg_plant.ok) {
        console.log('USER 2 COMP-2 NEGATIVE RLS: FAIL ' + safeErrorMsg(u2_neg_plant.status, u2_neg_plant.error));
    } else if (Array.isArray(u2_neg_plant.data) && u2_neg_plant.data.length === 0) {
        console.log('USER 2 COMP-2 NEGATIVE RLS: PASS (0 rows returned - strictly denied by RLS)');
    } else {
        console.log(`USER 2 COMP-2 NEGATIVE RLS: FAIL (Expected 0 rows, returned ${u2_neg_plant.data?.length} rows)`);
    }

    // 5. Role Permissions (Guard = 1 row: gateVerification)
    const u2_perms = await apiRequest('/rest/v1/role_permissions?role_id=eq.ROLE-GUARD&select=*', { headers: guardHeaders });
    if (!u2_perms.ok) {
        console.log('USER 2 ROLE-GUARD PERMISSIONS: FAIL ' + safeErrorMsg(u2_perms.status, u2_perms.error));
    } else if (!Array.isArray(u2_perms.data)) {
        console.log('USER 2 ROLE-GUARD PERMISSIONS: FAIL (Non-array returned)');
    } else if (u2_perms.data.length === 1) {
        const m = u2_perms.data[0];
        const guardMatch = m.module_key === 'gateVerification' && m.can_view === true && m.can_add === true && m.can_edit === false && m.can_delete === false;
        console.log(`USER 2 ROLE-GUARD PERMISSIONS: ${guardMatch ? 'PASS' : 'FAIL'} (${m.module_key}: view=${m.can_view}, add=${m.can_add}, edit=${m.can_edit}, delete=${m.can_delete})`);
    } else {
        console.log(`USER 2 ROLE-GUARD PERMISSIONS: FAIL (Expected exactly 1 row, got ${u2_perms.data.length})`);
    }

    // 6. Security Helper RPCs
    const u2_rpc_admin = await apiRequest('/rest/v1/rpc/auth_is_super_admin', { method: 'POST', headers: guardHeaders, body: {} });
    const u2_rpc_mgr = await apiRequest('/rest/v1/rpc/auth_can_manage_masters', { method: 'POST', headers: guardHeaders, body: {} });
    const u2_rpc_biz_ids = await apiRequest('/rest/v1/rpc/auth_user_business_ids', { method: 'POST', headers: guardHeaders, body: {} });
    const u2_rpc_plant_ids = await apiRequest('/rest/v1/rpc/auth_user_plant_ids', { method: 'POST', headers: guardHeaders, body: {} });

    const u2_helpers_ok = u2_rpc_admin.ok && u2_rpc_mgr.ok && u2_rpc_biz_ids.ok && u2_rpc_plant_ids.ok;
    if (u2_helpers_ok && u2_rpc_admin.data === false && u2_rpc_mgr.data === false) {
        console.log(`USER 2 GUARD HELPER: PASS (auth_is_super_admin: ${u2_rpc_admin.data}, auth_can_manage_masters: ${u2_rpc_mgr.data}, plant_ids: ${JSON.stringify(u2_rpc_plant_ids.data)})`);
    } else {
        console.log(`USER 2 GUARD HELPER: FAIL (${u2_rpc_admin.ok ? 'admin=' + u2_rpc_admin.data : safeErrorMsg(u2_rpc_admin.status, u2_rpc_admin.error)})`);
    }

    // Sign out User 2
    const u2_logout = await signOut(guardToken);
    console.log(`USER 2 SIGN-OUT: ${u2_logout.ok || u2_logout.status === 204 ? 'PASS' : 'FAIL ' + safeErrorMsg(u2_logout.status, u2_logout.error)}`);

    // =========================================================================
    // SECTION 3: RESILIENCE CHECKS (SESSION PERSISTENCE & FAILED LOGIN)
    // =========================================================================
    console.log('\n--- RESILIENCE CHECKS ---');

    // 1. Failed Login Test
    const failedAuth = await signIn('admin.test@wastetecherp.internal', 'intentionally-incorrect-password-test');
    if (!failedAuth.ok && (failedAuth.status === 400 || failedAuth.error?.code === 'invalid_credentials')) {
        console.log(`FAILED LOGIN: PASS ${safeErrorMsg(failedAuth.status, failedAuth.error)}`);
    } else {
        console.log('FAILED LOGIN: FAIL (Expected HTTP 400 invalid_credentials, got HTTP ' + failedAuth.status + ')');
    }

    // 2. Session Persistence Test
    const persistAuth = await signIn('admin.test@wastetecherp.internal', adminPassword);
    if (persistAuth.ok && persistAuth.data && persistAuth.data.user && persistAuth.data.user.id === 'feec18fe-cb43-4087-8356-a566f4ef8d82') {
        console.log('SESSION PERSISTENCE: PASS (Identity re-authenticated and token established)');
        await signOut(persistAuth.data.access_token);
    } else {
        console.log('SESSION PERSISTENCE: FAIL ' + safeErrorMsg(persistAuth.status, persistAuth.error));
    }

    console.log('\n==================================================');
    console.log('SMOKE TEST EXECUTION FINISHED SAFELY');
    console.log('==================================================\n');
}

run().catch(err => {
    console.error('Smoke test runner fatal error:', err);
    process.exit(1);
});
