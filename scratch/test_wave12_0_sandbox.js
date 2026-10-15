const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('=== WAVE 12.0: CORE OPERATIONAL & FINANCIAL SANDBOX TEST SUITE ===');

class MockElement {
    constructor(id = '') {
        this.id = id;
        this.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false
        };
        this.innerText = '';
        this.innerHTML = '';
        this.value = '';
        this.disabled = false;
        this.style = {};
        this.children = [];
        this.parentElement = { title: '', style: {} };
        this.options = [];
    }
    remove() {}
    appendChild(child) { this.children.push(child); }
    addEventListener() {}
    querySelector() { return new MockElement(); }
    querySelectorAll() { return []; }
    getElementsByTagName() { return []; }
}

const mockElements = {
    'login-modal': new MockElement('login-modal'),
    'login-error': new MockElement('login-error'),
    'login-submit': new MockElement('login-submit'),
    'login-form': new MockElement('login-form'),
    'login-email': new MockElement('login-email'),
    'login-password': new MockElement('login-password'),
    'auth-user-badge-container': new MockElement('auth-user-badge-container'),
    'auth-user-display': new MockElement('auth-user-display'),
    'auth-username': new MockElement('auth-username'),
    'auth-role': new MockElement('auth-role'),
    'user-avatar-icon': new MockElement('user-avatar-icon'),
    'nav-container': new MockElement('nav-container'),
    'content-area': new MockElement('content-area'),
    'company-select': new MockElement('company-select'),
    'page-title': new MockElement('page-title'),
    'sidebar-logo-slot': new MockElement('sidebar-logo-slot'),
    'fy-badge': new MockElement('fy-badge'),
    'app-modal': new MockElement('app-modal'),
    'modal-content': new MockElement('modal-content'),
    'modal-title': new MockElement('modal-title'),
    'modal-body': new MockElement('modal-body'),
    'modal-footer': new MockElement('modal-footer')
};

const mockDocument = {
    getElementById: (id) => mockElements[id] || new MockElement(id),
    querySelector: () => new MockElement(),
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement(tag),
    head: new MockElement('head'),
    body: new MockElement('body'),
    documentElement: { style: {} },
    addEventListener: () => {}
};

const sandbox = {
    window: {
        innerWidth: 1024,
        devicePixelRatio: 1,
        addEventListener: () => {},
        removeEventListener: () => {},
        matchMedia: () => ({ matches: false, addEventListener: () => {} }),
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        scrollTo: () => {},
        URL: { createObjectURL: () => 'blob:mock' },
        Blob: class { constructor() {} }
    },
    document: mockDocument,
    URL: { createObjectURL: () => 'blob:mock' },
    Blob: class { constructor() {} },
    console: {
        log: () => {},
        warn: () => {},
        error: () => {},
        info: () => {},
        table: () => {}
    },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    requestAnimationFrame: (fn) => fn(),
    navigator: { userAgent: 'Node' },
    location: { reload: () => {} },
    sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    }
};
sandbox.window.document = mockDocument;
sandbox.window.window = sandbox.window;
sandbox.self = sandbox.window;

const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

vm.createContext(sandbox);
vm.runInContext(appJsContent, sandbox);
console.log('✓ app.js successfully loaded in VM sandbox.');

const getState = () => vm.runInContext('state', sandbox);
const runFn = (expr) => vm.runInContext(expr, sandbox);

const state = getState();
const authBizUuid = 'e8b28cf9-b883-4a18-9730-1c6dc0fb2a06';
const activePlantId = 'COMP-1';
const otherPlantId = 'COMP-2';

// Set up authenticated admin state
state.authAuthorized = true;
state.currentCompany = activePlantId;
state.currentBusiness = { id: authBizUuid, legal_name: 'EcoManage Corp' };
state.authorizedBusinesses = [{ id: authBizUuid, legal_name: 'EcoManage Corp' }];
state.authorizedPlants = [
    { id: 'COMP-1', business_id: authBizUuid, plant_name: 'Raipur Plant' },
    { id: 'COMP-2', business_id: authBizUuid, plant_name: 'Bhilai Plant' }
];
state.currentUser = { id: 'u-1', username: 'admin', roleId: 'Super Administrator' };
state.currentPermissions = {
    poReceived: { view: true, add: true, edit: true, delete: true },
    poIssued: { view: true, add: true, edit: true, delete: true },
    grn: { view: true, add: true, edit: true, delete: true },
    payrollLedger: { view: true, add: true, edit: true, delete: true },
    payrollSettings: { view: true, add: true, edit: true, delete: true }
};

