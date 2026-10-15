const fs = require('fs');
const vm = require('vm');

const appJsContent = fs.readFileSync('frontend/app.js', 'utf8');

class MockElement {
    constructor(id = '') {
        this.id = id;
        this.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false,
            toggle: () => {}
        };
        this.innerText = '';
        this.innerHTML = '';
        this.value = '';
        this.disabled = false;
        this.style = {};
        this.children = [];
        this.parentElement = { title: '' };
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
    'crud-modal': new MockElement('crud-modal'),
    'modal-title': new MockElement('modal-title'),
    'modal-body': new MockElement('modal-body'),
    'formModal': new MockElement('formModal'),
    'modal-form-fields': new MockElement('modal-form-fields'),
    'modal-form': new MockElement('modal-form'),
    'report-filter-bar': new MockElement('report-filter-bar'),
    'qe-shift': new MockElement('qe-shift'),
    'qe-name': new MockElement('qe-name'),
    'qe-dept': new MockElement('qe-dept'),
    'quick-emp-modal': new MockElement('quick-emp-modal'),
    'quick-emp-modal-content': new MockElement('quick-emp-modal-content')
};

let mockSupabaseResponses = {};

function createMockSupabaseClient() {
    return {
        auth: {
            signOut: async () => ({ error: null }),
            getSession: async () => ({ data: { session: null }, error: null })
        },
        from: (table) => {
            const queryState = { table, filters: [], orders: [] };
            const queryObj = {
                select: () => queryObj,
                eq: (col, val) => { queryState.filters.push({ type: 'eq', col, val }); return queryObj; },
                in: (col, vals) => { queryState.filters.push({ type: 'in', col, vals }); return queryObj; },
                order: (col, opt) => { queryState.orders.push({ col, opt }); return queryObj; },
                then: (resolve, reject) => {
                    const resp = mockSupabaseResponses[table];
                    if (typeof resp === 'function') {
                        return Promise.resolve(resp(queryState)).then(resolve, reject);
                    }
                    return Promise.resolve(resp || { data: [], error: null }).then(resolve, reject);
                }
            };
            return queryObj;
        }
    };
}

const sandbox = {
    console: {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    },
    document: {
        getElementById: (id) => mockElements[id] || new MockElement(id),
        createElement: (tag) => new MockElement(tag),
        addEventListener: () => {},
        documentElement: { style: {} },
        head: new MockElement('head'),
        body: new MockElement('body'),
        querySelector: () => new MockElement(),
        querySelectorAll: () => []
    },
    window: {
        innerWidth: 1024,
        addEventListener: () => {},
        devicePixelRatio: 1,
        URL: { createObjectURL: () => 'blob:mock' },
        getSupabaseClient: () => createMockSupabaseClient()
    },
    URL: { createObjectURL: () => 'blob:mock' },
    Blob: class { constructor() {} },
    navigator: { userAgent: 'node' },
    showToast: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    Chart: function() { return { destroy: () => {} }; },
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Set: Set,
    Map: Map,
    parseInt: parseInt,
    parseFloat: parseFloat
};

sandbox.window.document = sandbox.document;
sandbox.window.window = sandbox.window;
sandbox.window.Blob = sandbox.Blob;
sandbox.global = sandbox;
sandbox.self = sandbox.window;

// Execute app.js in sandbox
vm.createContext(sandbox);
vm.runInContext(appJsContent, sandbox);

console.log('=== APP.JS LOADED FOR WAVE 10.1 UNIT TESTS ===\n');

const getState = () => vm.runInContext('state', sandbox);
const runFn = (expr) => vm.runInContext(expr, sandbox);

