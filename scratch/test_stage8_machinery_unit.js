const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== WAVE 9.8: PLANT MACHINERY MASTER UNIT TEST SUITE ===');

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
    'fy-badge': new MockElement('fy-badge'),
    'modal-container': new MockElement('modal-container'),
    'modal-content': new MockElement('modal-content')
};

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
    setTimeout: (fn) => typeof fn === 'function' ? fn() : null,
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

vm.createContext(sandbox);

try {
    vm.runInContext(appJsContent, sandbox);
    console.log('✔ app.js successfully evaluated without syntax errors.');
} catch (e) {
    console.error('✘ Error evaluating app.js:', e);
    process.exit(1);
}

const state = sandbox.window.state;
const hydrateLiveMasterData = sandbox.window.hydrateLiveMasterData;
const normalizeLivePlantMachinery = sandbox.window.normalizeLivePlantMachinery;
const getLivePlantMachinery = sandbox.window.getLivePlantMachinery;
const renderTableModule = sandbox.window.renderTableModule;
const logoutUser = sandbox.window.logoutUser;

// --- TEST 1: Initial state structure ---
console.log('\n--- TEST 1: Initial state structure ---');
if (state.liveMasters && Array.isArray(state.liveMasters.plantMachinery)) {
    console.log('✔ state.liveMasters.plantMachinery exists and is initialized to an array.');
} else {
    console.error('✘ state.liveMasters.plantMachinery missing or not an array:', state.liveMasters);
    process.exit(1);
}

// --- TEST 2: normalizeLivePlantMachinery ---
console.log('\n--- TEST 2: normalizeLivePlantMachinery ---');
const rawDbRow = {
    id: 'MAC-001',
    name: 'Primary Waste Shredder 50HP',
    type: 'Shredder',
    fuel_type: 'Electric',
    capacity: '5 TPH',
    status: 'Active',
    companyId: 'COMP-1',
    plant_id: 'COMP-1',
    business_id: '11111111-1111-1111-1111-111111111111'
};

const normalized = normalizeLivePlantMachinery(rawDbRow);
if (
    normalized.id === 'MAC-001' &&
    normalized.name === 'Primary Waste Shredder 50HP' &&
    normalized.type === 'Shredder' &&
    normalized.fuelType === 'Electric' &&
    normalized.capacity === '5 TPH' &&
    normalized.status === 'Active' &&
    normalized.companyId === 'COMP-1' &&
    normalized.plant_id === 'COMP-1' &&
    normalized.business_id === '11111111-1111-1111-1111-111111111111'
) {
    console.log('✔ normalizeLivePlantMachinery correctly maps DB columns to ERP UI properties including companyId.');
} else {
    console.error('✘ normalizeLivePlantMachinery returned unexpected object:', normalized);
    process.exit(1);
}

// --- TEST 3: Unauthenticated / fail-closed check ---
console.log('\n--- TEST 3: Unauthenticated / fail-closed check ---');
state.authAuthorized = false;
state.liveMasters.plantMachinery = [{ id: 'LEAKED' }];

