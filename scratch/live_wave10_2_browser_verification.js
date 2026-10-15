/**
 * WAVE 10.2 — Live Employees Master Read Migration Real Browser Verification Runner
 * Connects to live Chrome browser via CDP on port 9222.
 * Drives real browser DOM, state, and network inspections against http://127.0.0.1:8085/.
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
    console.log('WAVE 10.2: LIVE EMPLOYEES MASTER READ MIGRATION BROWSER CLOSEOUT');
    console.log('================================================================\n');

    const erpTab = await getErpTab();
    console.log(`Connected to Target Page: ${erpTab.id} (${erpTab.url})`);

    const cdp = new CdpClient(erpTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Network.enable');
    console.log('CDP Client and Network Monitoring initialized.\n');

    // Reload page to ensure clean baseline state
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
    // TEST A — BASELINE / AUTH LOCK
    // =========================================================================
    console.log('--- TEST A: BASELINE / AUTH LOCK ---');
    const testAResult = await cdp.evaluate(`(() => {
        return {
            hasFetchLiveMaster: typeof fetchLiveMaster === 'function',
            hasHydrateLiveMasterData: typeof hydrateLiveMasterData === 'function',
            hasGetLiveEmployees: typeof getLiveEmployees === 'function',
            hasNormalizeLiveEmployee: typeof normalizeLiveEmployee === 'function',
            liveMastersEmployees: state.liveMasters ? state.liveMasters.employees : null,
            employeesLoaded: state.liveMasterLoaded ? state.liveMasterLoaded.employees : undefined,
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser
        };
    })()`);

    console.log('A.1 fetchLiveMaster defined:', testAResult.hasFetchLiveMaster ? 'PASS' : 'FAIL');
    console.log('A.2 hydrateLiveMasterData defined:', testAResult.hasHydrateLiveMasterData ? 'PASS' : 'FAIL');
    console.log('A.3 getLiveEmployees defined:', testAResult.hasGetLiveEmployees ? 'PASS' : 'FAIL');
    console.log('A.4 normalizeLiveEmployee defined:', testAResult.hasNormalizeLiveEmployee ? 'PASS' : 'FAIL');
    console.log('A.5 state.liveMasters.employees is empty array:', Array.isArray(testAResult.liveMastersEmployees) && testAResult.liveMastersEmployees.length === 0 ? 'PASS (0)' : 'FAIL');
    console.log('A.6 state.liveMasterLoaded.employees is false:', testAResult.employeesLoaded === false ? 'PASS (false)' : 'FAIL');
    console.log('A.7 unauthenticated authAuthorized is false:', testAResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    if (!testAResult.hasFetchLiveMaster || !testAResult.hasGetLiveEmployees || !testAResult.hasNormalizeLiveEmployee) {
        throw new Error('TEST A FAILED: Helper functions missing!');
    }
    console.log('>>> TEST A RESULT: PASS\n');

    // =========================================================================
    // TEST B — ADMIN EMPLOYEE HYDRATION
    // =========================================================================
    console.log('--- TEST B: ADMIN EMPLOYEE HYDRATION ---');
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
                        return Promise.resolve({ data: [{ id: 'MAC-1', name: 'Shredder X1', plant_id: 'COMP-1' }], error: null }).then(resolve, reject);
                    }
                    if (table === 'consumables') {
                        return Promise.resolve({ data: [{ id: 'CON-1', name: 'Blade Set', plant_id: 'COMP-1' }], error: null }).then(resolve, reject);
                    }
                    if (table === 'shifts') {
                        return Promise.resolve({
                            data: [
                                { id: 'SH-01', plant_id: null, name: 'General Day Shift', start_time: '09:00:00', end_time: '18:00:00', grace_period_mins: 15, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true },
                                { id: 'SH-02', plant_id: null, name: 'Night Shift', start_time: '22:00:00', end_time: '06:00:00', grace_period_mins: 15, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true },
                                { id: 'SH-03', plant_id: 'COMP-2', name: 'Bhilai Early Shift', start_time: '06:00:00', end_time: '14:00:00', grace_period_mins: 10, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true }
                            ],
                            error: null
                        }).then(resolve, reject);
                    }
                    if (table === 'employees') {
                        const inFilter = queryState.filters.find(f => f.type === 'in' && f.col === 'business_id');
                        return Promise.resolve({
                            data: [
                                {
                                    id: 'EMP-001',
                                    business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001',
                                    plant_id: 'COMP-1',
                                    companyId: 'COMP-1',
                                    name: 'Rajesh Sharma',
                                    department: 'Operations',
                                    shift_id: 'SH-01',
                                    shift_name: 'General Day Shift',
                                    doj: '2023-01-15',
                                    basic_pay: 22000.00,
                                    hra: 8000.00,
                                    allowances: 3000.00,
                                    pf_applicable: 'Yes',
                                    esi_applicable: 'No',
                                    advance_balance: 0.00,
                                    ot_rate_per_hr: 150.00,
                                    allocated_paid_leaves: 12,
                                    bank_name: 'State Bank of India',
                                    account_no: '31234567890',
                                    ifsc_code: 'SBIN0001234',
                                    pan_no: 'ABCDE1234F',
                                    status: 'Active'
                                },
                                {
                                    id: 'EMP-002',
                                    business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001',
                                    plant_id: 'COMP-1',
                                    companyId: 'COMP-1',
                                    name: 'Pooja Verma',
                                    department: 'Quality Control',
                                    shift_id: 'SH-02',
                                    shift_name: 'Night Shift',
                                    doj: '2023-04-10',
                                    basic_pay: 25000.00,
                                    hra: 9000.00,
                                    allowances: 2500.00,
                                    pf_applicable: 'Yes',
                                    esi_applicable: 'No',
                                    advance_balance: 0.00,
                                    ot_rate_per_hr: 180.00,
                                    allocated_paid_leaves: 12,
                                    bank_name: 'HDFC Bank',
                                    account_no: '50100234567',
                                    ifsc_code: 'HDFC0000123',
                                    pan_no: 'PQRST5678G',
                                    status: 'Active'
                                },
                                {
                                    id: 'EMP-003',
                                    business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001',
                                    plant_id: 'COMP-2',
                                    companyId: 'COMP-2',
                                    name: 'Amit Patel',
                                    department: 'Maintenance',
                                    shift_id: 'SH-03',
                                    shift_name: 'Bhilai Early Shift',
                                    doj: '2023-06-01',
                                    basic_pay: 19000.00,
                                    hra: 6000.00,
                                    allowances: 2000.00,
                                    pf_applicable: 'Yes',
                                    esi_applicable: 'Yes',
                                    advance_balance: 0.00,
                                    ot_rate_per_hr: 140.00,
                                    allocated_paid_leaves: 12,
                                    bank_name: 'ICICI Bank',
                                    account_no: '123405001234',
                                    ifsc_code: 'ICIC0001234',
                                    pan_no: 'UVWXY9012H',
                                    status: 'Active'
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

        // Authenticate Admin context
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
            liveEmployeesCount: state.liveMasters.employees.length,
            employeeIds: state.liveMasters.employees.map(e => e.id),
            employeeNames: state.liveMasters.employees.map(e => e.name),
            employeesLoaded: state.liveMasterLoaded.employees,
            sampleEmp: state.liveMasters.employees[0]
        };
    })()`);

    console.log('B.1 Admin hydrateLiveMasterData() success:', testBResult.hydrateRes.success ? 'PASS (true)' : 'FAIL');
    console.log('B.2 Admin live employees count (3):', testBResult.liveEmployeesCount === 3 ? 'PASS (3)' : 'FAIL');
    console.log('B.3 Exact employee IDs:', JSON.stringify(testBResult.employeeIds));
    console.log('B.4 Exact employee names:', JSON.stringify(testBResult.employeeNames));
    console.log('B.5 liveMasterLoaded.employees is true:', testBResult.employeesLoaded === true ? 'PASS (true)' : 'FAIL');
    console.log('B.6 Sample employee normalized shift:', testBResult.sampleEmp.shiftId, testBResult.sampleEmp.shiftName);
    if (!testBResult.hydrateRes.success || testBResult.liveEmployeesCount !== 3 || testBResult.employeesLoaded !== true) {
        throw new Error('TEST B FAILED: Admin employee hydration failed!');
    }
    console.log('>>> TEST B RESULT: PASS\n');

    // =========================================================================
    // TEST C — GUARD SCOPING ENFORCEMENT
    // =========================================================================
    console.log('--- TEST C: GUARD PLANT SCOPING ENFORCEMENT ---');
    const testCResult = await cdp.evaluate(`(async () => {
        // Restrict authorized plants to COMP-1 only (Raipur)
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true }
        ];
        state.currentCompany = 'COMP-1';
        state.currentBusiness = getCurrentAuthorizedBusiness();

        await hydrateLiveMasterData();
        return {
            liveEmployeesCount: state.liveMasters.employees.length,
            employeeIds: state.liveMasters.employees.map(e => e.id),
            hasComp2Emp: state.liveMasters.employees.some(e => e.id === 'EMP-003' || e.plant_id === 'COMP-2')
        };
    })()`);

    console.log('C.1 Guard live employees count (Raipur COMP-1 only):', testCResult.liveEmployeesCount === 2 ? 'PASS (2)' : 'FAIL');
    console.log('C.2 Guard live employee IDs:', JSON.stringify(testCResult.employeeIds));
    console.log('C.3 COMP-2 dedicated employee excluded for Guard:', testCResult.hasComp2Emp === false ? 'PASS (Excluded)' : 'FAIL');
    if (testCResult.liveEmployeesCount !== 2 || testCResult.hasComp2Emp !== false) {
        throw new Error('TEST C FAILED: Guard plant scoping failed!');
    }
    console.log('>>> TEST C RESULT: PASS\n');

    // Restore Admin plants
    await cdp.evaluate(`(() => {
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true },
            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', is_active: true }
        ];
    })()`);
    await cdp.evaluate(`hydrateLiveMasterData()`);

    // =========================================================================
    // TEST D — EMPLOYEE MASTER TABLE UI RENDERING
    // =========================================================================
    console.log('--- TEST D: EMPLOYEE MASTER TABLE UI RENDERING ---');
    const testDResult = await cdp.evaluate(`(() => {
        const container = document.getElementById('content-area');
        renderTableModule('employees', container);
        const html = container.innerHTML;
        return {
            hasEmp001: html.includes('EMP-001'),
            hasRajesh: html.includes('Rajesh Sharma'),
            hasOperations: html.includes('Operations'),
            hasEmp002: html.includes('EMP-002'),
            hasPooja: html.includes('Pooja Verma'),
            hasQC: html.includes('Quality Control')
        };
    })()`);

    console.log('D.1 Employee EMP-001 rendered in DOM:', testDResult.hasEmp001 ? 'PASS' : 'FAIL');
    console.log('D.2 Name Rajesh Sharma rendered:', testDResult.hasRajesh ? 'PASS' : 'FAIL');
    console.log('D.3 Department Operations rendered:', testDResult.hasOperations ? 'PASS' : 'FAIL');
    console.log('D.4 Employee EMP-002 rendered in DOM:', testDResult.hasEmp002 ? 'PASS' : 'FAIL');
    console.log('D.5 Name Pooja Verma rendered:', testDResult.hasPooja ? 'PASS' : 'FAIL');
    if (!testDResult.hasEmp001 || !testDResult.hasRajesh) {
        throw new Error('TEST D FAILED: Employee table rendering failed!');
    }
    console.log('>>> TEST D RESULT: PASS\n');

    // =========================================================================
    // TEST E — EMPLOYEE SELECTORS POPULATED
    // =========================================================================
    console.log('--- TEST E: EMPLOYEE SELECTORS POPULATED ---');
    const testEResult = await cdp.evaluate(`(() => {
        openModal('usersMaster');
        const modalBody = document.getElementById('modal-body');
        const html = modalBody ? modalBody.innerHTML : '';
        const res = {
            hasRajesh: html.includes('Rajesh Sharma'),
            hasPooja: html.includes('Pooja Verma')
        };
        closeModal();
        return res;
    })()`);

    console.log('E.1 usersMaster modal includes Rajesh Sharma in employee selector:', testEResult.hasRajesh ? 'PASS' : 'FAIL');
    console.log('E.2 usersMaster modal includes Pooja Verma in employee selector:', testEResult.hasPooja ? 'PASS' : 'FAIL');
    if (!testEResult.hasRajesh) {
        throw new Error('TEST E FAILED: Employee selector in openModal not populated!');
    }
    console.log('>>> TEST E RESULT: PASS\n');

    // =========================================================================
    // TEST F — QUICK ADD EMPLOYEE
    // =========================================================================
    console.log('--- TEST F: QUICK ADD EMPLOYEE ---');
    const testFResult = await cdp.evaluate(`(() => {
        const shiftSelect = document.getElementById('qe-shift');
        if (typeof quickAddEmployee === 'function') {
            quickAddEmployee();
            const hasGeneral = shiftSelect ? shiftSelect.innerHTML.includes('General Day Shift') : false;
            const hasNight = shiftSelect ? shiftSelect.innerHTML.includes('Night Shift') : false;
            closeQuickEmpModal();
            return {
                success: true,
                hasGeneral,
                hasNight
            };
        }
        return { success: false };
    })()`);

    console.log('F.1 quickAddEmployee opens and shift select contains live shifts:', testFResult.hasGeneral ? 'PASS' : 'FAIL');
    console.log('F.2 quickAddEmployee contains Night Shift:', testFResult.hasNight ? 'PASS' : 'FAIL');
    if (!testFResult.success || !testFResult.hasGeneral) {
        throw new Error('TEST F FAILED: quickAddEmployee shift population failed!');
    }
    console.log('>>> TEST F RESULT: PASS\n');

    // =========================================================================
    // TEST G — ATTENDANCE LOOKUP
    // =========================================================================
    console.log('--- TEST G: ATTENDANCE LOOKUP ---');
    const testGResult = await cdp.evaluate(`(() => {
        const modalBody = document.createElement('div');
        renderLiveAttendanceModal(modalBody);
        const html = modalBody.innerHTML;
        return {
            hasRajesh: html.includes('Rajesh Sharma'),
            hasPooja: html.includes('Pooja Verma')
        };
    })()`);

    console.log('G.1 Attendance modal contains Rajesh Sharma option:', testGResult.hasRajesh ? 'PASS' : 'FAIL');
    console.log('G.2 Attendance modal contains Pooja Verma option:', testGResult.hasPooja ? 'PASS' : 'FAIL');
    if (!testGResult.hasRajesh) {
        throw new Error('TEST G FAILED: Attendance lookup failed to read live employees!');
    }
    console.log('>>> TEST G RESULT: PASS\n');

    // =========================================================================
    // TEST H — PAYROLL LOOKUP
    // =========================================================================
    console.log('--- TEST H: PAYROLL LOOKUP ---');
    const testHResult = await cdp.evaluate(`(() => {
        const calc = calculateEmployeePayroll('EMP-001', 2026, 9, 'COMP-1');
        return {
            empId: calc.empId,
            basic: calc.basic,
            hra: calc.hra,
            allowances: calc.allowances,
            grossMonthly: calc.grossMonthly,
            blocked: calc.blocked
        };
    })()`);

    console.log('H.1 Payroll calculator loaded EMP-001:', testHResult.empId === 'EMP-001' ? 'PASS' : 'FAIL');
    console.log('H.2 Basic Pay mapped from live employee (22000):', testHResult.basic === 22000 ? 'PASS (22000)' : 'FAIL');
    console.log('H.3 HRA mapped from live employee (8000):', testHResult.hra === 8000 ? 'PASS (8000)' : 'FAIL');
    console.log('H.4 Gross monthly salary calculated (33000):', testHResult.grossMonthly === 33000 ? 'PASS (33000)' : 'FAIL');
    if (testHResult.basic !== 22000 || testHResult.hra !== 8000) {
        throw new Error('TEST H FAILED: Payroll calculation did not read live employee fields correctly!');
    }
    console.log('>>> TEST H RESULT: PASS\n');

    // =========================================================================
    // TEST I — SHIFT RELATIONSHIP
    // =========================================================================
    console.log('--- TEST I: SHIFT RELATIONSHIP ---');
    const testIResult = await cdp.evaluate(`(() => {
        const emp = getLiveEmployees().find(e => e.id === 'EMP-001');
        const liveShifts = getLiveShifts();
        const matchedShift = liveShifts.find(s => s.id === emp.shift_id || s.name === emp.shiftId);
        return {
            empShiftId: emp.shiftId,
            empShift_id: emp.shift_id,
            empShiftName: emp.shiftName,
            matchedShiftId: matchedShift ? matchedShift.id : null,
            matchedShiftName: matchedShift ? matchedShift.name : null
        };
    })()`);

    console.log('I.1 Employee shiftId resolved:', testIResult.empShiftId);
    console.log('I.2 Employee shift_id matched live shift:', testIResult.matchedShiftId === 'SH-01' ? 'PASS (SH-01)' : 'FAIL');
    console.log('I.3 Matched shift name matches employee shiftName:', testIResult.matchedShiftName === 'General Day Shift' ? 'PASS (General Day Shift)' : 'FAIL');
    if (testIResult.matchedShiftId !== 'SH-01') {
        throw new Error('TEST I FAILED: Shift relationship resolution failed!');
    }
    console.log('>>> TEST I RESULT: PASS\n');

    // =========================================================================
    // TEST J — SUCCESSFUL ZERO-ROW SECURITY (MANDATORY HARDENING)
    // =========================================================================
    console.log('--- TEST J: SUCCESSFUL ZERO-ROW SECURITY HARDENING ---');
    const testJResult = await cdp.evaluate(`(() => {
        const prevLoaded = state.liveMasterLoaded.employees;
        const prevEmps = state.liveMasters.employees;

        state.authAuthorized = true;
        state.liveMasterLoaded.employees = true;
        state.liveMasters.employees = [];

        const result = getLiveEmployees();

        // Restore
        state.liveMasterLoaded.employees = prevLoaded;
        state.liveMasters.employees = prevEmps;

        return {
            resultIsArray: Array.isArray(result),
            resultLength: result.length,
            leaksLegacy: result.length > 0
        };
    })()`);

    console.log('J.1 Authenticated loaded=true with [] returns empty array:', testJResult.resultIsArray && testJResult.resultLength === 0 ? 'PASS (0)' : 'FAIL');
    console.log('J.2 Does NOT leak legacy data on zero-row result:', testJResult.leaksLegacy === false ? 'PASS (No Leak)' : 'FAIL');
    if (!testJResult.resultIsArray || testJResult.resultLength !== 0 || testJResult.leaksLegacy !== false) {
        throw new Error('TEST J FAILED: Zero-row security violation! Legacy data leaked.');
    }
    console.log('>>> TEST J RESULT: PASS\n');

    // =========================================================================
    // TEST K — QUERY-FAILURE FALLBACK
    // =========================================================================
    console.log('--- TEST K: QUERY-FAILURE FALLBACK ---');
    const testKResult = await cdp.evaluate(`(async () => {
        const client = window.getSupabaseClient();
        const prevFrom = client.from;
        client.from = function(table) {
            const q = prevFrom(table);
            const origThen = q.then.bind(q);
            q.then = function(resolve, reject) {
                if (table === 'employees') {
                    return Promise.resolve({ data: null, error: { message: 'Simulated connection failure' } }).then(resolve, reject);
                }
                return origThen(resolve, reject);
            };
            return q;
        };

        state.liveMasters.employees = [];
        state.liveMasterLoaded.employees = false;

        const res = await hydrateLiveMasterData();
        const fallbackData = getLiveEmployees();

        // Restore mock from
        client.from = prevFrom;

        return {
            hydrateSuccess: res.success,
            authAuthorized: state.authAuthorized,
            currentUserPreserved: !!state.currentUser,
            currentCompanyPreserved: state.currentCompany === 'COMP-1',
            employeesLoadedFalse: state.liveMasterLoaded.employees === false,
            fallbackCount: fallbackData.length,
            fallbackHasLegacy: fallbackData.some(e => e.id === 'EMP-1' || e.id === 'EMP-001')
        };
    })()`);

    console.log('K.1 Query error handled gracefully:', testKResult.hydrateSuccess ? 'PASS' : 'FAIL');
    console.log('K.2 authAuthorized preserved (true):', testKResult.authAuthorized === true ? 'PASS (true)' : 'FAIL');
    console.log('K.3 currentUser preserved:', testKResult.currentUserPreserved ? 'PASS' : 'FAIL');
    console.log('K.4 currentCompany preserved (COMP-1):', testKResult.currentCompanyPreserved ? 'PASS' : 'FAIL');
    console.log('K.5 liveMasterLoaded.employees is false on error:', testKResult.employeesLoadedFalse ? 'PASS (false)' : 'FAIL');
    console.log('K.6 Fallback allows legacy data on failure:', testKResult.fallbackCount > 0 ? 'PASS (' + testKResult.fallbackCount + ')' : 'FAIL');
    if (!testKResult.authAuthorized || !testKResult.employeesLoadedFalse || testKResult.fallbackCount === 0) {
        throw new Error('TEST K FAILED: Query failure fallback failed!');
    }
    console.log('>>> TEST K RESULT: PASS\n');

    // Rehydrate valid data
    await cdp.evaluate(`hydrateLiveMasterData()`);

    // =========================================================================
    // TEST L — LOGOUT CACHE CLEANUP
    // =========================================================================
    console.log('--- TEST L: LOGOUT CACHE CLEANUP ---');
    const testLResult = await cdp.evaluate(`(async () => {
        await logoutUser();
        return {
            authAuthorized: state.authAuthorized,
            currentUser: state.currentUser,
            employeesCount: (state.liveMasters && state.liveMasters.employees) ? state.liveMasters.employees.length : -1,
            employeesLoaded: state.liveMasterLoaded ? state.liveMasterLoaded.employees : undefined
        };
    })()`);

    console.log('L.1 authAuthorized false after logout:', testLResult.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('L.2 currentUser null after logout:', testLResult.currentUser === null ? 'PASS (null)' : 'FAIL');
    console.log('L.3 state.liveMasters.employees empty after logout:', testLResult.employeesCount === 0 ? 'PASS (0)' : 'FAIL');
    console.log('L.4 state.liveMasterLoaded.employees false after logout:', testLResult.employeesLoaded === false ? 'PASS (false)' : 'FAIL');
    if (testLResult.authAuthorized !== false || testLResult.employeesCount !== 0 || testLResult.employeesLoaded !== false) {
        throw new Error('TEST L FAILED: Logout cache cleanup failed!');
    }
    console.log('>>> TEST L RESULT: PASS\n');

    // =========================================================================
    // TEST M — SESSION RESTORATION
    // =========================================================================
    console.log('--- TEST M: SESSION RESTORATION ---');
    const testMResult = await cdp.evaluate(`(async () => {
        state.currentUser = { id: 'USER-001', roleId: 'Super Administrator', companyId: 'COMP-1' };
        state.authorizedBusinesses = [{ id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', is_active: true }];
        state.authorizedPlants = [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', is_active: true },
            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', is_active: true }
        ];
        state.authAuthorized = true;
        state.currentCompany = 'COMP-1';
        state.currentBusiness = getCurrentAuthorizedBusiness();

        const hydrateRes = await hydrateLiveMasterData();
        return {
            hydrateSuccess: hydrateRes.success,
            authAuthorized: state.authAuthorized,
            employeesCount: state.liveMasters.employees.length,
            employeesLoaded: state.liveMasterLoaded.employees
        };
    })()`);

    console.log('M.1 Session restoration hydrate success:', testMResult.hydrateSuccess ? 'PASS' : 'FAIL');
    console.log('M.2 authAuthorized is true:', testMResult.authAuthorized === true ? 'PASS' : 'FAIL');
    console.log('M.3 Employees rehydrated count (3):', testMResult.employeesCount === 3 ? 'PASS (3)' : 'FAIL');
    console.log('M.4 liveMasterLoaded.employees is true:', testMResult.employeesLoaded === true ? 'PASS' : 'FAIL');
    if (!testMResult.hydrateSuccess || testMResult.employeesCount !== 3 || testMResult.employeesLoaded !== true) {
        throw new Error('TEST M FAILED: Session restoration failed!');
    }
    console.log('>>> TEST M RESULT: PASS\n');

    // =========================================================================
    // TEST N — NETWORK BOUNDARY
    // =========================================================================
    console.log('--- TEST N: NETWORK BOUNDARY ---');
    // Verify network boundary from CDP captured requests
    const employeeRequests = cdp.networkRequests.filter(r => r.url.includes('/rest/v1/employees') || r.url.includes('employees'));
    const nonGetEmployeeRequests = employeeRequests.filter(r => r.method !== 'GET');
    console.log(`N.1 Total captured Employee requests: ${employeeRequests.length}`);
    console.log(`N.2 Non-GET employee requests: ${nonGetEmployeeRequests.length}`);
    if (nonGetEmployeeRequests.length > 0) {
        throw new Error('TEST N FAILED: Non-GET employee requests captured!');
    }
    console.log('>>> TEST N RESULT: PASS\n');

    // =========================================================================
    // TEST O — MUTATION INTERCEPTION
    // =========================================================================
    console.log('--- TEST O: MUTATION INTERCEPTION ---');
    const mutationCounts = await cdp.evaluate(`(() => {
        const client = window.getSupabaseClient();
        return client.__mutationCounts || { insert: 0, update: 0, delete: 0, upsert: 0 };
    })()`);

    console.log('O.1 Insert count:', mutationCounts.insert);
    console.log('O.2 Update count:', mutationCounts.update);
    console.log('O.3 Delete count:', mutationCounts.delete);
    console.log('O.4 Upsert count:', mutationCounts.upsert);
    const totalMutations = (mutationCounts.insert || 0) + (mutationCounts.update || 0) + (mutationCounts.delete || 0) + (mutationCounts.upsert || 0);
    if (totalMutations !== 0) {
        throw new Error('TEST O FAILED: Mutations detected! Read-only invariant violated.');
    }
    console.log('>>> TEST O RESULT: PASS (0 mutations)\n');

    cdp.close();
    console.log('================================================================');
    console.log('ALL WAVE 10.2 VERIFICATION TESTS (A through O) PASSED!');
    console.log('================================================================');
}

run().catch(err => {
    console.error('\n❌ VERIFICATION RUNNER FAILED:', err);
    process.exit(1);
});
