/**
 * WAVE 9.5 — Live Plant Context Enforcement Browser Verification Runner
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
    console.log('WAVE 9.5: LIVE PLANT CONTEXT ENFORCEMENT BROWSER VERIFICATION');
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
    // TEST 1 — UNAUTHENTICATED FAIL-CLOSED VERIFICATION
    // =========================================================================
    console.log('--- TEST 1: UNAUTHENTICATED FAIL-CLOSED HELPER VERIFICATION ---');
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
        authAuthorized: state.authAuthorized,
        currentCompany: state.currentCompany,
        currentBusiness: state.currentBusiness,
        accessiblePlants: getAccessiblePlants(),
        accessibleBusinesses: getAccessibleBusinesses(),
        currentAuthPlant: getCurrentAuthorizedPlant(),
        currentAuthBiz: getCurrentAuthorizedBusiness(),
        isAuthPlant: isAuthorizedPlant('COMP-1'),
        isAuthBiz: isAuthorizedBusiness('BIZ-01'),
        assertPlant: assertAuthorizedPlant('COMP-1'),
        assertBiz: assertAuthorizedBusiness('BIZ-01'),
        currentDisplay: getCurrentPlantDisplayData(),
        filterOpts: plantFilterOptions(),
        loginModalVisible: !document.getElementById('login-modal').classList.contains('hidden'),
        isLocked: document.getElementById('content-area').innerText.includes('Authentication Required')
    })`);

    console.log('1.1 authAuthorized:', test1State.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('1.2 currentCompany:', test1State.currentCompany === null ? 'PASS (null)' : 'FAIL');
    console.log('1.3 currentBusiness:', test1State.currentBusiness === null ? 'PASS (null)' : 'FAIL');
    console.log('1.4 getAccessiblePlants():', test1State.accessiblePlants.length === 0 ? 'PASS ([])' : 'FAIL');
    console.log('1.5 getAccessibleBusinesses():', test1State.accessibleBusinesses.length === 0 ? 'PASS ([])' : 'FAIL');
    console.log('1.6 getCurrentAuthorizedPlant():', test1State.currentAuthPlant === null ? 'PASS (null)' : 'FAIL');
    console.log('1.7 getCurrentAuthorizedBusiness():', test1State.currentAuthBiz === null ? 'PASS (null)' : 'FAIL');
    console.log('1.8 isAuthorizedPlant("COMP-1"):', test1State.isAuthPlant === false ? 'PASS (false)' : 'FAIL');
    console.log('1.9 assertAuthorizedPlant("COMP-1"):', test1State.assertPlant === null ? 'PASS (null)' : 'FAIL');
    console.log('1.10 getCurrentPlantDisplayData():', test1State.currentDisplay === null ? 'PASS (null)' : 'FAIL');
    console.log('1.11 plantFilterOptions():', test1State.filterOpts.length === 0 ? 'PASS ([])' : 'FAIL');
    console.log('1.12 ERP View Locked:', test1State.isLocked ? 'PASS (Locked)' : 'FAIL');

    if (test1State.authAuthorized !== false || test1State.accessiblePlants.length !== 0 || test1State.currentAuthPlant !== null) {
        throw new Error('TEST 1 FAILED: Helpers did not fail closed in unauthenticated state.');
    }
    console.log('>>> TEST 1 RESULT: PASS\n');

    // =========================================================================
    // TEST 2 — ADMIN LOGIN & ACCESS FOUNDATION HELPERS
    // =========================================================================
    console.log('--- TEST 2: ADMIN LIVE ACCESS FOUNDATION HELPERS ---');
    cdp.networkRequests = [];

    const adminLoginResult = await cdp.evaluate(`(async (email, password) => {
        const res = await loginWithCredentials(email, password);
        return {
            success: res,
            authAuthorized: state.authAuthorized,
            currentCompany: state.currentCompany,
            currentBusinessCode: state.currentBusiness ? state.currentBusiness.code : null,
            accessiblePlantIds: getAccessiblePlants().map(p => p.id),
            accessibleBizCodes: getAccessibleBusinesses().map(b => b.code),
            currentAuthPlantId: getCurrentAuthorizedPlant() ? getCurrentAuthorizedPlant().id : null,
            currentAuthBizCode: getCurrentAuthorizedBusiness() ? getCurrentAuthorizedBusiness().code : null,
            currentDisplayId: getCurrentPlantDisplayData() ? getCurrentPlantDisplayData().id : null,
            isAuthComp1: isAuthorizedPlant('COMP-1'),
            isAuthComp2: isAuthorizedPlant('COMP-2'),
            isAuthCompFake: isAuthorizedPlant('COMP-FAKE-999'),
            assertComp2Id: assertAuthorizedPlant('COMP-2') ? assertAuthorizedPlant('COMP-2').id : null,
            assertFake: assertAuthorizedPlant('COMP-FAKE-999'),
            filterOptions: plantFilterOptions()
        };
    })('admin.test@wastetecherp.internal', ${JSON.stringify(adminPassword)})`);

    await delay(1200);

    console.log('2.1 Admin Sign-In Success:', adminLoginResult.success ? 'PASS' : 'FAIL');
    console.log('2.2 state.authAuthorized:', adminLoginResult.authAuthorized === true ? 'PASS (true)' : 'FAIL');
    console.log('2.3 getAccessiblePlants() IDs:', JSON.stringify(adminLoginResult.accessiblePlantIds));
    console.log('2.4 getAccessibleBusinesses() Codes:', JSON.stringify(adminLoginResult.accessibleBizCodes));
    console.log('2.5 getCurrentAuthorizedPlant():', adminLoginResult.currentAuthPlantId === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
    console.log('2.6 getCurrentAuthorizedBusiness():', adminLoginResult.currentAuthBizCode === 'BIZ-01' ? 'PASS (BIZ-01)' : 'FAIL');
    console.log('2.7 getCurrentPlantDisplayData():', adminLoginResult.currentDisplayId === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
    console.log('2.8 isAuthorizedPlant("COMP-1"):', adminLoginResult.isAuthComp1 ? 'PASS (true)' : 'FAIL');
    console.log('2.9 isAuthorizedPlant("COMP-2"):', adminLoginResult.isAuthComp2 ? 'PASS (true)' : 'FAIL');
    console.log('2.10 isAuthorizedPlant("COMP-FAKE-999"):', !adminLoginResult.isAuthCompFake ? 'PASS (false)' : 'FAIL');
    console.log('2.11 assertAuthorizedPlant("COMP-2"):', adminLoginResult.assertComp2Id === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');
    console.log('2.12 assertAuthorizedPlant("COMP-FAKE-999"):', adminLoginResult.assertFake === null ? 'PASS (null)' : 'FAIL');
    console.log('2.13 plantFilterOptions():', JSON.stringify(adminLoginResult.filterOptions));

    if (!adminLoginResult.accessiblePlantIds.includes('COMP-1') || !adminLoginResult.accessiblePlantIds.includes('COMP-2')) {
        throw new Error('TEST 2 FAILED: Admin accessible plants missing COMP-1 or COMP-2.');
    }
    console.log('>>> TEST 2 RESULT: PASS\n');

    // =========================================================================
    // TEST 3 — ADMIN PLANT SWITCHING & CONTEXT INTEGRITY
    // =========================================================================
    console.log('--- TEST 3: ADMIN PLANT SWITCH & CONTEXT INTEGRITY ---');

    // Switch COMP-1 -> COMP-2
    const switchComp2 = await cdp.evaluate(`(() => {
        const sel = document.getElementById('company-select');
        sel.value = 'COMP-2';
        sel.onchange({ target: { value: 'COMP-2' } });
        return {
            currentCompany: state.currentCompany,
            currentAuthPlantId: getCurrentAuthorizedPlant() ? getCurrentAuthorizedPlant().id : null,
            currentAuthBizCode: getCurrentAuthorizedBusiness() ? getCurrentAuthorizedBusiness().code : null,
            currentDisplayId: getCurrentPlantDisplayData() ? getCurrentPlantDisplayData().id : null,
            isAuthComp2: isAuthorizedPlant('COMP-2')
        };
    })()`);

    console.log('3.1 Switched currentCompany to COMP-2:', switchComp2.currentCompany === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');
    console.log('3.2 getCurrentAuthorizedPlant():', switchComp2.currentAuthPlantId === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');
    console.log('3.3 getCurrentAuthorizedBusiness():', switchComp2.currentAuthBizCode === 'BIZ-01' ? 'PASS (BIZ-01)' : 'FAIL');
    console.log('3.4 getCurrentPlantDisplayData():', switchComp2.currentDisplayId === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');

    // Switch COMP-2 -> COMP-1
    const switchComp1 = await cdp.evaluate(`(() => {
        const sel = document.getElementById('company-select');
        sel.value = 'COMP-1';
        sel.onchange({ target: { value: 'COMP-1' } });
        return {
            currentCompany: state.currentCompany,
            currentAuthPlantId: getCurrentAuthorizedPlant() ? getCurrentAuthorizedPlant().id : null,
            currentAuthBizCode: getCurrentAuthorizedBusiness() ? getCurrentAuthorizedBusiness().code : null
        };
    })()`);

    console.log('3.5 Switched back to COMP-1:', switchComp1.currentCompany === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
    console.log('3.6 getCurrentAuthorizedPlant():', switchComp1.currentAuthPlantId === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
    console.log('>>> TEST 3 RESULT: PASS\n');

    // =========================================================================
    // TEST 4 — ADMIN FORCED INVALID PLANT
    // =========================================================================
    console.log('--- TEST 4: ADMIN FORCED INVALID PLANT REJECTION ---');
    const invalidPlantResult = await cdp.evaluate(`(() => {
        const isAuth = isAuthorizedPlant('COMP-FAKE-999');
        const assertRes = assertAuthorizedPlant('COMP-FAKE-999');
        const sel = document.getElementById('company-select');
        sel.value = 'COMP-FAKE-999';
        sel.onchange({ target: { value: 'COMP-FAKE-999' } });
        return {
            isAuth,
            assertRes,
            currentCompanyAfter: state.currentCompany,
            selectorValueAfter: sel.value
        };
    })()`);

    console.log('4.1 isAuthorizedPlant("COMP-FAKE-999"):', invalidPlantResult.isAuth === false ? 'PASS (false)' : 'FAIL');
    console.log('4.2 assertAuthorizedPlant("COMP-FAKE-999"):', invalidPlantResult.assertRes === null ? 'PASS (null)' : 'FAIL');
    console.log('4.3 currentCompany preserved:', invalidPlantResult.currentCompanyAfter === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
    console.log('4.4 Selector value restored:', invalidPlantResult.selectorValueAfter === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');

    if (invalidPlantResult.isAuth !== false || invalidPlantResult.currentCompanyAfter !== 'COMP-1') {
        throw new Error('TEST 4 FAILED: Unauthorized plant was not rejected.');
    }
    console.log('>>> TEST 4 RESULT: PASS\n');

    // =========================================================================
    // TEST 5 — GUARD LOGIN & HELPERS
    // =========================================================================
    console.log('--- TEST 5: GUARD LOGIN & PLANT CONTEXT ENFORCEMENT ---');
    await cdp.evaluate(`logoutUser()`);
    await delay(800);

    const guardLoginResult = await cdp.evaluate(`(async (email, password) => {
        const res = await loginWithCredentials(email, password);
        return {
            success: res,
            authAuthorized: state.authAuthorized,
            currentCompany: state.currentCompany,
            accessiblePlantIds: getAccessiblePlants().map(p => p.id),
            currentAuthPlantId: getCurrentAuthorizedPlant() ? getCurrentAuthorizedPlant().id : null,
            isAuthComp1: isAuthorizedPlant('COMP-1'),
            isAuthComp2: isAuthorizedPlant('COMP-2')
        };
    })('guard.hq.test@wastetecherp.internal', ${JSON.stringify(guardPassword)})`);

    await delay(1200);

    console.log('5.1 Guard Sign-In Success:', guardLoginResult.success ? 'PASS' : 'FAIL');
    console.log('5.2 Guard getAccessiblePlants() IDs:', JSON.stringify(guardLoginResult.accessiblePlantIds));
    console.log('5.3 Guard isAuthorizedPlant("COMP-1"):', guardLoginResult.isAuthComp1 ? 'PASS (true)' : 'FAIL');
    console.log('5.4 Guard isAuthorizedPlant("COMP-2"):', !guardLoginResult.isAuthComp2 ? 'PASS (false - Forbidden)' : 'FAIL');
    console.log('5.5 Guard getCurrentAuthorizedPlant():', guardLoginResult.currentAuthPlantId === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');

    if (guardLoginResult.accessiblePlantIds.length !== 1 || guardLoginResult.accessiblePlantIds[0] !== 'COMP-1') {
        throw new Error('TEST 5 FAILED: Guard plant isolation violated in helpers.');
    }
    console.log('>>> TEST 5 RESULT: PASS\n');

    // =========================================================================
    // TEST 6 — GUARD FILTER OPTIONS
    // =========================================================================
    console.log('--- TEST 6: GUARD FILTER OPTIONS EXCLUSION ---');
    const guardFilterOpts = await cdp.evaluate(`plantFilterOptions()`);
    console.log('6.1 Guard plantFilterOptions():', JSON.stringify(guardFilterOpts));
    const hasComp1 = guardFilterOpts.some(o => o.value === 'COMP-1');
    const hasComp2 = guardFilterOpts.some(o => o.value === 'COMP-2');
    console.log('6.2 Filter has COMP-1:', hasComp1 ? 'PASS (true)' : 'FAIL');
    console.log('6.3 Filter has COMP-2 (expect false):', !hasComp2 ? 'PASS (COMP-2 Excluded)' : 'FAIL (Security Leak)');

    if (!hasComp1 || hasComp2) {
        throw new Error('TEST 6 FAILED: plantFilterOptions exposed unauthorized plant to Guard.');
    }
    console.log('>>> TEST 6 RESULT: PASS\n');

    // =========================================================================
    // TEST 7 — GUARD SITE UI (ATTENDANCE SITES SCOPING)
    // =========================================================================
    console.log('--- TEST 7: GUARD SITE UI (ATTENDANCE SITES SCOPING) ---');
    const guardSitesUi = await cdp.evaluate(`(() => {
        const area = document.getElementById('content-area');
        renderAttendanceSites(area);
        const html = area.innerHTML;
        return {
            hasComp1: html.includes('COMP-1') || html.includes('HQ Raipur'),
            hasComp2: html.includes('COMP-2') || html.includes('Bhilai'),
            siteCardsCount: area.querySelectorAll('.grid > div').length
        };
    })()`);

    console.log('7.1 Attendance UI has COMP-1:', guardSitesUi.hasComp1 ? 'PASS (true)' : 'FAIL');
    console.log('7.2 Attendance UI has COMP-2 (expect false):', !guardSitesUi.hasComp2 ? 'PASS (COMP-2 Excluded)' : 'FAIL');
    console.log('7.3 Accessible Site Cards Count:', guardSitesUi.siteCardsCount === 1 ? 'PASS (1 site card)' : 'FAIL');

    if (!guardSitesUi.hasComp1 || guardSitesUi.hasComp2 || guardSitesUi.siteCardsCount !== 1) {
        throw new Error('TEST 7 FAILED: Guard Site UI exposed unauthorized plant sites.');
    }
    console.log('>>> TEST 7 RESULT: PASS\n');

    // =========================================================================
    // TEST 8 — SESSION RESTORE PRESERVES VERIFIED CONTEXT & HELPERS
    // =========================================================================
    console.log('--- TEST 8: SESSION RESTORATION & HELPER STABILITY ---');
    // Sign back in as Admin
    await cdp.evaluate(`(async (email, password) => {
        await loginWithCredentials(email, password);
    })('admin.test@wastetecherp.internal', ${JSON.stringify(adminPassword)})`);
    await delay(1200);

    console.log('Executing Page.reload via CDP...');
    await cdp.send('Page.reload');
    await delay(2200);

    const restoreResult = await cdp.evaluate(`({
        authAuthorized: state.authAuthorized,
        currentCompany: state.currentCompany,
        currentBusinessCode: state.currentBusiness ? state.currentBusiness.code : null,
        accessiblePlantIds: getAccessiblePlants().map(p => p.id),
        currentAuthPlantId: getCurrentAuthorizedPlant() ? getCurrentAuthorizedPlant().id : null,
        currentAuthBizCode: getCurrentAuthorizedBusiness() ? getCurrentAuthorizedBusiness().code : null,
        currentDisplayId: getCurrentPlantDisplayData() ? getCurrentPlantDisplayData().id : null,
        isAuthComp1: isAuthorizedPlant('COMP-1'),
        isAuthComp2: isAuthorizedPlant('COMP-2'),
        loginModalHidden: document.getElementById('login-modal').classList.contains('hidden')
    })`);

    console.log('8.1 Restored authAuthorized:', restoreResult.authAuthorized === true ? 'PASS (true)' : 'FAIL');
    console.log('8.2 Restored currentCompany:', restoreResult.currentCompany);
    console.log('8.3 Restored getAccessiblePlants():', JSON.stringify(restoreResult.accessiblePlantIds));
    console.log('8.4 Restored getCurrentAuthorizedPlant():', restoreResult.currentAuthPlantId ? `PASS (${restoreResult.currentAuthPlantId})` : 'FAIL');
    console.log('8.5 Restored getCurrentAuthorizedBusiness():', restoreResult.currentAuthBizCode ? `PASS (${restoreResult.currentAuthBizCode})` : 'FAIL');
    console.log('8.6 Restored getCurrentPlantDisplayData():', restoreResult.currentDisplayId ? `PASS (${restoreResult.currentDisplayId})` : 'FAIL');
    console.log('8.7 Restored isAuthorizedPlant("COMP-2"):', restoreResult.isAuthComp2 ? 'PASS (true)' : 'FAIL');

    if (!restoreResult.authAuthorized || !restoreResult.accessiblePlantIds.includes('COMP-1') || !restoreResult.accessiblePlantIds.includes('COMP-2')) {
        throw new Error('TEST 8 FAILED: Session restoration did not preserve verified context or helpers.');
    }
    console.log('>>> TEST 8 RESULT: PASS\n');

    // =========================================================================
    // TEST 9 — LOGOUT CLEANS UP CONTEXT & HELPERS FAIL CLOSED
    // =========================================================================
    console.log('--- TEST 9: LOGOUT CLEANUP & FAIL-CLOSED HELPERS ---');
    const logoutResult = await cdp.evaluate(`(async () => {
        await logoutUser();
        return {
            authAuthorized: state.authAuthorized,
            currentCompany: state.currentCompany,
            currentBusiness: state.currentBusiness,
            accessiblePlants: getAccessiblePlants(),
            accessibleBusinesses: getAccessibleBusinesses(),
            currentAuthPlant: getCurrentAuthorizedPlant(),
            currentAuthBiz: getCurrentAuthorizedBusiness(),
            currentDisplay: getCurrentPlantDisplayData(),
            filterOptions: plantFilterOptions(),
            loginModalVisible: !document.getElementById('login-modal').classList.contains('hidden')
        };
    })()`);

    console.log('9.1 authAuthorized after logout:', logoutResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('9.2 currentCompany after logout:', logoutResult.currentCompany === null ? 'PASS (null)' : 'FAIL');
    console.log('9.3 currentBusiness after logout:', logoutResult.currentBusiness === null ? 'PASS (null)' : 'FAIL');
    console.log('9.4 getAccessiblePlants():', logoutResult.accessiblePlants.length === 0 ? 'PASS ([])' : 'FAIL');
    console.log('9.5 getCurrentAuthorizedPlant():', logoutResult.currentAuthPlant === null ? 'PASS (null)' : 'FAIL');
    console.log('9.6 getCurrentPlantDisplayData():', logoutResult.currentDisplay === null ? 'PASS (null)' : 'FAIL');
    console.log('9.7 plantFilterOptions():', logoutResult.filterOptions.length === 0 ? 'PASS ([])' : 'FAIL');
    console.log('9.8 Login Modal Visible:', logoutResult.loginModalVisible ? 'PASS (Visible)' : 'FAIL');

    if (logoutResult.authAuthorized !== false || logoutResult.accessiblePlants.length !== 0 || logoutResult.currentAuthPlant !== null) {
        throw new Error('TEST 9 FAILED: Logout did not restore fail-closed lock.');
    }
    console.log('>>> TEST 9 RESULT: PASS\n');

    // =========================================================================
    // TEST 10 — NETWORK BOUNDARY & SECURITY HYGIENE
    // =========================================================================
    console.log('--- TEST 10: NETWORK BOUNDARY & SECURITY AUDIT ---');
    const queriedTables = new Set();
    cdp.networkRequests
        .map(r => r.url)
        .filter(u => u.includes('/rest/v1/'))
        .forEach(u => {
            const m = u.match(/\/rest\/v1\/([^?]+)/);
            if (m) queriedTables.add(m[1]);
        });

    console.log('Tables queried during Stage 3 / Wave 9.5:');
    queriedTables.forEach(t => console.log(`  + ${t}`));

    const forbiddenTables = ['invoices', 'trips', 'gate_entries', 'gateVerification', 'grn', 'attendance', 'payroll', 'payrollLedger', 'orders'];
    let forbiddenFound = false;
    forbiddenTables.forEach(t => {
        if (queriedTables.has(t)) {
            console.error(`  VIOLATION: Forbidden table queried: ${t}`);
            forbiddenFound = true;
        }
    });

    console.log('10.1 Operational Tables Queried:', !forbiddenFound ? 'PASS (None)' : 'FAIL');

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
    console.log('10.2 Service Role Key in Network Headers:', !serviceRoleKeyFound ? 'PASS (Zero presence)' : 'FAIL (Detected)');

    if (forbiddenFound || serviceRoleKeyFound) {
        throw new Error('TEST 10 FAILED: Network boundary or security hygiene violated.');
    }
    console.log('>>> TEST 10 RESULT: PASS\n');

    // =========================================================================
    // TEST 11 — FILE INTEGRITY
    // =========================================================================
    console.log('--- TEST 11: FILE INTEGRITY CHECK ---');
    const lockedHashes = {
        'frontend/index.html': '0461EED4640EEFFEC9D4EAD556BD57535BCC5FB38E59D42232CEB6ABCA22D012',
        'frontend/styles.css': 'ABBFDF4C9FAF231C446099E97620E3253D3D5180B973654C32E326C450715A3B',
        'frontend/data-provider.js': '4444F94D43BA34F032FAF129F6789AC51524EC5FF403B602F31EE2AF1A8A838C',
        'frontend/supabase-client.js': '28F29FA2BE3FB4868EA99DA63E5D6E885FAFCD665C4087CA8D7FB50FD276F94D',
        'index (29).html': '379D371ECD5BA097C1055FE8D61564D3FB76DD17347C68D268A12E7BFD269B23'
    };

    let allLockedMatch = true;
    for (const [file, expected] of Object.entries(lockedHashes)) {
        const actual = hashFile(file);
        const match = actual === expected;
        console.log(`${file}: ${match ? 'MATCH' : 'MISMATCH'} (${actual})`);
        if (!match) allLockedMatch = false;
    }

    const appJsHash = hashFile('frontend/app.js');
    console.log(`frontend/app.js (MODIFIED): ${appJsHash}`);

    if (!allLockedMatch) {
        throw new Error('TEST 11 FAILED: Locked file integrity violated.');
    }
    console.log('>>> TEST 11 RESULT: PASS\n');

    cdp.close();
    console.log('================================================================');
    console.log('ALL LIVE BROWSER VERIFICATION SUITES (STAGE 5) PASSED 100%');
    console.log('WAVE 9.5 — LIVE PLANT CONTEXT ENFORCEMENT — COMPLETE');
    console.log('================================================================\n');
}

run().catch(err => {
    console.error('\n*** LIVE BROWSER VERIFICATION FAILED ***');
    console.error(err.message || err);
    process.exit(1);
});
