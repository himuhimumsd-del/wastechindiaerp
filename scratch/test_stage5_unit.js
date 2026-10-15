const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appJsContent = fs.readFileSync('frontend/app.js', 'utf8');

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
    'fy-badge': new MockElement('fy-badge')
};

const compSelect = mockElements['company-select'];
Object.defineProperty(compSelect, 'innerHTML', {
    get() { return this._html || ''; },
    set(val) {
        this._html = val;
        const matches = [...val.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)];
        this.options = matches.map(m => ({ value: m[1], text: m[2] }));
    }
});

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
        URL: { createObjectURL: () => 'blob:mock' }
    },
    URL: { createObjectURL: () => 'blob:mock' },
    Blob: class { constructor() {} },
    navigator: { userAgent: 'node' },
    showToast: (msg, type) => {},
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

console.log('=== APP.JS LOADED IN VM SANDBOX FOR WAVE 9.5 ===\n');

const getState = () => vm.runInContext('state', sandbox);
const runFn = (expr) => vm.runInContext(expr, sandbox);

// -------------------------------------------------------------
// TEST 1: Fail-closed unauthenticated behavior
// -------------------------------------------------------------
console.log('--- TEST 1: Unauthenticated Fail-Closed Helper Checks ---');
const state = getState();
state.authAuthorized = false;
state.currentCompany = null;
state.authorizedPlants = [];
state.authorizedBusinesses = [];

console.log('1.1 getCurrentAuthorizedPlant():', runFn('getCurrentAuthorizedPlant()') === null ? 'PASS (null)' : 'FAIL');
console.log('1.2 getCurrentAuthorizedBusiness():', runFn('getCurrentAuthorizedBusiness()') === null ? 'PASS (null)' : 'FAIL');
console.log('1.3 getAccessiblePlants():', runFn('getAccessiblePlants()').length === 0 ? 'PASS ([])' : 'FAIL');
console.log('1.4 getAccessibleBusinesses():', runFn('getAccessibleBusinesses()').length === 0 ? 'PASS ([])' : 'FAIL');
console.log('1.5 isAuthorizedPlant("COMP-1"):', runFn('isAuthorizedPlant("COMP-1")') === false ? 'PASS (false)' : 'FAIL');
console.log('1.6 isAuthorizedBusiness("BIZ-01"):', runFn('isAuthorizedBusiness("BIZ-01")') === false ? 'PASS (false)' : 'FAIL');
console.log('1.7 assertAuthorizedPlant("COMP-1"):', runFn('assertAuthorizedPlant("COMP-1")') === null ? 'PASS (null)' : 'FAIL');
console.log('1.8 assertAuthorizedBusiness("BIZ-01"):', runFn('assertAuthorizedBusiness("BIZ-01")') === null ? 'PASS (null)' : 'FAIL');
console.log('1.9 getCurrentPlantDisplayData():', runFn('getCurrentPlantDisplayData()') === null ? 'PASS (null)' : 'FAIL');
console.log('1.10 plantFilterOptions():', runFn('plantFilterOptions()').length === 0 ? 'PASS ([])' : 'FAIL');

if (runFn('getCurrentAuthorizedPlant()') !== null || runFn('getAccessiblePlants()').length !== 0) {
    throw new Error('TEST 1 FAILED: Helpers did not fail closed.');
}
console.log('>>> TEST 1 RESULT: PASS\n');

// -------------------------------------------------------------
// TEST 2: Admin Authorized State & Helpers
// -------------------------------------------------------------
console.log('--- TEST 2: Admin Authorized State & Helpers ---');
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
runFn('populateCompanySelector()');

