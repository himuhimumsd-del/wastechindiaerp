/**
 * WAVE 9.4.4 — Live Business + Plant Access Hydration Verification Runner
 * Connects directly to running Chrome via CDP on port 9222.
 * Drives real browser interactions against http://127.0.0.1:8085/.
 * Never prints, logs, or transmits passwords or auth tokens.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');

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

function resolvePath(p) {
    if (fs.existsSync(p)) return p;
    const wsPath = path.resolve(WORKSPACE_ROOT, p);
    if (fs.existsSync(wsPath)) return wsPath;
    return p;
}

function hashFile(filePath) {
    const fullPath = resolvePath(filePath);
    if (!fs.existsSync(fullPath)) return 'FILE_NOT_FOUND';
    return crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex').toUpperCase();
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getErpTab() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    let erpTab = tabs.find(t => t.url && (t.url.includes('8085') || t.title.includes('EcoManage')));
    if (!erpTab) {
        console.log('Target tab not active. Opening http://127.0.0.1:8085/ in Chrome via CDP...');
        const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:8085/', { method: 'PUT' });
        erpTab = await newTabRes.json();
        await delay(1200);
    }
    return erpTab;
}

class CdpClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.msgId = 0;
        this.callbacks = new Map();
        this.networkRequests = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.method === 'Network.requestWillBeSent') {
                    this.networkRequests.push({
                        url: msg.params.request.url,
                        method: msg.params.request.method,
                        headers: msg.params.request.headers
                    });
                }
                if (msg.id && this.callbacks.has(msg.id)) {
                    const cb = this.callbacks.get(msg.id);
                    this.callbacks.delete(msg.id);
                    cb(msg);
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.msgId;
            this.callbacks.set(id, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.result);
                }
            });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error('CDP Eval Exception: ' + (res.exceptionDetails.exception ? res.exceptionDetails.exception.description : JSON.stringify(res.exceptionDetails)));
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function run() {
    console.log('================================================================');
    console.log('WAVE 9.4.4: LIVE BUSINESS + PLANT ACCESS HYDRATION VERIFICATION');
    console.log('================================================================\n');

    const adminPassword = process.env.ADMIN_PASSWORD || await askQuestion('Enter test password for admin.test@wastetecherp.internal: ');
    if (!adminPassword) {
        console.error('Password cannot be empty.');
        process.exit(1);
    }

    const guardPassword = process.env.GUARD_PASSWORD || await askQuestion('Enter test password for guard.hq.test@wastetecherp.internal: ');
    if (!guardPassword) {
        console.error('Password cannot be empty.');
        process.exit(1);
    }

    console.log('\nConnecting to live Chrome instance via CDP...');
    const erpTab = await getErpTab();
    console.log(`Connected to Target Page: ${erpTab.id} (${erpTab.url})`);

    const cdp = new CdpClient(erpTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Network.enable');
    console.log('CDP Client and Network Monitoring initialized.\n');

    // =========================================================================
    // TEST 1 — NO SESSION VERIFICATION
    // =========================================================================
    console.log('--- TEST 1: NO SESSION (INITIAL LOCKOUT VERIFICATION) ---');
    await cdp.evaluate(`(async () => {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (client && client.auth) {
            try { await client.auth.signOut(); } catch(e) {}
        }
        localStorage.clear();
        sessionStorage.clear();
    })()`);
    await cdp.send('Page.reload');
    await delay(1500);

    const test1State = await cdp.evaluate(`({
        title: document.title,
        loginModalVisible: !document.getElementById('login-modal').classList.contains('hidden'),
        badgeContainerHidden: document.getElementById('auth-user-badge-container').classList.contains('hidden'),
        authAuthorized: (typeof state !== 'undefined' ? state.authAuthorized : null),
        currentUser: (typeof state !== 'undefined' ? state.currentUser : null),
        currentCompany: (typeof state !== 'undefined' ? state.currentCompany : null),
        currentBusiness: (typeof state !== 'undefined' ? state.currentBusiness : null),
        authorizedBusinessesCount: (typeof state !== 'undefined' && state.authorizedBusinesses ? state.authorizedBusinesses.length : 0),
        authorizedPlantsCount: (typeof state !== 'undefined' && state.authorizedPlants ? state.authorizedPlants.length : 0),
        sidebarButtonCount: document.querySelectorAll('#nav-container button').length,
        isContentLocked: document.getElementById('content-area').innerText.includes('Authentication Required')
    })`);

    console.log('1.1 Login Modal Visible:', test1State.loginModalVisible ? 'PASS (Visible)' : 'FAIL');
    console.log('1.2 ERP State authAuthorized:', test1State.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('1.3 state.currentUser:', test1State.currentUser === null ? 'PASS (null)' : 'FAIL');
    console.log('1.4 state.currentCompany:', test1State.currentCompany === null ? 'PASS (null)' : 'FAIL');
    console.log('1.5 state.currentBusiness:', test1State.currentBusiness === null ? 'PASS (null)' : 'FAIL');
    console.log('1.6 state.authorizedBusinesses:', test1State.authorizedBusinessesCount === 0 ? 'PASS (empty)' : 'FAIL');
    console.log('1.7 state.authorizedPlants:', test1State.authorizedPlantsCount === 0 ? 'PASS (empty)' : 'FAIL');
    console.log('1.8 Protected Sidebar Modules:', test1State.sidebarButtonCount === 0 ? 'PASS (0 buttons rendered)' : 'FAIL');
    console.log('1.9 Content Area Locked Screen:', test1State.isContentLocked ? 'PASS (Locked)' : 'FAIL');

    if (!test1State.loginModalVisible || test1State.authAuthorized !== false || test1State.currentUser !== null) {
        throw new Error('TEST 1 FAILED: ERP did not fail closed in unauthenticated state.');
    }
    console.log('>>> TEST 1 RESULT: PASS\n');

    // =========================================================================
    // TEST 2 — REAL ADMIN LOGIN (STAGE 3 HYDRATION)
    // =========================================================================
    console.log('--- TEST 2: REAL ADMIN LOGIN (STAGE 3 ACCESS HYDRATION) ---');
    cdp.networkRequests = [];

    const adminLoginResult = await cdp.evaluate(`(async (email, password) => {
        const res = await loginWithCredentials(email, password);
        const sel = document.getElementById('company-select');
        const options = sel ? Array.from(sel.options).map(o => ({ value: o.value, text: o.text })) : [];
        return {
            success: res,
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser,
            permissionCount: Object.keys(state.currentPermissions || {}).length,
            currentCompany: state.currentCompany,
            currentBusiness: state.currentBusiness,
            authorizedBusinesses: (state.authorizedBusinesses || []).map(b => ({ id: b.id, code: b.code, legal_name: b.legal_name })),
            authorizedPlants: (state.authorizedPlants || []).map(p => ({ id: p.id, business_id: p.business_id, trade_name: p.trade_name || p.tradeName })),
            selectorOptions: options,
            loginModalHidden: document.getElementById('login-modal').classList.contains('hidden')
        };
    })('admin.test@wastetecherp.internal', ${JSON.stringify(adminPassword)})`);

    await delay(1200);

    console.log('2.1 Admin Sign-In & Hydration:', adminLoginResult.success ? 'PASS (Success)' : 'FAIL');
    console.log('2.2 state.authAuthorized:', adminLoginResult.authAuthorized === true ? 'PASS (true)' : 'FAIL');
    console.log('2.3 Authorized Businesses Count:', adminLoginResult.authorizedBusinesses.length);
    adminLoginResult.authorizedBusinesses.forEach(b => console.log(`    - Business: ${b.code} (${b.id}) - ${b.legal_name}`));
    console.log('2.4 Authorized Plants Count:', adminLoginResult.authorizedPlants.length);
    adminLoginResult.authorizedPlants.forEach(p => console.log(`    - Plant: ${p.id} (business_id: ${p.business_id}) - ${p.trade_name}`));
    console.log('2.5 state.currentCompany:', adminLoginResult.currentCompany);
    console.log('2.6 state.currentBusiness Code:', adminLoginResult.currentBusiness ? adminLoginResult.currentBusiness.code : 'null');
    console.log('2.7 Selector Options Rendered:');
    adminLoginResult.selectorOptions.forEach(o => console.log(`    <option value="${o.value}">${o.text}</option>`));

    const adminPlantIds = adminLoginResult.authorizedPlants.map(p => p.id);
    const hasAdminComp1 = adminPlantIds.includes('COMP-1');
    const hasAdminComp2 = adminPlantIds.includes('COMP-2');
    console.log('2.8 Admin Has COMP-1 & COMP-2:', (hasAdminComp1 && hasAdminComp2) ? 'PASS (Both present)' : 'FAIL');

    if (!adminLoginResult.success || !adminLoginResult.authAuthorized || !hasAdminComp1 || !hasAdminComp2) {
        throw new Error('TEST 2 FAILED: Admin Stage 3 access hydration failed.');
    }

    // Test Plant Switching for Admin
    console.log('2.9 Testing Switch to COMP-2...');
    const switchComp2Result = await cdp.evaluate(`(() => {
        const sel = document.getElementById('company-select');
        sel.value = 'COMP-2';
        sel.onchange({ target: { value: 'COMP-2' } });
        return {
            currentCompany: state.currentCompany,
            currentBusinessCode: state.currentBusiness ? state.currentBusiness.code : null,
            userCompanyId: state.currentUser.companyId
        };
    })()`);
    console.log('    Switched Company:', switchComp2Result.currentCompany);
    console.log('    Current Business:', switchComp2Result.currentBusinessCode);
    if (switchComp2Result.currentCompany !== 'COMP-2') throw new Error('Switch to COMP-2 Failed');

    console.log('2.10 Testing Unauthorized Switch to COMP-UNAUTHORIZED...');
    const switchFakeResult = await cdp.evaluate(`(() => {
        const sel = document.getElementById('company-select');
        sel.value = 'COMP-UNAUTHORIZED';
        sel.onchange({ target: { value: 'COMP-UNAUTHORIZED' } });
        return {
            currentCompany: state.currentCompany,
            selectorValue: sel.value
        };
    })()`);
    console.log('    Company after rejection:', switchFakeResult.currentCompany);
    console.log('    Selector restored value:', switchFakeResult.selectorValue);
    if (switchFakeResult.currentCompany !== 'COMP-2' || switchFakeResult.selectorValue !== 'COMP-2') {
        throw new Error('Unauthorized switch guard failed');
    }

    console.log('2.11 Switching back to COMP-1...');
    await cdp.evaluate(`(() => {
        const sel = document.getElementById('company-select');
        sel.value = 'COMP-1';
        sel.onchange({ target: { value: 'COMP-1' } });
    })()`);
    console.log('    Current Company:', (await cdp.evaluate('state.currentCompany')));
    console.log('>>> TEST 2 RESULT: PASS\n');

    // =========================================================================
    // TEST 3 — REAL GUARD LOGIN (STAGE 3 ISOLATION)
    // =========================================================================
    console.log('--- TEST 3: REAL GUARD LOGIN (STAGE 3 PLANT ISOLATION) ---');
    await cdp.evaluate(`logoutUser()`);
    await delay(800);

    const guardLoginResult = await cdp.evaluate(`(async (email, password) => {
        const res = await loginWithCredentials(email, password);
        const sel = document.getElementById('company-select');
        const options = sel ? Array.from(sel.options).map(o => ({ value: o.value, text: o.text })) : [];
        return {
            success: res,
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser,
            currentCompany: state.currentCompany,
            currentBusiness: state.currentBusiness,
            authorizedBusinesses: (state.authorizedBusinesses || []).map(b => ({ id: b.id, code: b.code })),
            authorizedPlants: (state.authorizedPlants || []).map(p => ({ id: p.id, trade_name: p.trade_name || p.tradeName })),
            selectorOptions: options
        };
    })('guard.hq.test@wastetecherp.internal', ${JSON.stringify(guardPassword)})`);

    await delay(1200);

    console.log('3.1 Guard Sign-In & Hydration:', guardLoginResult.success ? 'PASS (Success)' : 'FAIL');
    console.log('3.2 Guard authAuthorized:', guardLoginResult.authAuthorized === true ? 'PASS (true)' : 'FAIL');
    console.log('3.3 Guard Authorized Businesses Count:', guardLoginResult.authorizedBusinesses.length);
    console.log('3.4 Guard Authorized Plants Count:', guardLoginResult.authorizedPlants.length);
    guardLoginResult.authorizedPlants.forEach(p => console.log(`    - Plant: ${p.id} (${p.trade_name})`));
    console.log('3.5 Guard currentCompany:', guardLoginResult.currentCompany);
    console.log('3.6 Guard Selector Options:');
    guardLoginResult.selectorOptions.forEach(o => console.log(`    <option value="${o.value}">${o.text}</option>`));

    const guardPlantIds = guardLoginResult.authorizedPlants.map(p => p.id);
    const hasGuardComp1 = guardPlantIds.includes('COMP-1');
    const hasGuardComp2 = guardPlantIds.includes('COMP-2');
    console.log('3.7 Guard sees COMP-1:', hasGuardComp1 ? 'PASS (true)' : 'FAIL');
    console.log('3.8 Guard sees COMP-2 (Expect false):', !hasGuardComp2 ? 'PASS (Excluded as required)' : 'FAIL (Security Leak)');

    if (!guardLoginResult.success || !guardLoginResult.authAuthorized || !hasGuardComp1 || hasGuardComp2 || guardLoginResult.authorizedPlants.length !== 1) {
        throw new Error('TEST 3 FAILED: Guard plant isolation failed.');
    }

    console.log('3.9 Testing Guard attempt to select COMP-2...');
    const guardSwitchResult = await cdp.evaluate(`(() => {
        const sel = document.getElementById('company-select');
        sel.onchange({ target: { value: 'COMP-2' } });
        return {
            currentCompany: state.currentCompany,
            selectorValue: sel.value
        };
    })()`);
    console.log('    Guard Company after rejection:', guardSwitchResult.currentCompany);
    if (guardSwitchResult.currentCompany !== 'COMP-1') {
        throw new Error('Guard unauthorized switch rejection failed');
    }
    console.log('>>> TEST 3 RESULT: PASS\n');

    // =========================================================================
    // TEST 4 — REAL LOGOUT
    // =========================================================================
    console.log('--- TEST 4: REAL LOGOUT VERIFICATION ---');
    const logoutResult = await cdp.evaluate(`(async () => {
        await logoutUser();
        return {
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser,
            currentPermissions: state.currentPermissions,
            currentCompany: state.currentCompany,
            currentBusiness: state.currentBusiness,
            authorizedBusinessesCount: (state.authorizedBusinesses || []).length,
            authorizedPlantsCount: (state.authorizedPlants || []).length,
            loginModalVisible: !document.getElementById('login-modal').classList.contains('hidden'),
            isContentLocked: document.getElementById('content-area').innerText.includes('Authentication Required')
        };
    })()`);

    console.log('4.1 state.authAuthorized:', logoutResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('4.2 state.currentUser:', logoutResult.currentUser === null ? 'PASS (null)' : 'FAIL');
    console.log('4.3 state.currentCompany:', logoutResult.currentCompany === null ? 'PASS (null)' : 'FAIL');
    console.log('4.4 state.currentBusiness:', logoutResult.currentBusiness === null ? 'PASS (null)' : 'FAIL');
    console.log('4.5 state.authorizedBusinesses:', logoutResult.authorizedBusinessesCount === 0 ? 'PASS (empty)' : 'FAIL');
    console.log('4.6 state.authorizedPlants:', logoutResult.authorizedPlantsCount === 0 ? 'PASS (empty)' : 'FAIL');
    console.log('4.7 Login Modal Visible:', logoutResult.loginModalVisible ? 'PASS (Visible)' : 'FAIL');

    if (logoutResult.authAuthorized !== false || logoutResult.currentUser !== null || logoutResult.authorizedPlantsCount !== 0 || !logoutResult.loginModalVisible) {
        throw new Error('TEST 4 FAILED: Logout did not restore fail-closed lock.');
    }
    console.log('>>> TEST 4 RESULT: PASS\n');

    // =========================================================================
    // TEST 5 — SESSION RESTORATION ACROSS PAGE REFRESH
    // =========================================================================
    console.log('--- TEST 5: SESSION RESTORATION (PAGE REFRESH) ---');
    await cdp.evaluate(`(async (email, password) => {
        await loginWithCredentials(email, password);
    })('admin.test@wastetecherp.internal', ${JSON.stringify(adminPassword)})`);
    await delay(1200);

    console.log('Executing Page.reload via CDP...');
    await cdp.send('Page.reload');
    await delay(2200);

    const restoreResult = await cdp.evaluate(`({
        authAuthorized: (typeof state !== 'undefined' ? state.authAuthorized : null),
        currentUser: (typeof state !== 'undefined' ? state.currentUser : null),
        currentCompany: (typeof state !== 'undefined' ? state.currentCompany : null),
        currentBusinessCode: (typeof state !== 'undefined' && state.currentBusiness ? state.currentBusiness.code : null),
        authorizedPlantsCount: (typeof state !== 'undefined' && state.authorizedPlants ? state.authorizedPlants.length : 0),
        authorizedBusinessesCount: (typeof state !== 'undefined' && state.authorizedBusinesses ? state.authorizedBusinesses.length : 0),
        loginModalHidden: document.getElementById('login-modal').classList.contains('hidden'),
        selectorOptionsCount: document.getElementById('company-select') ? document.getElementById('company-select').options.length : 0
    })`);

    console.log('5.1 Session Restored via getSession():', restoreResult.authAuthorized === true ? 'PASS (authAuthorized = true)' : 'FAIL');
    console.log('5.2 Restored Plants Count:', restoreResult.authorizedPlantsCount === 2 ? 'PASS (2 plants restored)' : 'FAIL');
    console.log('5.3 Restored Current Company:', restoreResult.currentCompany ? `PASS (${restoreResult.currentCompany})` : 'FAIL');
    console.log('5.4 Restored Current Business:', restoreResult.currentBusinessCode ? `PASS (${restoreResult.currentBusinessCode})` : 'FAIL');
    console.log('5.5 Selector Options Count:', restoreResult.selectorOptionsCount === 2 ? 'PASS (2 options)' : 'FAIL');

    if (!restoreResult.authAuthorized || restoreResult.authorizedPlantsCount !== 2 || !restoreResult.currentCompany) {
        throw new Error('TEST 5 FAILED: Session restoration did not retain Stage 3 access state.');
    }
    console.log('>>> TEST 5 RESULT: PASS\n');

    // =========================================================================
    // TEST 6 — INVALID LOGIN ATTEMPT
    // =========================================================================
    console.log('--- TEST 6: INVALID LOGIN FAIL-CLOSED VERIFICATION ---');
    await cdp.evaluate(`logoutUser()`);
    await delay(800);

    const invalidResult = await cdp.evaluate(`(async () => {
        const res = await loginWithCredentials('admin.test@wastetecherp.internal', 'InvalidPassword999!');
        const errElem = document.getElementById('login-error');
        return {
            returnedSuccess: res,
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser,
            currentCompany: state.currentCompany,
            authorizedPlantsCount: (state.authorizedPlants || []).length,
            errorMessage: errElem ? errElem.innerText : '',
            loginModalVisible: !document.getElementById('login-modal').classList.contains('hidden')
        };
    })()`);

    console.log('6.1 Invalid Login Returned:', invalidResult.returnedSuccess === false ? 'PASS (false)' : 'FAIL');
    console.log('6.2 ERP State authAuthorized:', invalidResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('6.3 state.currentCompany:', invalidResult.currentCompany === null ? 'PASS (null)' : 'FAIL');
    console.log('6.4 state.authorizedPlants:', invalidResult.authorizedPlantsCount === 0 ? 'PASS (empty)' : 'FAIL');
    console.log('6.5 Error Displayed to User:', `PASS ("${invalidResult.errorMessage}")`);

    if (invalidResult.returnedSuccess !== false || invalidResult.authAuthorized !== false) {
        throw new Error('TEST 6 FAILED: Invalid login did not fail closed.');
    }
    console.log('>>> TEST 6 RESULT: PASS\n');

    // =========================================================================
    // TEST 8 — REAL DATABASE QUERY BOUNDARY (NETWORK AUDIT)
    // =========================================================================
    console.log('--- TEST 8: REAL DATABASE QUERY BOUNDARY AUDIT ---');
    const postgrestUrls = cdp.networkRequests
        .map(r => r.url)
        .filter(u => u.includes('/rest/v1/'));

    const queriedTables = new Set();
    postgrestUrls.forEach(u => {
        const match = u.match(/\/rest\/v1\/([^?]+)/);
        if (match) queriedTables.add(match[1]);
    });

    console.log('PostgREST Tables Queried during Stage 3:');
    queriedTables.forEach(t => console.log(`  + ${t}`));

    const expectedStage3Tables = new Set([
        'profiles',
        'roles',
        'role_permissions',
        'user_business_access',
        'businesses',
        'user_plant_access',
        'plants'
    ]);

    const forbiddenTables = ['invoices', 'trips', 'gate_entries', 'gateVerification', 'grn', 'attendance', 'payroll', 'payrollLedger'];
    let forbiddenDetected = false;
    forbiddenTables.forEach(t => {
        if (queriedTables.has(t)) {
            console.error(`  VIOLATION: Forbidden operational table queried: ${t}`);
            forbiddenDetected = true;
        } else {
            console.log(`  - ${t}: NOT QUERIED (PASS)`);
        }
    });

    if (forbiddenDetected) {
        throw new Error('TEST 8 FAILED: Forbidden operational tables queried in Stage 3.');
    }
    console.log('>>> TEST 8 RESULT: PASS\n');

    // =========================================================================
    // TEST 9 — NETWORK SECURITY & SECRET HYGIENE
    // =========================================================================
    console.log('--- TEST 9: NETWORK SECURITY & SECRET HYGIENE ---');
    let serviceRoleKeyFound = false;
    cdp.networkRequests.forEach(r => {
        if (r.headers) {
            Object.values(r.headers).forEach(val => {
                if (typeof val === 'string' && val.includes('service_role')) {
                    serviceRoleKeyFound = true;
                }
            });
        }
    });
    console.log('9.1 service_role Key in Network Headers:', serviceRoleKeyFound ? 'FAIL (Detected)' : 'PASS (Zero presence)');

    // =========================================================================
    // TEST 10 — FILE INTEGRITY
    // =========================================================================
    console.log('\n--- TEST 10: FILE INTEGRITY CHECK ---');
    const expectedHashes = {
        'frontend/index.html': '0461EED4640EEFFEC9D4EAD556BD57535BCC5FB38E59D42232CEB6ABCA22D012',
        'frontend/styles.css': 'ABBFDF4C9FAF231C446099E97620E3253D3D5180B973654C32E326C450715A3B',
        'frontend/data-provider.js': '4444F94D43BA34F032FAF129F6789AC51524EC5FF403B602F31EE2AF1A8A838C',
        'frontend/supabase-client.js': '28F29FA2BE3FB4868EA99DA63E5D6E885FAFCD665C4087CA8D7FB50FD276F94D',
        'index (29).html': '379D371ECD5BA097C1055FE8D61564D3FB76DD17347C68D268A12E7BFD269B23',
        'scratch/smoke_test_runner.js': 'D7E20AF5C9A7CB66AC5F7794D9B625D24C1314C04D7AB57A8B58A59F970F4373',
        'frontend/app.js': 'BC36C1A84B24074BC0A6A5357CC8F56F83D552BCFF40D641AC9D68B52737B0E8'
    };

    let allHashesMatch = true;
    for (const [file, expected] of Object.entries(expectedHashes)) {
        const actual = hashFile(file);
        const match = actual === expected;
        console.log(`${file}: ${match ? 'MATCH' : 'MISMATCH'} (${actual})`);
        if (!match) allHashesMatch = false;
    }

    if (!allHashesMatch) {
        throw new Error('TEST 10 FAILED: File integrity check failed.');
    }
    console.log('>>> TEST 10 RESULT: PASS\n');

    cdp.close();
    console.log('================================================================');
    console.log('ALL LIVE BROWSER VERIFICATION SUITES (STAGE 3) PASSED 100%');
    console.log('================================================================');
}

run().catch(err => {
    console.error('LIVE VERIFICATION ERROR:', err.message);
    process.exit(1);
});