// -------------------------------------------------------------
// TEST 1: Orders Normalization & Split (Received vs Issued)
// -------------------------------------------------------------
console.log('--- TEST 1: Orders Normalization & Received/Issued Split ---');
const rawOrderRec = {
    id: 'ord-uuid-1',
    order_type: 'received',
    po_number: 'PO-REC-100',
    po_date: '2026-05-10',
    due_date: '2026-06-10',
    party_id: 'PRT-1',
    item_id: 'ITM-1',
    item_qty: 500,
    item_rate: 120,
    total_qty: 500,
    consumed_qty: 150,
    balance_qty: 350,
    status: 'Open',
    business_id: authBizUuid,
    plant_id: activePlantId,
    'companyId': activePlantId
};

const normRec = runFn('normalizeLiveOrder')(rawOrderRec);
assert.strictEqual(normRec.id, 'PO-REC-100');
assert.strictEqual(normRec.dbId, 'ord-uuid-1');
assert.strictEqual(normRec.orderType, 'received');
assert.strictEqual(normRec.total_qty, 500);
assert.strictEqual(normRec.consumed_qty, 150);
assert.strictEqual(normRec.balance_qty, 350);
assert.strictEqual(normRec._isLive, true);

const rawOrderIss = {
    id: 'ord-uuid-2',
    order_type: 'issued',
    po_number: 'PO-ISS-200',
    po_date: '2026-05-11',
    due_date: '2026-06-11',
    party_id: 'PRT-2',
    item_id: 'ITM-2',
    item_qty: 200,
    item_rate: 80,
    status: 'Open',
    business_id: authBizUuid,
    plant_id: activePlantId,
    'companyId': activePlantId
};

const normIss = runFn('normalizeLiveOrder')(rawOrderIss);
assert.strictEqual(normIss.id, 'PO-ISS-200');
assert.strictEqual(normIss.orderType, 'issued');
assert.strictEqual(normIss._isLive, true);
console.log('✓ Orders normalizeLiveOrder correctly handles received and issued order types.');

// -------------------------------------------------------------
// TEST 2: GRN Normalization with Header & Child Item Reconstruction
// -------------------------------------------------------------
console.log('--- TEST 2: GRN Normalization & Child Items Reconstruction ---');
const rawGrnHeader = {
    id: 'grn-uuid-1',
    grn_number: 'GRN-1001',
    from_date: '2026-05-12',
    to_date: '2026-05-12',
    party_id: 'PRT-1',
    order_id: 'ord-uuid-1',
    po_ref: 'PO-REC-100',
    condition: 'Good',
    total_grn_weight: 42.5,
    total_shortage: 0.5,
    business_id: authBizUuid,
    plant_id: activePlantId,
    'companyId': activePlantId
};

const rawGrnItems = [
    {
        id: 'item-uuid-1',
        grn_id: 'grn-uuid-1',
        trip_uuid: 'trip-uuid-1',
        trip_number: 'TRIP-99',
        trip_weight: 43.0,
        received_weight: 42.5,
        grn_weight: 42.5,
        shortage: 0.5,
        material_doc_num: 'DOC-555'
    }
];

const normGrn = runFn('normalizeLiveGrn')(rawGrnHeader, rawGrnItems);
assert.strictEqual(normGrn.id, 'GRN-1001');
assert.strictEqual(normGrn.dbId, 'grn-uuid-1');
assert.strictEqual(normGrn.totalWeight, 42.5);
assert.strictEqual(normGrn.tripSelection.length, 1);
assert.strictEqual(normGrn.tripSelection[0].tripId, 'TRIP-99');
assert.strictEqual(normGrn.tripSelection[0].tripUuid, 'trip-uuid-1');
assert.strictEqual(normGrn.tripSelection[0].materialDocNumber, 'DOC-555');
assert.strictEqual(normGrn._isLive, true);
console.log('✓ GRN normalizeLiveGrn correctly binds child items and preserves trip UUIDs.');

// -------------------------------------------------------------
// TEST 3: Mock Hydration of Orders, GRN, and Payroll Settings
// -------------------------------------------------------------
console.log('--- TEST 3: Mock Hydration of Orders, GRN, and Payroll Settings ---');