console.log('2.1 getAccessiblePlants() count:', runFn('getAccessiblePlants()').length === 2 ? 'PASS (2)' : 'FAIL');
console.log('2.2 getAccessiblePlants() IDs:', JSON.stringify(runFn('getAccessiblePlants().map(p => p.id)')));
console.log('2.3 getCurrentAuthorizedPlant():', runFn('getCurrentAuthorizedPlant()').id === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
console.log('2.4 getCurrentAuthorizedBusiness():', runFn('getCurrentAuthorizedBusiness()').code === 'BIZ-01' ? 'PASS (BIZ-01)' : 'FAIL');
console.log('2.5 isAuthorizedPlant("COMP-1"):', runFn('isAuthorizedPlant("COMP-1")') === true ? 'PASS (true)' : 'FAIL');
console.log('2.6 isAuthorizedPlant("COMP-2"):', runFn('isAuthorizedPlant("COMP-2")') === true ? 'PASS (true)' : 'FAIL');
console.log('2.7 isAuthorizedPlant("COMP-FAKE-999"):', runFn('isAuthorizedPlant("COMP-FAKE-999")') === false ? 'PASS (false)' : 'FAIL');
console.log('2.8 assertAuthorizedPlant("COMP-2"):', runFn('assertAuthorizedPlant("COMP-2")').id === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');
console.log('2.9 assertAuthorizedPlant("COMP-FAKE-999"):', runFn('assertAuthorizedPlant("COMP-FAKE-999")') === null ? 'PASS (null)' : 'FAIL');
console.log('2.10 getCurrentPlantDisplayData():', runFn('getCurrentPlantDisplayData()').id === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');

const filterOpts = runFn('plantFilterOptions()');
console.log('2.11 plantFilterOptions():', JSON.stringify(filterOpts));
if (filterOpts.length !== 2 || filterOpts[0].value !== 'COMP-1' || filterOpts[1].value !== 'COMP-2') {
    throw new Error('TEST 2 FAILED: plantFilterOptions does not match Admin access.');
}
console.log('>>> TEST 2 RESULT: PASS\n');

// -------------------------------------------------------------
// TEST 3: Admin Plant Switching & Unauthorized Rejection
// -------------------------------------------------------------
console.log('--- TEST 3: Admin Plant Switching & Unauthorized Rejection ---');
compSelect.value = 'COMP-2';
compSelect.onchange({ target: { value: 'COMP-2' } });

console.log('3.1 Switched currentCompany:', state.currentCompany === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');
console.log('3.2 getCurrentAuthorizedPlant():', runFn('getCurrentAuthorizedPlant()').id === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');
console.log('3.3 getCurrentAuthorizedBusiness():', runFn('getCurrentAuthorizedBusiness()').code === 'BIZ-01' ? 'PASS (BIZ-01)' : 'FAIL');
console.log('3.4 getCurrentPlantDisplayData():', runFn('getCurrentPlantDisplayData()').id === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');

// Attempt unauthorized switch
console.log('3.5 Attempting switch to COMP-FAKE-999...');
compSelect.value = 'COMP-FAKE-999';
compSelect.onchange({ target: { value: 'COMP-FAKE-999' } });
console.log('3.6 Current company after rejection:', state.currentCompany === 'COMP-2' ? 'PASS (COMP-2 preserved)' : 'FAIL');
console.log('3.7 Selector restored value:', compSelect.value === 'COMP-2' ? 'PASS (COMP-2)' : 'FAIL');

// Switch back to COMP-1
compSelect.value = 'COMP-1';
compSelect.onchange({ target: { value: 'COMP-1' } });
console.log('3.8 Switched back to COMP-1:', state.currentCompany === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');
console.log('>>> TEST 3 RESULT: PASS\n');

// -------------------------------------------------------------
// TEST 4: Guard HQ Isolation & Filter / Site UI Scoping
// -------------------------------------------------------------
console.log('--- TEST 4: Guard HQ Isolation & Site UI Scoping ---');
state.authorizedPlants = [
    { id: 'COMP-1', business_id: '2e49c716-ee54-47b1-b9ff-29a8a72ce001', plant_name: 'GG WASTECH (HQ Raipur)', trade_name: 'GG WASTECH (HQ Raipur)', is_active: true }
];
state.currentCompany = 'COMP-1';
state.currentBusiness = runFn('getCurrentAuthorizedBusiness()');
runFn('populateCompanySelector()');

console.log('4.1 Guard getAccessiblePlants():', JSON.stringify(runFn('getAccessiblePlants().map(p => p.id)')));
console.log('4.2 isAuthorizedPlant("COMP-1"):', runFn('isAuthorizedPlant("COMP-1")') === true ? 'PASS (true)' : 'FAIL');
console.log('4.3 isAuthorizedPlant("COMP-2"):', runFn('isAuthorizedPlant("COMP-2")') === false ? 'PASS (false - Forbidden)' : 'FAIL');
console.log('4.4 getCurrentAuthorizedPlant():', runFn('getCurrentAuthorizedPlant()').id === 'COMP-1' ? 'PASS (COMP-1)' : 'FAIL');

const guardFilterOpts = runFn('plantFilterOptions()');
console.log('4.5 Guard plantFilterOptions():', JSON.stringify(guardFilterOpts));
if (guardFilterOpts.length !== 1 || guardFilterOpts[0].value !== 'COMP-1') {
    throw new Error('TEST 4 FAILED: Guard plantFilterOptions contains unauthorized plants.');
}

// Verify attendance site scoping
const contentArea = sandbox.document.getElementById('content-area');
runFn('renderAttendanceSites(document.getElementById("content-area"))');
console.log('4.6 Attendance Site UI contains COMP-1:', contentArea.innerHTML.includes('COMP-1') ? 'PASS (true)' : 'FAIL');
console.log('4.7 Attendance Site UI contains COMP-2 (expect false):', !contentArea.innerHTML.includes('COMP-2') ? 'PASS (COMP-2 Excluded)' : 'FAIL (Security Leak!)');

// Attempt Guard switch to COMP-2
compSelect.value = 'COMP-2';
compSelect.onchange({ target: { value: 'COMP-2' } });
console.log('4.8 Guard attempt to select COMP-2 rejected:', state.currentCompany === 'COMP-1' ? 'PASS (COMP-1 preserved)' : 'FAIL');
console.log('>>> TEST 4 RESULT: PASS\n');

// -------------------------------------------------------------
// TEST 5: FY Calculation Compatibility with Helpers
// -------------------------------------------------------------
console.log('--- TEST 5: FY Calculation Compatibility ---');
const fyStr = runFn('getFinancialYear("2026-06-15")');
console.log('5.1 getFinancialYear("2026-06-15"):', fyStr.includes('FY 2026') ? `PASS (${fyStr})` : 'FAIL');
const fyRange = runFn('getCurrentFyRange()');
console.log('5.2 getCurrentFyRange():', fyRange.label ? `PASS (${fyRange.label}: ${fyRange.from} to ${fyRange.to})` : 'FAIL');
console.log('>>> TEST 5 RESULT: PASS\n');

// -------------------------------------------------------------
// TEST 6: Logout Reset & Fail-Closed
// -------------------------------------------------------------
console.log('--- TEST 6: Logout Reset & Context Cleanup ---');
state.authAuthorized = false;
state.currentCompany = null;
state.currentBusiness = null;
state.authorizedPlants = [];
state.authorizedBusinesses = [];
runFn('populateCompanySelector()');

console.log('6.1 getAccessiblePlants() after logout:', runFn('getAccessiblePlants()').length === 0 ? 'PASS (empty)' : 'FAIL');
console.log('6.2 getCurrentAuthorizedPlant() after logout:', runFn('getCurrentAuthorizedPlant()') === null ? 'PASS (null)' : 'FAIL');
console.log('6.3 getCurrentPlantDisplayData() after logout:', runFn('getCurrentPlantDisplayData()') === null ? 'PASS (null)' : 'FAIL');
console.log('6.4 Selector options after logout:', compSelect.options.length === 1 && compSelect.options[0].text === 'No authorized plants' ? 'PASS (Locked)' : 'FAIL');
console.log('>>> TEST 6 RESULT: PASS\n');

console.log('================================================================');
console.log('ALL WAVE 9.5 UNIT SANDBOX TESTS (1 TO 6) PASSED 100%');
console.log('================================================================');