(async () => {
    const res = await hydrateLiveMasterData();
    if (res.success === false && state.liveMasters.plantMachinery.length === 0) {
        console.log('✔ hydrateLiveMasterData fails closed when state.authAuthorized is false and resets plantMachinery.');
    } else {
        console.error('✘ Failed unauthenticated check:', res, state.liveMasters.plantMachinery);
        process.exit(1);
    }

    // --- TEST 4: Live Master Hydration with Scoping (Admin vs Guard) ---
    console.log('\n--- TEST 4: Live Master Hydration with Scoping (Admin vs Guard) ---');
    
    // Setup mock supabase client
    const mockDb = {
        businesses: [
            { id: 'b1', code: 'WST', legal_name: 'Wastech Solutions Pvt Ltd', is_active: true }
        ],
        plants: [
            { id: 'COMP-1', business_id: 'b1', plant_name: 'Headquarters Plant', is_active: true },
            { id: 'COMP-2', business_id: 'b1', plant_name: 'Regional Plant 2', is_active: true }
        ],
        units: [
            { id: 'UNT-1', name: 'MT', description: 'Metric Ton', is_active: true }
        ],
        po_types: [
            { id: 'POT-1', name: 'Raw Material', description: 'Raw Material PO', is_active: true }
        ],
        parties: [
            { id: 'PRT-1', business_id: 'b1', legal_name: 'Test Vendor', trade_name: 'Vendor A', party_types: ['Supplier'], is_active: true }
        ],
        vehicles: [
            { id: 'VEH-1', business_id: 'b1', plant_id: 'COMP-1', rc_number: 'MH-04-AB-1234', vehicle_type: 'Truck', is_active: true }
        ],
        machinery: [
            { id: 'MAC-001', business_id: 'b1', plant_id: 'COMP-1', "companyId": 'COMP-1', name: 'Primary Shredder', type: 'Shredder', fuel_type: 'Electric', capacity: '5 TPH', status: 'Active' },
            { id: 'MAC-002', business_id: 'b1', plant_id: 'COMP-1', "companyId": 'COMP-1', name: 'DG Set 125kVA', type: 'DG Set (Generator)', fuel_type: 'Diesel', capacity: '125 kVA', status: 'Active' },
            { id: 'MAC-003', business_id: 'b1', plant_id: 'COMP-2', "companyId": 'COMP-2', name: 'Secondary Baler COMP2', type: 'Baler', fuel_type: 'Electric', capacity: '10 TPH', status: 'Active' }
        ]
    };

    function createMockQuery(data) {
        let current = [...(data || [])];
        const q = {
            eq: (col, val) => {
                current = current.filter(r => r[col] === val);
                return q;
            },
            in: (col, vals) => {
                current = current.filter(r => vals.includes(r[col]));
                return q;
            },
            order: (col, opts) => {
                return Promise.resolve({ data: current, error: null });
            },
            then: (resolve) => resolve({ data: current, error: null })
        };
        return q;
    }

    sandbox.window.getSupabaseClient = () => ({
        from: (table) => ({
            select: () => createMockQuery(mockDb[table])
        })
    });

    // 4A: Admin with COMP-1 and COMP-2 access
    state.authAuthorized = true;
    state.authorizedBusinesses = [{ id: 'b1' }];
    state.authorizedPlants = [{ id: 'COMP-1' }, { id: 'COMP-2' }];
    state.currentBusiness = { id: 'b1' };
    state.currentCompany = 'COMP-1';

    const adminRes = await hydrateLiveMasterData();
    if (!adminRes.success) {
        console.error('✘ Admin live hydration failed:', adminRes);
        process.exit(1);
    }

    const adminMachinery = getLivePlantMachinery();
    if (adminMachinery.length === 3) {
        console.log(`✔ Admin hydrated all ${adminMachinery.length} machinery rows across COMP-1 and COMP-2.`);
    } else {
        console.error('✘ Unexpected machinery count for Admin:', adminMachinery.length);
        process.exit(1);
    }

    // 4B: Guard with COMP-1 ONLY access
    state.authorizedBusinesses = [{ id: 'b1' }];
    state.authorizedPlants = [{ id: 'COMP-1' }]; // No COMP-2
    state.currentCompany = 'COMP-1';

    const guardRes = await hydrateLiveMasterData();
    if (!guardRes.success) {
        console.error('✘ Guard live hydration failed:', guardRes);
        process.exit(1);
    }

    const guardMachinery = getLivePlantMachinery();
    const hasComp2 = guardMachinery.some(m => m.plant_id === 'COMP-2' || m.companyId === 'COMP-2');
    if (guardMachinery.length === 2 && !hasComp2) {
        console.log(`✔ Guard received ONLY ${guardMachinery.length} COMP-1 machines; COMP-2 machines strictly excluded.`);
    } else {
        console.error('✘ Scoping violation! Guard has access to COMP-2 machines:', guardMachinery);
        process.exit(1);
    }

    // --- TEST 5: Fallback behavior ---
    console.log('\n--- TEST 5: Fallback behavior when liveMasters empty ---');
    state.liveMasters.plantMachinery = [];
    state.data = {
        machineryMaster: [{ id: 'FALLBACK-MAC', name: 'Fallback Machine', companyId: 'COMP-1' }]
    };
    const fallback = getLivePlantMachinery();
    if (fallback.length === 1 && fallback[0].id === 'FALLBACK-MAC') {
        console.log('✔ getLivePlantMachinery safely falls back to state.data.machineryMaster when live data empty.');
    } else {
        console.error('✘ Fallback failed:', fallback);
        process.exit(1);
    }

    // Restore live data
    state.liveMasters.plantMachinery = adminMachinery;

    // --- TEST 6: Error Resilience ---
    console.log('\n--- TEST 6: Non-destructive error handling ---');
    sandbox.window.getSupabaseClient = () => ({
        from: (table) => {
            if (table === 'machinery') {
                return {
                    select: () => ({
                        in: () => ({
                            order: () => Promise.resolve({ data: null, error: { message: 'Machinery table read timeout' } })
                        })
                    })
                };
            }
            return {
                select: () => createMockQuery(mockDb[table])
            };
        }
    });

    state.authorizedPlants = [{ id: 'COMP-1' }, { id: 'COMP-2' }];
    const errRes = await hydrateLiveMasterData();
    if (state.authAuthorized === true && Array.isArray(state.liveMasters.plantMachinery)) {
        console.log('✔ Non-destructive error handling: query failure does NOT sign user out or corrupt auth.');
    } else {
        console.error('✘ Error handling compromised state:', errRes);
        process.exit(1);
    }

    // --- TEST 7: Logout Clears Plant Machinery ---
    console.log('\n--- TEST 7: Logout Clears Plant Machinery ---');
    state.liveMasters.plantMachinery = [{ id: 'MAC-TO-BE-CLEARED' }];
    logoutUser();
    if (state.liveMasters.plantMachinery && state.liveMasters.plantMachinery.length === 0) {
        console.log('✔ logoutUser completely resets state.liveMasters.plantMachinery to [].');
    } else {
        console.error('✘ Logout did not clear plantMachinery:', state.liveMasters.plantMachinery);
        process.exit(1);
    }

    console.log('\n=============================================');
    console.log('ALL WAVE 9.8 UNIT TESTS PASSED SUCCESSFULLY');
    console.log('=============================================');
})();
