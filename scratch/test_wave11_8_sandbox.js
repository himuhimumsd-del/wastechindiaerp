const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=== WAVE 11.8: SUPPORTING MASTERS SANDBOX TEST SUITE ===');

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
        URL: { createObjectURL: () => 'blob:mock' }
    },
    document: mockDocument,
    console: console,
    navigator: { userAgent: 'node' },
    URL: { createObjectURL: () => 'blob:mock' },
    Blob: class { constructor() {} },
    Chart: function() { return { destroy: () => {} }; },
    setTimeout: (fn) => typeof fn === 'function' && fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    confirm: () => true
};
sandbox.window.window = sandbox.window;
sandbox.window.document = mockDocument;

const code = fs.readFileSync('frontend/app.js', 'utf8');
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

console.log('✓ app.js successfully loaded in VM sandbox.');

// Initialize state with authorized context
sandbox.window.state.authAuthorized = true;
sandbox.window.state.currentUser = { id: 'usr-1', email: 'admin@wastech.com', name: 'Admin', username: 'admin' };
sandbox.window.state.currentCompany = 'COMP-1';
sandbox.window.state.authorizedPlants = [
    { id: 'COMP-1', name: 'HQ Raipur', business_id: '11111111-1111-1111-1111-111111111111' },
    { id: 'COMP-2', name: 'Bhilai Plant', business_id: '11111111-1111-1111-1111-111111111111' }
];
sandbox.window.state.authorizedBusinesses = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'GG WASTECH' }
];

// Seed live master data for references
sandbox.window.state.liveMasters.units = [{ id: 'UNT-1', name: 'MT', is_active: true }];
sandbox.window.state.liveMasters.poTypes = [{ id: 'POT-1', name: 'Material', is_active: true }];
sandbox.window.state.liveMasters.items = [{ id: 'ITM-1', name: 'RDF', hsnCode: '3825', defaultUnitId: 'UNT-1', cgst: '2.5', sgst: '2.5', igst: '0', ugst: '0', status: 'Active' }];
sandbox.window.state.liveMasters.shifts = [{ id: 'SH-1', name: 'General Shift', plant_id: 'COMP-1', startTime: '09:00', endTime: '18:00', minHoursFullDay: 8, minHoursHalfDay: 4 }];
sandbox.window.state.liveMasters.parties = [{ id: 'PAR-1', name: 'Tata Steel', party_types: ['Client'], state: 'Chhattisgarh', gstin: '22AAAAA0000A1Z5' }];
sandbox.window.state.liveMasters.vehicles = [{ id: 'VEH-1', vehicleNo: 'CG04NF4358', party_name: 'Tata Steel', plant_id: 'COMP-1' }];
sandbox.window.state.liveMasters.plantMachinery = [{ id: 'MAC-1', name: 'Shredder 1', type: 'Shredder', fuel_type: 'Electric', status: 'Active', plant_id: 'COMP-1' }];
sandbox.window.state.liveMasters.consumables = [{ id: 'CON-1', name: 'Blade Set', category: 'Spare Part', unit_id: 'UNT-1', current_stock: 10, status: 'Active', plant_id: 'COMP-1' }];
sandbox.window.state.liveMasters.employees = [{ id: 'EMP-1', name: 'Rahul Sharma', companyId: 'COMP-1', plant_id: 'COMP-1', shiftId: 'SH-1', status: 'Active' }];

// 1. Verify buildLiveUnitPayload
const unitRes = sandbox.window.buildLiveUnitPayload({ name: 'kg', description: 'Kilogram' });
assert.strictEqual(unitRes.payload.name, 'kg');
assert.strictEqual(unitRes.payload.description, 'Kilogram');
assert.strictEqual(unitRes.payload.is_active, true);
console.log('✓ buildLiveUnitPayload passed.');

// 2. Verify buildLivePoTypePayload
const poTypeRes = sandbox.window.buildLivePoTypePayload({ name: 'Service' });
assert.strictEqual(poTypeRes.payload.name, 'Service');
assert.strictEqual(poTypeRes.payload.is_active, true);
console.log('✓ buildLivePoTypePayload passed.');