// Setup mock Supabase client
const mockClient = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }) },
    from: (table) => {
        return {
            select: (cols) => {
                const chain = {
                    eq: (col, val) => chain,
                    in: (col, vals) => chain,
                    order: (col, opt) => chain,
                    then: (resolve) => {
                        if (table === 'businesses') {
                            resolve({ data: [{ id: authBizUuid, code: 'BIZ-1', legal_name: 'EcoManage Corp', is_active: true }], error: null });
                        } else if (table === 'plants') {
                            resolve({ data: [{ id: activePlantId, business_id: authBizUuid, plant_name: 'Raipur Plant', trade_name: 'Raipur', is_active: true }], error: null });
                        } else if (table === 'orders') {
                            resolve({ data: [rawOrderRec, rawOrderIss], error: null });
                        } else if (table === 'grn') {
                            resolve({ data: [rawGrnHeader], error: null });
                        } else if (table === 'grn_items') {
                            resolve({ data: rawGrnItems, error: null });
                        } else if (table === 'payroll_settings') {
                            resolve({
                                data: [{
                                    id: 'PAYSET-1',
                                    business_id: authBizUuid,
                                    plant_id: activePlantId,
                                    working_days_basis: 'Fixed 26 Days',
                                    pf_employee_pct: 12.0,
                                    pf_employer_pct: 12.0,
                                    pf_eps_pct: 8.33,
                                    pf_epf_pct: 3.67,
                                    pf_wage_ceiling: 15000,
                                    esi_employee_pct: 0.75,
                                    esi_employer_pct: 3.25,
                                    esi_wage_ceiling: 21000,
                                    ot_multiplier: 1.5,
                                    pt_slabs: [{ from: 0, to: 15000, amount: 0 }, { from: 15001, to: 25000, amount: 150 }]
                                }],
                                error: null
                            });
                        } else {
                            resolve({ data: [], error: null });
                        }
                    }
                };
                return chain;
            }
        };
    }
};
sandbox.getSupabaseClient = () => mockClient;
sandbox.window.getSupabaseClient = () => mockClient;

