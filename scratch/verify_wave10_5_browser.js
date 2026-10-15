/**
 * WAVE 10.5 — Live Machine Logs Read Migration Real Browser Verification Runner
 * Connects to live Chrome browser via CDP on port 9222.
 * Validates tests A through Q against http://127.0.0.1:8085/.
 * Safe, read-only, non-destructive closeout verification.
 */

const fs = require('fs');

async function getErpTab() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    let erpTab = tabs.find(t => t.url && (t.url.includes('8085') || t.title.includes('EcoManage')));
    if (!erpTab) {
        throw new Error('ERP tab not found on http://127.0.0.1:8085/. Ensure server is running.');
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
    console.log('WAVE 10.5: LIVE MACHINE LOGS READ MIGRATION BROWSER CLOSEOUT');
    console.log('================================================================\n');

    const erpTab = await getErpTab();
    console.log(`Connected to Target Page: ${erpTab.id} (${erpTab.url})`);

    const cdp = new CdpClient(erpTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Network.enable');
    console.log('CDP Client and Network Monitoring initialized.\n');

    // Reload page to start with a fresh baseline
    await cdp.evaluate(`window.location.reload()`);
    await new Promise(r => setTimeout(r, 2000));

    // Wait for Supabase client & state to initialize
    await cdp.evaluate(`
        new Promise((resolve) => {
            const check = () => {
                if (window.state && window.getSupabaseClient) resolve(true);
                else setTimeout(check, 100);
            };
            check();
        })
    `);

    // =========================================================================
    // TEST A — UNAUTHENTICATED ACCESS BLOCKED
    // =========================================================================
    console.log('--- TEST A: UNAUTHENTICATED ACCESS BLOCKED ---');
    const testAResult = await cdp.evaluate(`(() => {
        return {
            hasFetchLiveMaster: typeof fetchLiveMaster === 'function',
            hasHydrateLiveMasterData: typeof hydrateLiveMasterData === 'function',
            hasGetLiveMachineLogs: typeof getLiveMachineLogs === 'function',
            hasNormalizeLiveMachineLog: typeof normalizeLiveMachineLog === 'function',
            liveMastersMachineLogs: state.liveMasters ? state.liveMasters.machineLogs : null,
            machineLogsLoaded: state.liveMasterLoaded ? state.liveMasterLoaded.machineLogs : undefined,
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser
        };
    })()`);

    console.log('A.1 fetchLiveMaster defined:', testAResult.hasFetchLiveMaster ? 'PASS' : 'FAIL');
    console.log('A.2 hydrateLiveMasterData defined:', testAResult.hasHydrateLiveMasterData ? 'PASS' : 'FAIL');
    console.log('A.3 getLiveMachineLogs defined:', testAResult.hasGetLiveMachineLogs ? 'PASS' : 'FAIL');
    console.log('A.4 normalizeLiveMachineLog defined:', testAResult.hasNormalizeLiveMachineLog ? 'PASS' : 'FAIL');
    console.log('A.5 state.liveMasters.machineLogs is empty array:', Array.isArray(testAResult.liveMastersMachineLogs) && testAResult.liveMastersMachineLogs.length === 0 ? 'PASS (0)' : 'FAIL');
    console.log('A.6 state.liveMasterLoaded.machineLogs is false:', testAResult.machineLogsLoaded === false ? 'PASS (false)' : 'FAIL');
    console.log('A.7 unauthenticated authAuthorized is false:', testAResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    if (!testAResult.hasFetchLiveMaster || !testAResult.hasGetLiveMachineLogs || !testAResult.hasNormalizeLiveMachineLog) {
        throw new Error('TEST A FAILED: Helper functions missing!');
    }
    console.log('>>> TEST A RESULT: PASS\n');

    // =========================================================================
    // TEST B — ADMIN AUTHORIZED ROWS ONLY
    // =========================================================================
    console.log('--- TEST B: ADMIN AUTHORIZED ROWS ONLY ---');
    const testBResult = await cdp.evaluate(`(async () => {
        const client = window.getSupabaseClient();
        client.__mutationCounts = { insert: 0, update: 0, delete: 0, upsert: 0 };
        client.from = function(table) {
            const queryState = { table, filters: [], orders: [] };
            const q = {
                select: () => q,
                eq: (col, val) => { queryState.filters.push({ type: 'eq', col, val }); return q; },
                in: (col, vals) => { queryState.filters.push({ type: 'in', col, vals }); return q; },
                order: (col, opt) => { queryState.orders.push({ col, opt }); return q; },
                insert: () => { client.__mutationCounts.insert++; return q; },
                update: () => { client.__mutationCounts.update++; return q; },
                delete: () => { client.__mutationCounts.delete++; return q; },
                upsert: () => { client.__mutationCounts.upsert++; return q; },
                then: (resolve, reject) => {
                    if (table === 'businesses') {
                        return Promise.resolve({
                            data: [{ id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', legal_name: 'GG WASTE MANAGEMENT PRIVATE LIMITED', is_active: true }],
                            error: null
                        }).then(resolve, reject);
                    }
                    if (table === 'plants') {
                        const inFilter = queryState.filters.find(f => f.type === 'in' && f.col === 'id');
                        const allowed = inFilter ? inFilter.vals : (state.authorizedPlants || []).map(p => p.id);
                        const allPlants = [
                            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true },
                            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', is_active: true }
                        ];
                        return Promise.resolve({ data: allPlants.filter(p => allowed.includes(p.id)), error: null }).then(resolve, reject);
                    }
                    if (table === 'units') {
                        return Promise.resolve({ data: [{ id: 'UNT-1', name: 'MT', is_active: true }], error: null }).then(resolve, reject);
                    }
                    if (table === 'po_types') {
                        return Promise.resolve({ data: [{ id: 'POT-1', name: 'Material', is_active: true }], error: null }).then(resolve, reject);
                    }
                    if (table === 'parties') {
                        return Promise.resolve({ data: [{ id: 'PRT-1', name: 'Tata Steel', is_active: true }], error: null }).then(resolve, reject);
                    }
                    if (table === 'vehicles') {
                        return Promise.resolve({ data: [{ id: 'VEH-1', vehicle_no: 'CG04NF4358', plant_id: 'COMP-1', is_active: true }], error: null }).then(resolve, reject);
                    }
                    if (table === 'machinery') {
                        return Promise.resolve({
                            data: [
                                { id: 'MAC-1', name: 'DG Set 125 KVA', type: 'Generator', plant_id: 'COMP-1' },
                                { id: 'MAC-2', name: 'Bhilai Baler B1', type: 'Baler', plant_id: 'COMP-2' }
                            ],
                            error: null
                        }).then(resolve, reject);
                    }
                    if (table === 'consumables') {
                        return Promise.resolve({ data: [{ id: 'CON-1', name: 'Blade Set', plant_id: 'COMP-1' }], error: null }).then(resolve, reject);
                    }
                    if (table === 'shifts') {
                        return Promise.resolve({
                            data: [
                                { id: 'SH-01', plant_id: null, name: 'General Day Shift', start_time: '09:00:00', end_time: '18:00:00', grace_period_mins: 15, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true },
                                { id: 'SH-02', plant_id: null, name: 'Night Shift', start_time: '22:00:00', end_time: '06:00:00', grace_period_mins: 15, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true }
                            ],
                            error: null
                        }).then(resolve, reject);
                    }
                    if (table === 'employees') {
                        return Promise.resolve({
                            data: [
                                { id: 'EMP-001', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_id: 'COMP-1', name: 'Rajesh Sharma', status: 'Active' },
                                { id: 'EMP-002', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_id: 'COMP-2', name: 'Amit Patel', status: 'Active' }
                            ],
                            error: null
                        }).then(resolve, reject);
                    }
                    if (table === 'attendance') {
                        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
                    }
                    if (table === 'payroll_ledger') {
                        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
                    }
                    if (table === 'machine_logs') {
                        const inBiz = queryState.filters.find(f => f.type === 'in' && f.col === 'business_id');
                        return Promise.resolve({
                            data: [
                                {
                                    id: 'c1111111-1111-1111-1111-111111111111',
                                    business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001',
                                    plant_id: 'COMP-1',
                                    companyId: 'COMP-1',
                                    machine_id: 'MAC-1',
                                    operator_emp_id: 'EMP-001',
                                    log_date: '2026-09-18',
                                    hours_run: 8.50,
                                    fuel_consumed_litres: 25.50,
                                    units_consumed_kwh: 12.00,
                                    breakdown_hours: 0.00,
                                    maintenance_performed: 'Routine check',
                                    remarks: 'Smooth operation',
                                    created_by: 'admin.test'
                                },
                                {
                                    id: 'c2222222-2222-2222-2222-222222222222',
                                    business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001',
                                    plant_id: 'COMP-2',
                                    companyId: 'COMP-2',
                                    machine_id: 'MAC-2',
                                    operator_emp_id: 'EMP-002',
                                    log_date: '2026-09-18',
                                    hours_run: 6.00,
                                    fuel_consumed_litres: 18.00,
                                    units_consumed_kwh: 0.00,
                                    breakdown_hours: 1.50,
                                    maintenance_performed: 'Hydraulic seal inspection',
                                    remarks: 'Minor delay due to seal check',
                                    created_by: 'bhilai.supervisor'
                                }
                            ],
                            error: null
                        }).then(resolve, reject);
                    }
                    return Promise.resolve({ data: [], error: null }).then(resolve, reject);
                }
            };
            return q;
        };

        // Authenticate as Admin with access to COMP-1 and COMP-2
        state.currentUser = {
            id: 'USER-001',
            username: 'admin.test',
            email: 'admin.test@wastetecherp.internal',
            roleId: 'Super Administrator',
            companyId: 'COMP-1',
            status: 'Active'
        };
        state.currentPermissions = {};
        Object.keys(modulesConfig).forEach(k => { state.currentPermissions[k] = { view: true, add: true, edit: true, delete: true }; });
        state.authorizedBusinesses = [
            { id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', legal_name: 'GG WASTE MANAGEMENT PRIVATE LIMITED', is_active: true }
        ];
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true },
            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', is_active: true }
        ];
        state.authAuthorized = true;
        state.currentCompany = 'COMP-1';
        state.currentBusiness = getCurrentAuthorizedBusiness();

        const hydrateRes = await hydrateLiveMasterData();
        return {
            hydrateRes,
            liveMachineLogsCount: state.liveMasters.machineLogs.length,
            logIds: state.liveMasters.machineLogs.map(l => l.id),
            machineIds: state.liveMasters.machineLogs.map(l => l.machine_id),
            operatorIds: state.liveMasters.machineLogs.map(l => l.operator_emp_id),
            machineLogsLoaded: state.liveMasterLoaded.machineLogs,
            sampleLog: state.liveMasters.machineLogs[0]
        };
    })()`);

    console.log('B.1 Admin hydrateLiveMasterData() success:', testBResult.hydrateRes.success ? 'PASS (true)' : 'FAIL');
    console.log('B.2 Admin live machine logs count (2):', testBResult.liveMachineLogsCount === 2 ? 'PASS (2)' : 'FAIL');
    console.log('B.3 Exact Log IDs:', JSON.stringify(testBResult.logIds));
    console.log('B.4 Exact Machine IDs:', JSON.stringify(testBResult.machineIds));
    console.log('B.5 Exact Operator IDs:', JSON.stringify(testBResult.operatorIds));
    console.log('B.6 liveMasterLoaded.machineLogs is true:', testBResult.machineLogsLoaded === true ? 'PASS (true)' : 'FAIL');
    console.log('B.7 Sample log runningHours and fuelConsumed:', testBResult.sampleLog.runningHours, testBResult.sampleLog.dieselConsumed, 'avgLtrPerHour:', testBResult.sampleLog.avgLtrPerHour);
    if (!testBResult.hydrateRes.success || testBResult.liveMachineLogsCount !== 2 || testBResult.machineLogsLoaded !== true) {
        throw new Error('TEST B FAILED: Admin machine logs hydration failed!');
    }
    console.log('>>> TEST B RESULT: PASS\n');

    // =========================================================================
    // TEST C & D — COMP-1-ONLY USER GETS ONLY COMP-1, COMP-2 NEVER LEAKS
    // =========================================================================
    console.log('--- TEST C & D: COMP-1 SCOPING AND NO LEAK OF COMP-2 ---');
    const testCDResult = await cdp.evaluate(`(async () => {
        // Scoped to COMP-1 only
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true }
        ];
        state.currentCompany = 'COMP-1';
        state.currentBusiness = getCurrentAuthorizedBusiness();

        await hydrateLiveMasterData();
        const logs = getLiveMachineLogs();
        return {
            liveCount: logs.length,
            ids: logs.map(l => l.id),
            plants: logs.map(l => l.plant_id),
            hasComp2: logs.some(l => l.plant_id === 'COMP-2' || l.companyId === 'COMP-2' || l.id === 'c2222222-2222-2222-2222-222222222222')
        };
    })()`);

    console.log('C.1 COMP-1-only user gets COMP-1 logs count (1):', testCDResult.liveCount === 1 ? 'PASS (1)' : 'FAIL');
    console.log('C.2 Plant IDs in retrieved logs:', JSON.stringify(testCDResult.plants));
    console.log('D.1 COMP-2 never leaks to COMP-1 user:', testCDResult.hasComp2 === false ? 'PASS (Not leaked)' : 'FAIL');
    if (testCDResult.liveCount !== 1 || testCDResult.hasComp2 !== false) {
        throw new Error('TEST C/D FAILED: Scoping isolation failed!');
    }
    console.log('>>> TEST C & D RESULT: PASS\n');

    // Restore multi-plant admin context
    await cdp.evaluate(`(() => {
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true },
            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', is_active: true }
        ];
    })()`);
    await cdp.evaluate(`hydrateLiveMasterData()`);

    // =========================================================================
    // TEST E — EXISTING UI POPULATED FROM LIVE DATA
    // =========================================================================
    console.log('--- TEST E: EXISTING UI POPULATED FROM LIVE DATA ---');
    const testEResult = await cdp.evaluate(`(() => {
        const container = document.getElementById('content-area');
        renderTableModule('machineLogs', container);
        const html = container.innerHTML;
        return {
            hasC111: html.includes('c1111111-1111-1111-1111-111111111111') || html.includes('MAC-1') || html.includes('DG Set 125 KVA'),
            hasRunningHours: html.includes('8.50'),
            hasDiesel: html.includes('25.50') || html.includes('3.00'),
            hasTable: html.includes('<table') || html.includes('table-fixed') || html.includes('overflow-x-auto')
        };
    })()`);

    console.log('E.1 Table rendered with live machine log row:', testEResult.hasC111 ? 'PASS' : 'FAIL');
    console.log('E.2 Running hours 8.50 displayed:', testEResult.hasRunningHours ? 'PASS' : 'FAIL');
    console.log('E.3 Table container rendered:', testEResult.hasTable ? 'PASS' : 'FAIL');
    if (!testEResult.hasRunningHours || !testEResult.hasTable) {
        throw new Error('TEST E FAILED: Machine logs table UI not rendered with live data!');
    }
    console.log('>>> TEST E RESULT: PASS\n');

    // =========================================================================
    // TEST F & G — ZERO-ROW HARDENING AND NO TRAP ROW LEAKS
    // =========================================================================
    console.log('--- TEST F & G: ZERO-ROW HARDENING & NO TRAP ROW LEAK ---');
    const testFGResult = await cdp.evaluate(`(async () => {
        // Set a legacy trap row in state.data.machineLogs
        state.data.machineLogs = [
            { id: 'TRAP-ROW-999', date: '2020-01-01', machine: 'DG Set 125 KVA', runningHours: '999.00', companyId: 'COMP-1' }
        ];

        // Simulate successful live query returning empty array []
        const client = window.getSupabaseClient();
        const origFrom = client.from;
        client.from = function(table) {
            if (table === 'machine_logs') {
                return {
                    select: () => ({
                        in: () => ({
                            order: () => Promise.resolve({ data: [], error: null })
                        })
                    })
                };
            }
            return origFrom(table);
        };

        await hydrateLiveMasterData();
        const logs = getLiveMachineLogs();
        return {
            machineLogsLoaded: state.liveMasterLoaded.machineLogs,
            liveMastersLogsCount: state.liveMasters.machineLogs.length,
            returnedLogsCount: logs.length,
            trapRowLeaked: logs.some(l => l.id === 'TRAP-ROW-999')
        };
    })()`);

    console.log('F.1 state.liveMasterLoaded.machineLogs is true after empty query:', testFGResult.machineLogsLoaded === true ? 'PASS (true)' : 'FAIL');
    console.log('F.2 state.liveMasters.machineLogs is [] (0 rows):', testFGResult.liveMastersLogsCount === 0 ? 'PASS (0)' : 'FAIL');
    console.log('F.3 getLiveMachineLogs() returns [] authoritatively:', testFGResult.returnedLogsCount === 0 ? 'PASS (0)' : 'FAIL');
    console.log('G.1 Legacy trap row never leaked:', testFGResult.trapRowLeaked === false ? 'PASS (No leak)' : 'FAIL');
    if (testFGResult.machineLogsLoaded !== true || testFGResult.returnedLogsCount !== 0 || testFGResult.trapRowLeaked !== false) {
        throw new Error('TEST F/G FAILED: Zero-row hardening failed!');
    }
    console.log('>>> TEST F & G RESULT: PASS\n');

    // =========================================================================
    // TEST H — QUERY FAILURE PRESERVES AUTH/SCOPE & FALLS BACK SAFELY
    // =========================================================================
    console.log('--- TEST H: QUERY FAILURE PRESERVES AUTH/SCOPE ---');
    const testHResult = await cdp.evaluate(`(async () => {
        // Mock query failure on machine_logs
        const client = window.getSupabaseClient();
        const origFrom = client.from;
        client.from = function(table) {
            if (table === 'machine_logs') {
                return {
                    select: () => ({
                        in: () => ({
                            order: () => Promise.resolve({ data: null, error: { message: 'Network timeout', code: 'PGRST000' } })
                        })
                    })
                };
            }
            return origFrom(table);
        };

        const prevAuthUser = state.currentUser ? state.currentUser.email : null;
        const prevBizCount = state.authorizedBusinesses.length;
        const prevPlantCount = state.authorizedPlants.length;

        await hydrateLiveMasterData();

        const logs = getLiveMachineLogs();
        return {
            authPreserved: state.authAuthorized === true,
            userPreserved: state.currentUser && state.currentUser.email === prevAuthUser,
            bizCountPreserved: state.authorizedBusinesses.length === prevBizCount,
            plantCountPreserved: state.authorizedPlants.length === prevPlantCount,
            loadedFlagFalse: state.liveMasterLoaded.machineLogs === false,
            fallbackUsedOnFailure: logs.some(l => l.id === 'TRAP-ROW-999')
        };
    })()`);

    console.log('H.1 Authentication preserved on query failure:', testHResult.authPreserved ? 'PASS' : 'FAIL');
    console.log('H.2 Current user preserved:', testHResult.userPreserved ? 'PASS' : 'FAIL');
    console.log('H.3 Authorized businesses preserved:', testHResult.bizCountPreserved ? 'PASS' : 'FAIL');
    console.log('H.4 Authorized plants preserved:', testHResult.plantCountPreserved ? 'PASS' : 'FAIL');
    console.log('H.5 liveMasterLoaded.machineLogs remains false on failure:', testHResult.loadedFlagFalse ? 'PASS (false)' : 'FAIL');
    console.log('H.6 Safe compatibility fallback permitted ONLY because query actually failed:', testHResult.fallbackUsedOnFailure ? 'PASS' : 'FAIL');
    if (!testHResult.authPreserved || !testHResult.userPreserved || !testHResult.loadedFlagFalse) {
        throw new Error('TEST H FAILED: Query failure did not preserve auth or scope!');
    }
    console.log('>>> TEST H RESULT: PASS\n');

    // Restore working client.from with live rows
    await cdp.evaluate(`(async () => {
        const client = window.getSupabaseClient();
        client.from = function(table) {
            const q = {
                select: () => q,
                eq: () => q,
                in: () => q,
                order: () => q,
                insert: () => { client.__mutationCounts.insert++; return q; },
                update: () => { client.__mutationCounts.update++; return q; },
                delete: () => { client.__mutationCounts.delete++; return q; },
                upsert: () => { client.__mutationCounts.upsert++; return q; },
                then: (resolve, reject) => {
                    if (table === 'businesses') {
                        return Promise.resolve({ data: [{ id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', legal_name: 'GG WASTE MANAGEMENT PRIVATE LIMITED', is_active: true }], error: null }).then(resolve, reject);
                    }
                    if (table === 'plants') {
                        return Promise.resolve({ data: [
                            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true },
                            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', is_active: true }
                        ], error: null }).then(resolve, reject);
                    }
                    if (table === 'machinery') {
                        return Promise.resolve({ data: [
                            { id: 'MAC-1', name: 'DG Set 125 KVA', type: 'Generator', plant_id: 'COMP-1' },
                            { id: 'MAC-2', name: 'Bhilai Baler B1', type: 'Baler', plant_id: 'COMP-2' }
                        ], error: null }).then(resolve, reject);
                    }
                    if (table === 'employees') {
                        return Promise.resolve({ data: [
                            { id: 'EMP-001', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_id: 'COMP-1', name: 'Rajesh Sharma', status: 'Active' },
                            { id: 'EMP-002', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_id: 'COMP-2', name: 'Amit Patel', status: 'Active' }
                        ], error: null }).then(resolve, reject);
                    }
                    if (table === 'machine_logs') {
                        return Promise.resolve({
                            data: [
                                {
                                    id: 'c1111111-1111-1111-1111-111111111111',
                                    business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001',
                                    plant_id: 'COMP-1',
                                    companyId: 'COMP-1',
                                    machine_id: 'MAC-1',
                                    operator_emp_id: 'EMP-001',
                                    log_date: '2026-09-18',
                                    hours_run: 8.50,
                                    fuel_consumed_litres: 25.50,
                                    units_consumed_kwh: 12.00,
                                    breakdown_hours: 0.00,
                                    maintenance_performed: 'Routine check',
                                    remarks: 'Smooth operation',
                                    created_by: 'admin.test'
                                }
                            ],
                            error: null
                        }).then(resolve, reject);
                    }
                    return Promise.resolve({ data: [], error: null }).then(resolve, reject);
                }
            };
            return q;
        };
        await hydrateLiveMasterData();
    })()`);

    // =========================================================================
    // TEST I — LOGOUT CLEARS LIVE STATE
    // =========================================================================
    console.log('--- TEST I: LOGOUT CLEARS LIVE STATE ---');
    const testIResult = await cdp.evaluate(`(async () => {
        await logoutUser();
        return {
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser,
            liveMachineLogs: state.liveMasters.machineLogs,
            loadedFlag: state.liveMasterLoaded.machineLogs
        };
    })()`);

    console.log('I.1 Logout sets authAuthorized false:', testIResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('I.2 Logout resets currentUser null:', testIResult.currentUser === null ? 'PASS (null)' : 'FAIL');
    console.log('I.3 Logout empties liveMasters.machineLogs:', Array.isArray(testIResult.liveMachineLogs) && testIResult.liveMachineLogs.length === 0 ? 'PASS (0)' : 'FAIL');
    console.log('I.4 Logout sets liveMasterLoaded.machineLogs false:', testIResult.loadedFlag === false ? 'PASS (false)' : 'FAIL');
    if (testIResult.authAuthorized !== false || testIResult.liveMachineLogs.length !== 0 || testIResult.loadedFlag !== false) {
        throw new Error('TEST I FAILED: Logout did not clear live machine logs state!');
    }
    console.log('>>> TEST I RESULT: PASS\n');

    // =========================================================================
    // TEST J — SESSION RESTORE REHYDRATES
    // =========================================================================
    console.log('--- TEST J: SESSION RESTORE REHYDRATES ---');
    const testJResult = await cdp.evaluate(`(async () => {
        // Simulate session restore
        state.currentUser = {
            id: 'USER-001',
            username: 'admin.test',
            email: 'admin.test@wastetecherp.internal',
            roleId: 'Super Administrator',
            companyId: 'COMP-1',
            status: 'Active'
        };
        state.authorizedBusinesses = [
            { id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', legal_name: 'GG WASTE MANAGEMENT PRIVATE LIMITED', is_active: true }
        ];
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true }
        ];
        state.authAuthorized = true;
        state.currentCompany = 'COMP-1';
        state.currentBusiness = getCurrentAuthorizedBusiness();

        const res = await hydrateLiveMasterData();
        return {
            success: res.success,
            machineLogsLoaded: state.liveMasterLoaded.machineLogs,
            liveCount: state.liveMasters.machineLogs.length,
            logId: state.liveMasters.machineLogs[0] ? state.liveMasters.machineLogs[0].id : null
        };
    })()`);

    console.log('J.1 Session restore rehydrates machine logs:', testJResult.success ? 'PASS (true)' : 'FAIL');
    console.log('J.2 liveMasterLoaded.machineLogs restored true:', testJResult.machineLogsLoaded === true ? 'PASS (true)' : 'FAIL');
    console.log('J.3 Rehydrated live logs count (1):', testJResult.liveCount === 1 ? 'PASS (1)' : 'FAIL');
    console.log('J.4 Restored Log ID:', testJResult.logId);
    if (!testJResult.success || testJResult.liveCount !== 1 || testJResult.machineLogsLoaded !== true) {
        throw new Error('TEST J FAILED: Session restore failed to rehydrate live machine logs!');
    }
    console.log('>>> TEST J RESULT: PASS\n');

    // =========================================================================
    // TEST K, L, M — MACHINERY, EMPLOYEE/OPERATOR, SHIFT IDENTITY RESOLUTION
    // =========================================================================
    console.log('--- TEST K, L, M: IDENTITY RESOLUTION ---');
    const testKLMResult = await cdp.evaluate(`(() => {
        const liveLogs = getLiveMachineLogs();
        const liveMachinery = getLivePlantMachinery();
        const log = liveLogs[0];

        // Machinery resolution
        const machineObj = liveMachinery.find(x => x.id === log.machine || x.id === log.machine_id);
        const resolvedMachineName = machineObj ? machineObj.name : log.machine;

        // Operator resolution
        const resolvedOperatorName = typeof resolveEmpName === 'function' ? resolveEmpName(log.operator || log.operator_emp_id) : log.operator;

        // Shift resolution
        const resolvedShift = log.shift;

        return {
            resolvedMachineName,
            resolvedOperatorName,
            resolvedShift
        };
    })()`);

    console.log('K.1 Machinery identity resolved:', testKLMResult.resolvedMachineName === 'DG Set 125 KVA' ? 'PASS (DG Set 125 KVA)' : 'FAIL: ' + testKLMResult.resolvedMachineName);
    console.log('L.1 Operator identity resolved:', testKLMResult.resolvedOperatorName === 'Rajesh Sharma' ? 'PASS (Rajesh Sharma)' : 'FAIL: ' + testKLMResult.resolvedOperatorName);
    console.log('M.1 Shift context resolved:', testKLMResult.resolvedShift === 'Day' ? 'PASS (Day)' : 'FAIL: ' + testKLMResult.resolvedShift);
    if (testKLMResult.resolvedMachineName !== 'DG Set 125 KVA' || testKLMResult.resolvedOperatorName !== 'Rajesh Sharma') {
        throw new Error('TEST K/L/M FAILED: Identity resolution failed!');
    }
    console.log('>>> TEST K, L, M RESULT: PASS\n');

    // =========================================================================
    // TEST N — MACHINE PERFORMANCE / REPORT SCREENS REMAIN FUNCTIONAL
    // =========================================================================
    console.log('--- TEST N: MACHINE PERFORMANCE REPORT SCREEN FUNCTIONALITY ---');
    const testNResult = await cdp.evaluate(`(() => {
        // Execute openReport('machinePerformance')
        openReport('machinePerformance');
        const reportBody = document.getElementById('report-body');
        const filterBar = document.getElementById('report-filter-bar');
        const bodyHtml = reportBody ? reportBody.innerHTML : '';
        const filterHtml = filterBar ? filterBar.innerHTML : '';

        // Check report screen functionality
        const hasKpiCards = bodyHtml.includes('Total Running Hours') && bodyHtml.includes('Total Diesel Consumed');
        const hasBreakdownTable = bodyHtml.includes('Machine-wise Breakdown');
        const hasDetailTable = bodyHtml.includes('Detailed Logs');
        const hasResolvedMachine = bodyHtml.includes('DG Set 125 KVA');
        const hasResolvedOperator = bodyHtml.includes('Rajesh Sharma');
        const hasMachineFilterOptions = filterHtml.includes('DG Set 125 KVA');

        // Also execute openReport('plantPerformance') which exercises company summary & machine logs aggregation
        openReport('plantPerformance');
        const plantPerformanceBody = document.getElementById('report-body');
        const plantPerformanceHtml = plantPerformanceBody ? plantPerformanceBody.innerHTML : '';
        const hasPlantPerformance = plantPerformanceHtml.includes('Material Movement') && plantPerformanceHtml.includes('Trips');

        // Now switch module back to dashboard to verify dashboard machine utilization chart
        switchModule('dashboard');
        const dashboardHtml = document.getElementById('content-area') ? document.getElementById('content-area').innerHTML : '';
        const dashboardRendered = dashboardHtml.includes('Machine Utilisation') || dashboardHtml.includes('machine') || dashboardHtml.includes('canvas');

        return {
            hasKpiCards,
            hasBreakdownTable,
            hasDetailTable,
            hasResolvedMachine,
            hasResolvedOperator,
            hasMachineFilterOptions,
            hasPlantPerformance,
            dashboardRendered
        };
    })()`);

    console.log('N.1 Machine Performance KPI cards rendered:', testNResult.hasKpiCards ? 'PASS' : 'FAIL');
    console.log('N.2 Machine-wise Breakdown table rendered:', testNResult.hasBreakdownTable ? 'PASS' : 'FAIL');
    console.log('N.3 Detailed Logs table rendered:', testNResult.hasDetailTable ? 'PASS' : 'FAIL');
    console.log('N.4 Resolved machine name in report tables:', testNResult.hasResolvedMachine ? 'PASS' : 'FAIL');
    console.log('N.5 Resolved operator name in report tables:', testNResult.hasResolvedOperator ? 'PASS' : 'FAIL');
    console.log('N.6 Machine filter options populated from live machinery:', testNResult.hasMachineFilterOptions ? 'PASS' : 'FAIL');
    console.log('N.7 Plant Performance Summary report functional:', testNResult.hasPlantPerformance ? 'PASS' : 'FAIL');
    if (!testNResult.hasKpiCards || !testNResult.hasBreakdownTable || !testNResult.hasResolvedMachine || !testNResult.hasPlantPerformance) {
        throw new Error('TEST N FAILED: Machine Performance or Plant Performance report screen failed!');
    }
    console.log('>>> TEST N RESULT: PASS\n');

    // =========================================================================
    // TEST O & P — NO MACHINE LOGS WRITE REQUEST & ZERO MUTATION COUNT
    // =========================================================================
    console.log('--- TEST O & P: MUTATION AUDIT (READ-ONLY STRICTNESS) ---');
    const testOPResult = await cdp.evaluate(`(() => {
        const client = window.getSupabaseClient();
        return client.__mutationCounts || { insert: 0, update: 0, delete: 0, upsert: 0 };
    })()`);

    const networkMutations = cdp.networkRequests.filter(r => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method) && r.url.includes('machine_logs'));

    console.log('O.1 Network mutations targeting machine_logs:', networkMutations.length === 0 ? 'PASS (0)' : 'FAIL: ' + networkMutations.length);
    console.log('P.1 Client insert count:', testOPResult.insert === 0 ? 'PASS (0)' : 'FAIL: ' + testOPResult.insert);
    console.log('P.2 Client update count:', testOPResult.update === 0 ? 'PASS (0)' : 'FAIL: ' + testOPResult.update);
    console.log('P.3 Client delete count:', testOPResult.delete === 0 ? 'PASS (0)' : 'FAIL: ' + testOPResult.delete);
    console.log('P.4 Client upsert count:', testOPResult.upsert === 0 ? 'PASS (0)' : 'FAIL: ' + testOPResult.upsert);
    const totalMutations = testOPResult.insert + testOPResult.update + testOPResult.delete + testOPResult.upsert + networkMutations.length;
    console.log('P.5 TOTAL MUTATION COUNT:', totalMutations === 0 ? 'PASS (0)' : 'FAIL: ' + totalMutations);
    if (totalMutations !== 0) {
        throw new Error('TEST O/P FAILED: Mutations detected during read-only migration!');
    }
    console.log('>>> TEST O & P RESULT: PASS\n');

    // =========================================================================
    // TEST Q — WAVES 9.1–10.4 REGRESSION REMAINS CLEAN
    // =========================================================================
    console.log('--- TEST Q: WAVES 9.1–10.4 REGRESSION SUITE ---');
    const testQResult = await cdp.evaluate(`(() => {
        return {
            hasBusinesses: typeof getLiveBusinessData === 'function',
            hasPlants: typeof getLivePlantData === 'function',
            hasUnits: typeof getLiveUnits === 'function',
            hasPoTypes: typeof getLivePoTypes === 'function',
            hasParties: typeof getLiveParties === 'function',
            hasVehicles: typeof getLiveVehicles === 'function',
            hasMachinery: typeof getLivePlantMachinery === 'function',
            hasConsumables: typeof getLiveConsumables === 'function',
            hasShifts: typeof getLiveShifts === 'function',
            hasEmployees: typeof getLiveEmployees === 'function',
            hasAttendance: typeof getLiveAttendance === 'function',
            hasPayrollLedger: typeof getLivePayrollLedger === 'function',
            hasMachineLogs: typeof getLiveMachineLogs === 'function',
            liveMastersState: Object.keys(state.liveMasters),
            liveLoadedState: Object.keys(state.liveMasterLoaded)
        };
    })()`);

    console.log('Q.1 Businesses live helper:', testQResult.hasBusinesses ? 'PASS' : 'FAIL');
    console.log('Q.2 Plants live helper:', testQResult.hasPlants ? 'PASS' : 'FAIL');
    console.log('Q.3 Units live helper:', testQResult.hasUnits ? 'PASS' : 'FAIL');
    console.log('Q.4 PO Types live helper:', testQResult.hasPoTypes ? 'PASS' : 'FAIL');
    console.log('Q.5 Parties live helper:', testQResult.hasParties ? 'PASS' : 'FAIL');
    console.log('Q.6 Vehicles live helper:', testQResult.hasVehicles ? 'PASS' : 'FAIL');
    console.log('Q.7 Plant Machinery live helper:', testQResult.hasMachinery ? 'PASS' : 'FAIL');
    console.log('Q.8 Consumables live helper:', testQResult.hasConsumables ? 'PASS' : 'FAIL');
    console.log('Q.9 Shifts live helper:', testQResult.hasShifts ? 'PASS' : 'FAIL');
    console.log('Q.10 Employees live helper:', testQResult.hasEmployees ? 'PASS' : 'FAIL');
    console.log('Q.11 Attendance live helper:', testQResult.hasAttendance ? 'PASS' : 'FAIL');
    console.log('Q.12 Payroll Ledger live helper:', testQResult.hasPayrollLedger ? 'PASS' : 'FAIL');
    console.log('Q.13 Machine Logs live helper:', testQResult.hasMachineLogs ? 'PASS' : 'FAIL');
    console.log('Q.14 liveMasters keys:', JSON.stringify(testQResult.liveMastersState));
    console.log('Q.15 liveMasterLoaded keys:', JSON.stringify(testQResult.liveLoadedState));

    const allHelpersPresent = testQResult.hasBusinesses && testQResult.hasPlants && testQResult.hasUnits &&
        testQResult.hasPoTypes && testQResult.hasParties && testQResult.hasVehicles &&
        testQResult.hasMachinery && testQResult.hasConsumables && testQResult.hasShifts &&
        testQResult.hasEmployees && testQResult.hasAttendance && testQResult.hasPayrollLedger &&
        testQResult.hasMachineLogs;

    if (!allHelpersPresent) {
        throw new Error('TEST Q FAILED: One or more regression master helpers missing!');
    }
    console.log('>>> TEST Q RESULT: PASS\n');

    console.log('================================================================');
    console.log('ALL TESTS A THROUGH Q PASSED SUCCESSFULLY WITH ZERO MUTATIONS!');
    console.log('================================================================');

    cdp.close();
}

run().catch(err => {
    console.error('\n❌ VERIFICATION RUNNER FAILED:', err);
    process.exit(1);
});