// 3. Verify buildLiveItemPayload
const itemRes = sandbox.window.buildLiveItemPayload({ name: 'PLASTIC', hsnCode: '3915', cgst: '9', sgst: '9' });
assert.strictEqual(itemRes.payload.name, 'PLASTIC');
assert.strictEqual(itemRes.payload.hsn_code, '3915');
assert.strictEqual(itemRes.payload.cgst_rate, 9);
assert.strictEqual(itemRes.payload.sgst_rate, 9);
console.log('✓ buildLiveItemPayload passed.');

// 4. Verify buildLiveShiftPayload
const shiftRes = sandbox.window.buildLiveShiftPayload({ name: 'Night Shift', startTime: '20:00', endTime: '05:00', minHoursFullDay: '8' });
assert.strictEqual(shiftRes.payload.name, 'Night Shift');
assert.strictEqual(shiftRes.payload.start_time, '20:00:00');
assert.strictEqual(shiftRes.payload.end_time, '05:00:00');
assert.strictEqual(shiftRes.payload.plant_id, sandbox.window.state.currentCompany);
console.log('✓ buildLiveShiftPayload passed.');

// 5. Verify buildLivePartyPayload
const partyRes = sandbox.window.buildLivePartyPayload({ name: 'Jindal Steel', state: 'Odisha', type: ['Supplier', 'Vendor'] });
assert.strictEqual(partyRes.payload.name, 'Jindal Steel');
assert.strictEqual(partyRes.payload.state, 'Odisha');
assert.deepStrictEqual(partyRes.payload.party_types, ['Supplier', 'Vendor']);
console.log('✓ buildLivePartyPayload passed.');

// 6. Verify buildLiveVehiclePayload
const vehRes = sandbox.window.buildLiveVehiclePayload({ vehicleNo: 'OD05AB1234', party: 'Tata Steel' });
assert.strictEqual(vehRes.payload.vehicle_no, 'OD05AB1234');
assert.strictEqual(vehRes.payload.plant_id, sandbox.window.state.currentCompany);
assert.ok(vehRes.payload.business_id);
console.log('✓ buildLiveVehiclePayload passed.');

// 7. Verify buildLiveMachineryPayload
const machRes = sandbox.window.buildLiveMachineryPayload({ name: 'Conveyor 2', type: 'Conveyor', fuelType: 'Electric' });
assert.strictEqual(machRes.payload.name, 'Conveyor 2');
assert.strictEqual(machRes.payload.type, 'Conveyor');
assert.strictEqual(machRes.payload.fuel_type, 'Electric');
assert.strictEqual(machRes.payload.plant_id, sandbox.window.state.currentCompany);
console.log('✓ buildLiveMachineryPayload passed.');

// 8. Verify buildLiveConsumablePayload
const conRes = sandbox.window.buildLiveConsumablePayload({ name: 'Grease 10kg', category: 'Consumable', unit: 'UNT-1', currentStock: '5' });
assert.strictEqual(conRes.payload.name, 'Grease 10kg');
assert.strictEqual(conRes.payload.category, 'Consumable');
assert.strictEqual(conRes.payload.unit_id, 'UNT-1');
assert.strictEqual(conRes.payload.current_stock, 5);
assert.strictEqual(conRes.payload.plant_id, sandbox.window.state.currentCompany);
console.log('✓ buildLiveConsumablePayload passed.');

// 9. Verify buildLiveEmployeePayload
const empRes = sandbox.window.buildLiveEmployeePayload({ name: 'Anita Verma', department: 'Operations', basicPay: '20000' });
assert.strictEqual(empRes.payload.name, 'Anita Verma');
assert.strictEqual(empRes.payload.department, 'Operations');
assert.strictEqual(empRes.payload.basic_pay, 20000);
assert.strictEqual(empRes.payload.plant_id, sandbox.window.state.currentCompany);
console.log('✓ buildLiveEmployeePayload passed.');