// Hydrate live data
runFn('hydrateLiveMasterData()').then(res => {
    assert.strictEqual(res.success, true, 'Hydration should succeed');

    // Verify Orders in state.data and state.liveMasters
    assert.strictEqual(state.liveMasters.poReceived.length, 1);
    assert.strictEqual(state.liveMasters.poIssued.length, 1);
    assert.strictEqual(state.data.poReceived.length, 1);
    assert.strictEqual(state.data.poIssued.length, 1);
    assert.strictEqual(state.data.poReceived[0].id, 'PO-REC-100');
    assert.strictEqual(state.data.poIssued[0].id, 'PO-ISS-200');
    assert.strictEqual(state.liveMasterLoaded.poReceived, true);
    assert.strictEqual(state.liveMasterLoaded.poIssued, true);

    // Verify GRN in state.data and state.liveMasters
    assert.strictEqual(state.liveMasters.grn.length, 1);
    assert.strictEqual(state.data.grn.length, 1);
    assert.strictEqual(state.data.grn[0].id, 'GRN-1001');
    assert.strictEqual(state.data.grn[0].tripSelection[0].tripId, 'TRIP-99');
    assert.strictEqual(state.liveMasterLoaded.grn, true);

    // Verify Payroll Settings
    assert.strictEqual(state.liveMasters.payrollSettings.length, 1);
    assert.strictEqual(state.data.payrollSettings.length, 1);
    assert.strictEqual(state.data.payrollSettings[0].workingDaysBasis, 'Fixed 26 Days');
    assert.strictEqual(state.liveMasterLoaded.payrollSettings, true);

    console.log('✓ Reload-hydration successfully synchronized Orders, GRN, and Payroll Settings into state.data and liveMasters.');

    // -------------------------------------------------------------
    // TEST 4: getLive Helpers Authority
    // -------------------------------------------------------------
    console.log('--- TEST 4: getLive Helpers Authority ---');
    assert.strictEqual(runFn('getLivePoReceived()').length, 1);
    assert.strictEqual(runFn('getLivePoIssued()').length, 1);
    assert.strictEqual(runFn('getLiveGrn()').length, 1);
    const liveSettings = runFn("getLivePayrollSettings('COMP-1')");
    assert(liveSettings !== null, 'Live payroll settings should be resolved');
    assert.strictEqual(liveSettings.workingDaysBasis, 'Fixed 26 Days');
    assert.strictEqual(liveSettings.ot_multiplier, 1.5);
    console.log('✓ getLivePoReceived, getLivePoIssued, getLiveGrn, getLivePayrollSettings returned authoritative data.');

    // -------------------------------------------------------------
    // TEST 5: Payroll Generation Authority & Missing Settings Fail-Closed
    // -------------------------------------------------------------
    console.log('--- TEST 5: Payroll Generation Authority & Missing Settings Fail-Closed ---');
    
    // Test calculateEmployeePayroll with live settings
    state.data.employees = [{
        id: 'EMP-01',
        name: 'John Doe',
        companyId: activePlantId,
        plant_id: activePlantId,
        basicPay: '20000',
        hra: '5000',
        allowances: '1000',
        otRate: '150',
        bankName: 'SBI',
        accountNo: '1234567890',
        status: 'Active'
    }];
    state.liveMasters.employees = state.data.employees;

    const calcRes = runFn("calculateEmployeePayroll('EMP-01', 2026, 5, 'COMP-1')");
    assert.strictEqual(Boolean(calcRes.blocked), false, 'Should not be blocked when live settings exist');

    // Simulate missing live settings: must fail closed without silent stale mock fallback!
    state.liveMasters.payrollSettings = [];
    state.data.payrollSettings = [];
    const blockedRes = runFn("calculateEmployeePayroll('EMP-01', 2026, 5, 'COMP-1')");
    assert.strictEqual(blockedRes.blocked, true, 'Must block payroll calculation when live settings are missing');
    assert(blockedRes.exceptions[0].includes('Authoritative live Payroll Statutory Settings not configured or unavailable'));
    console.log('✓ Payroll calculation strictly fails closed when live payroll settings are unavailable.');

    // Restore live settings
    state.liveMasters.payrollSettings = [liveSettings];
    state.data.payrollSettings = [liveSettings];

    // -------------------------------------------------------------
    // TEST 6: Report Authority across the 5 updated reports
    // -------------------------------------------------------------
    console.log('--- TEST 6: Report Authority across the 5 updated reports ---');
    
    // Plant Performance
    assert(appJsContent.includes("(typeof getLivePoReceived === 'function' ? getLivePoReceived() : state.data.poReceived).filter(p => plantIds.includes(p.companyId) && p.status === 'Open')"), "plantPerformance must use getLivePoReceived");
    assert(appJsContent.includes("(typeof getLivePoIssued === 'function' ? getLivePoIssued() : state.data.poIssued).filter(p => plantIds.includes(p.companyId) && p.status === 'Open')"), "plantPerformance must use getLivePoIssued");
    assert(appJsContent.includes("(typeof getLiveGrn === 'function' ? getLiveGrn() : state.data.grn).filter(g => plantIds.includes(g.companyId) && inDateRange(g.fromDate, from, to))"), "plantPerformance must use getLiveGrn");

    // GRN Report
    assert(appJsContent.includes("(typeof getLivePoReceived === 'function' ? getLivePoReceived() : state.data.poReceived).map(p => ({ value: p.id, label: p.id }))"), "grnReport must use getLivePoReceived for dropdown");
    assert(appJsContent.includes("(typeof getLiveGrn === 'function' ? getLiveGrn() : state.data.grn).filter(g => plantIds.includes(g.companyId) && inDateRange(g.fromDate, from, to))"), "grnReport must use getLiveGrn");

    // PO Received Fulfilment
    assert(appJsContent.includes("(typeof getLivePoReceived === 'function' ? getLivePoReceived() : state.data.poReceived).filter(p => plantIds.includes(p.companyId) && inDateRange(p.date, from, to))"), "poReceivedFulfilment must use getLivePoReceived");

    // PO Issued Commitment
    assert(appJsContent.includes("(typeof getLivePoIssued === 'function' ? getLivePoIssued() : state.data.poIssued).filter(p => plantIds.includes(p.companyId) && inDateRange(p.date, from, to))"), "poIssuedCommitment must use getLivePoIssued");

    // Material Movement
    assert(appJsContent.includes("(typeof getLiveItems === 'function' ? getLiveItems() : state.data.itemMaster).map(i => ({ value: i.name, label: i.name }))"), "materialMovement must use getLiveItems");

    console.log('✓ All 5 reports verified to use authoritative live getters.');

    console.log('=== ALL WAVE 12.0 SANDBOX UNIT TESTS PASSED 100%! ===');
}).catch(err => {
    console.error('Test failure:', err);
    process.exit(1);
});