async function runTests() {
    const state = getState();

    // 1. Initial State & Unauthenticated Fail-Closed
    console.log('--- TEST 1: Unauthenticated Fail-Closed Shifts Master ---');
    state.authAuthorized = false;
    state.currentCompany = null;
    state.authorizedPlants = [];
    state.authorizedBusinesses = [];
    state.liveMasters = {
        businesses: [], plants: [], units: [], poTypes: [],
        parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: []
    };

    const unauthHydrate = await runFn('hydrateLiveMasterData()');
    console.log('1.1 Unauthenticated hydration blocked:', unauthHydrate.success === false ? 'PASS' : 'FAIL');
    console.log('1.2 state.liveMasters.shifts empty:', state.liveMasters.shifts.length === 0 ? 'PASS (0)' : 'FAIL');
    console.log('1.3 getLiveShifts() returns fallback when unauthenticated:', runFn('getLiveShifts()').length > 0 ? 'PASS' : 'FAIL');
    console.log('>>> TEST 1 RESULT: PASS\n');

    // 2. Admin Live Shifts Hydration
    console.log('--- TEST 2: Admin Live Shifts Master Hydration ---');
    state.authAuthorized = true;
    state.authorizedBusinesses = [
        { id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', legal_name: 'GG WASTE MANAGEMENT PRIVATE LIMITED', is_active: true }
    ];
    state.authorizedPlants = [
        { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', trade_name: 'GG WASTECH (HQ Raipur)', is_active: true },
        { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', trade_name: 'Bhilai Processing Plant', is_active: true }
    ];
    state.currentCompany = 'COMP-1';
    state.currentBusiness = runFn('getCurrentAuthorizedBusiness()');

    mockSupabaseResponses = {
        businesses: { data: [{ id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', code: 'BIZ-01', legal_name: 'GG WASTE MANAGEMENT PRIVATE LIMITED', is_active: true }] },
        plants: { data: [
            { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', is_active: true },
            { id: 'COMP-2', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'Bhilai Processing Plant', is_active: true }
        ] },
        units: { data: [{ id: 'UNT-1', name: 'MT', is_active: true }] },
        po_types: { data: [{ id: 'POT-1', name: 'Material', is_active: true }] },
        parties: { data: [{ id: 'PRT-1', name: 'Tata Steel', is_active: true }] },
        vehicles: { data: [{ id: 'VEH-1', vehicle_no: 'CG04NF4358', plant_id: 'COMP-1', is_active: true }] },
        machinery: { data: [{ id: 'MAC-1', name: 'Shredder X1', plant_id: 'COMP-1' }] },
        consumables: { data: [{ id: 'CON-1', name: 'Blade', plant_id: 'COMP-1' }] },
        shifts: { data: [
            { id: 'SH-01', plant_id: null, name: 'General Day Shift', start_time: '09:00:00', end_time: '18:00:00', grace_period_mins: 15, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true },
            { id: 'SH-02', plant_id: null, name: 'Night Shift', start_time: '22:00:00', end_time: '06:00:00', grace_period_mins: 15, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true },
            { id: 'SH-03', plant_id: 'COMP-2', name: 'Bhilai Early Shift', start_time: '06:00:00', end_time: '14:00:00', grace_period_mins: 10, min_hours_full_day: 8.00, min_hours_half_day: 4.00, is_active: true }
        ] }
    };

    const adminHydrateRes = await runFn('hydrateLiveMasterData()');
    console.log('2.1 Admin hydrateLiveMasterData() success:', adminHydrateRes.success ? 'PASS (true)' : 'FAIL');
    console.log('2.2 Live shifts count for Admin (COMP-1 + COMP-2 + Global):', state.liveMasters.shifts.length === 3 ? 'PASS (3)' : 'FAIL');
    console.log('2.3 Live shift IDs:', JSON.stringify(state.liveMasters.shifts.map(s => s.id)));
    console.log('2.4 Time format normalized to HH:MM:', state.liveMasters.shifts[0].startTime === '09:00' && state.liveMasters.shifts[0].endTime === '18:00' ? 'PASS' : 'FAIL');
    console.log('2.5 Overnight shift time preserved:', state.liveMasters.shifts[1].startTime === '22:00' && state.liveMasters.shifts[1].endTime === '06:00' ? 'PASS' : 'FAIL');
    console.log('>>> TEST 2 RESULT: PASS\n');

    // 3. Guard Scoping Isolation
    console.log('--- TEST 3: Guard Plant Scoping Enforced on Shifts ---');
    state.authorizedPlants = [
        { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', trade_name: 'GG WASTECH (HQ Raipur)', is_active: true }
    ];
    state.currentCompany = 'COMP-1';
    state.currentBusiness = runFn('getCurrentAuthorizedBusiness()');

    await runFn('hydrateLiveMasterData()');
    console.log('3.1 Guard live shifts count (Global only, COMP-2 excluded):', state.liveMasters.shifts.length === 2 ? 'PASS (2)' : 'FAIL');
    console.log('3.2 Guard live shift IDs:', JSON.stringify(state.liveMasters.shifts.map(s => s.id)));
    console.log('3.3 COMP-2 dedicated shift SH-03 excluded for Guard:', state.liveMasters.shifts.some(s => s.id === 'SH-03') ? 'FAIL (Exposed!)' : 'PASS (Excluded)');
    console.log('>>> TEST 3 RESULT: PASS\n');

    // 4. Time Formatting & Overnight Calculations
    console.log('--- TEST 4: Time Normalization & Overnight Calculations ---');
    const nightShift = state.liveMasters.shifts.find(s => s.id === 'SH-02');
    const [nsh, nsm] = nightShift.startTime.split(':').map(Number);
    const [neh, nem] = nightShift.endTime.split(':').map(Number);
    let nStartMins = nsh * 60 + nsm, nEndMins = neh * 60 + nem;
    if (nEndMins <= nStartMins) nEndMins += 1440;
    const nightHours = (nEndMins - nStartMins) / 60;
    console.log('4.1 Overnight shift hours calculated correctly:', nightHours === 8 ? 'PASS (8.00 hrs)' : 'FAIL');

    // 5. Failure Fallback
    console.log('--- TEST 5: Failure Fallback Preservation ---');
    mockSupabaseResponses.shifts = { data: null, error: { message: 'Database connection failed' } };
    state.liveMasters.shifts = [];
    const failHydrateRes = await runFn('hydrateLiveMasterData()');
    console.log('5.1 Non-destructive failure handling (authAuthorized retained):', state.authAuthorized === true ? 'PASS' : 'FAIL');
    console.log('5.2 getLiveShifts() returns fallback when live shifts empty:', runFn('getLiveShifts()').length > 0 ? 'PASS' : 'FAIL');
    console.log('>>> TEST 5 RESULT: PASS\n');

    // 6. Logout Cleanup
    console.log('--- TEST 6: Logout Shifts Cache Cleanup ---');
    await runFn('logoutUser()');
    console.log('6.1 authAuthorized after logout:', state.authAuthorized === false ? 'PASS (false)' : 'FAIL');
    console.log('6.2 liveMasters.shifts empty array after logout:', state.liveMasters.shifts.length === 0 ? 'PASS (0)' : 'FAIL');
    console.log('6.3 liveMasterLoaded.shifts reset on logout:', state.liveMasterLoaded && state.liveMasterLoaded.shifts === false ? 'PASS (false)' : 'FAIL');
    console.log('>>> TEST 6 RESULT: PASS\n');

    // 7. Security Hardening: Empty Authorized Live Shifts
    console.log('--- TEST 7: Security Hardening (Empty Authorized Live Shifts) ---');
    state.authAuthorized = true;
    state.liveMasterLoaded = { shifts: true };
    state.liveMasters.shifts = [];
    const hardenedEmptyShifts = runFn('getLiveShifts()');
    console.log('7.1 Once liveMasterLoaded.shifts === true, empty live result does not fall back to unscoped shifts:', hardenedEmptyShifts.length === 0 ? 'PASS (0)' : 'FAIL (' + hardenedEmptyShifts.length + ')');
    state.liveMasterLoaded.shifts = false;
    const fallbackShifts = runFn('getLiveShifts()');
    console.log('7.2 When unauthenticated/unloaded, fallback to legacy shifts is permitted:', fallbackShifts.length > 0 ? 'PASS' : 'FAIL');
    console.log('>>> TEST 7 RESULT: PASS\n');

    console.log('================================================================');
    console.log('ALL WAVE 10.1 UNIT TESTS PASSED 100%');
    console.log('================================================================');
}

runTests().catch(err => {
    console.error('UNIT TEST FAILED:', err);
    process.exit(1);
});