// 10. Cross-plant Shift rejection on Employee
let shiftRejected = false;
try {
    sandbox.window.state.liveMasters.shifts = [{ id: 'SH-FOREIGN', name: 'Foreign Shift', plant_id: 'COMP-FAKE-99' }];
    sandbox.window.buildLiveEmployeePayload({ name: 'Ravi', shiftId: 'SH-FOREIGN' });
} catch (err) {
    if (err.message.includes('belongs to plant "COMP-FAKE-99"')) shiftRejected = true;
}
assert.strictEqual(shiftRejected, true, 'Cross-plant shift must be rejected on Employee creation');
console.log('✓ Cross-plant shift assignment on employee correctly rejected.');

// 11. Deletion Dependency Protection Checks
sandbox.window.state.data.itemMaster = [{ id: 'ITM-1', name: 'RDF', defaultUnitId: 'UNT-1' }];
const depUnit = sandbox.window.checkMasterDeletionDependencies('unitMaster', 'UNT-1');
assert.ok(depUnit, 'UNT-1 deletion must be blocked because it is referenced');
console.log(`✓ Unit deletion dependency check passed (${depUnit}).`);

sandbox.window.state.data.trips = [{ id: 'TRIP-1', client: 'PAR-1', vehicle: 'CG04NF4358' }];
sandbox.window.state.data.partiesMaster = [{ id: 'PAR-1', name: 'Tata Steel' }];
const depParty = sandbox.window.checkMasterDeletionDependencies('partiesMaster', 'PAR-1');
assert.ok(depParty, 'PAR-1 deletion must be blocked because it is referenced in PO / Trips');
console.log(`✓ Party deletion dependency check passed (${depParty}).`);

sandbox.window.state.data.vehicleMaster = [{ id: 'VEH-1', vehicleNo: 'CG04NF4358' }];
const depVeh = sandbox.window.checkMasterDeletionDependencies('vehicleMaster', 'VEH-1');
assert.ok(depVeh, 'VEH-1 deletion must be blocked because it is referenced in Trips');
console.log(`✓ Vehicle deletion dependency check passed (${depVeh}).`);

sandbox.window.state.data.machineLogs = [{ id: 'ML-1', machine: 'MAC-1' }];
const depMach = sandbox.window.checkMasterDeletionDependencies('machineryMaster', 'MAC-1');
assert.ok(depMach, 'MAC-1 deletion must be blocked because it is referenced in Machine Logs');
console.log(`✓ Machinery deletion dependency check passed (${depMach}).`);

sandbox.window.state.data.consumableLogs = [{ id: 'CL-1', consumable: 'CON-1' }];
const depCon = sandbox.window.checkMasterDeletionDependencies('consumablesMaster', 'CON-1');
assert.ok(depCon, 'CON-1 deletion must be blocked because it is referenced in Consumable Logs');
console.log(`✓ Consumable deletion dependency check passed (${depCon}).`);

sandbox.window.state.data.attendance = [{ id: 'ATT-1', empId: 'EMP-1' }];
const depEmp = sandbox.window.checkMasterDeletionDependencies('employees', 'EMP-1');
assert.ok(depEmp, 'EMP-1 deletion must be blocked because it is referenced in Attendance');
console.log(`✓ Employee deletion dependency check passed (${depEmp}).`);

const depUnused = sandbox.window.checkMasterDeletionDependencies('unitMaster', 'UNT-UNUSED-999');
assert.strictEqual(depUnused, null, 'Unreferenced master record must return null dependencies');
console.log('✓ Unused unit deletion allowed (null dependencies).');

// 12. Special HR Safety Check: Employee without plant rejected in attendance
let unassignedAttRejected = false;
sandbox.window.state.liveMasters.employees = [{ id: 'EMP-NO-PLANT', name: 'No Plant Worker', status: 'Active' }];
try {
    sandbox.window.buildLiveAttendancePayload({
        empId: 'EMP-NO-PLANT',
        date: '2026-10-06'
    });
} catch (err) {
    if (err.message.includes('belongs to plant "Unassigned"') || err.message.includes('Cross-plant attendance is prohibited')) {
        unassignedAttRejected = true;
    }
}
assert.strictEqual(unassignedAttRejected, true, 'Employee without plant must be rejected from attendance');
console.log('✓ Special HR Safety Check: Employee without plant is strictly rejected in attendance.');

console.log('=== ALL WAVE 11.8 SANDBOX UNIT TESTS PASSED 100%! ===');
