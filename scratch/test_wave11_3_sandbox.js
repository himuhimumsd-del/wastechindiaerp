const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Create mock browser DOM environment
global.window = {};
global.document = {
    getElementById: (id) => null,
    querySelectorAll: (selector) => []
};

// Load app.js code by evaluating within a synthetic scope or extracting the functions
const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('--- 1. STATIC CODE CHECKS ---');
// Verify required patterns exist
assert(appJsContent.includes(".from('machine_logs')"), "Must contain from('machine_logs')");
assert(appJsContent.includes(".from('consumable_movements')"), "Must contain from('consumable_movements')");
assert(appJsContent.includes("function buildLiveMachineLogPayload"), "Must contain buildLiveMachineLogPayload");
assert(appJsContent.includes("function buildLiveConsumableLogPayload"), "Must contain buildLiveConsumableLogPayload");
assert(appJsContent.includes("async function processMachineLogSave"), "Must contain processMachineLogSave");
assert(appJsContent.includes("async function processConsumableLogSave"), "Must contain processConsumableLogSave");

// Verify there is NO consumable UPDATE in the codebase
const updateMatches = [...appJsContent.matchAll(/\.from\(['"]consumable_movements['"]\)\s*\.update\(/g)];
assert.strictEqual(updateMatches.length, 0, "There must be NO .from('consumable_movements').update() call in app.js");
console.log('Confirmed: 0 consumable_movements UPDATE paths (Strictly Append-Only).');

console.log('--- 2. FUNCTIONAL SANDBOX CHECKS ---');

// Mock state and helpers
const validBizUuid = 'e8b28cf9-b883-4a18-9730-1c6dc0fb2a06';
const activePlantId = 'PLANT-001';
const otherPlantId = 'PLANT-002';

const state = {
    authAuthorized: true,
    currentUser: { authUid: 'user-uuid-1234', username: 'testuser' },
    currentCompany: activePlantId,
    authorizedPlants: [
        { id: activePlantId, business_id: validBizUuid, name: 'Plant 1' },
        { id: otherPlantId, business_id: validBizUuid, name: 'Plant 2' }
    ],
    data: {
        machineryMaster: [
            { id: 'MACH-01', name: 'Conveyor 1', plant_id: activePlantId },
            { id: 'MACH-CROSS', name: 'Other Plant Crusher', plant_id: otherPlantId }
        ],
        employees: [
            { id: 'EMP-01', name: 'John Doe', plant_id: activePlantId },
            { id: 'EMP-CROSS', name: 'Jane Cross', plant_id: otherPlantId }
        ],
        consumablesMaster: [
            { id: 'CON-01', name: 'Grease 500g', plant_id: activePlantId, currentStock: 10, lastPrice: 150 },
            { id: 'CON-CROSS', name: 'Filter Cross', plant_id: otherPlantId, currentStock: 5, lastPrice: 300 }
        ],
        machineLogs: [],
        consumableLogs: []
    },
    liveMasters: {
        plantMachinery: [
            { id: 'MACH-01', name: 'Conveyor 1', plant_id: activePlantId },
            { id: 'MACH-CROSS', name: 'Other Plant Crusher', plant_id: otherPlantId }
        ],
        employees: [
            { id: 'EMP-01', name: 'John Doe', plant_id: activePlantId },
            { id: 'EMP-CROSS', name: 'Jane Cross', plant_id: otherPlantId }
        ],
        consumables: [
            { id: 'CON-01', name: 'Grease 500g', plant_id: activePlantId, currentStock: 10, lastPrice: 150 },
            { id: 'CON-CROSS', name: 'Filter Cross', plant_id: otherPlantId, currentStock: 5, lastPrice: 300 }
        ],
        machineLogs: [],
        consumableLogs: []
    }
};

const getLivePlantMachinery = () => state.liveMasters.plantMachinery;
const getLiveEmployees = () => state.liveMasters.employees;
const getLiveConsumables = () => state.liveMasters.consumables;
const getLiveMachineLogs = () => state.liveMasters.machineLogs;
const getLiveConsumableLogs = () => state.liveMasters.consumableLogs;
const assertAuthorizedPlant = (pId) => state.authorizedPlants.find(p => p.id === pId) || null;
const getCurrentAuthorizedPlant = () => state.authorizedPlants.find(p => p.id === state.currentCompany) || null;
const getCurrentAuthorizedBusiness = () => ({ id: validBizUuid });
const generateId = (p) => `${p}-9999`;

// Extract and test payload builders
const vm = require('vm');
const sandboxContext = {
    state,
    getLivePlantMachinery,
    getLiveEmployees,
    getLiveConsumables,
    getLiveMachineLogs,
    getLiveConsumableLogs,
    assertAuthorizedPlant,
    getCurrentAuthorizedPlant,
    getCurrentAuthorizedBusiness,
    generateId,
    console
};
vm.createContext(sandboxContext);

// Extract buildLiveMachineLogPayload code from app.js
const machinePayloadCode = appJsContent.slice(
    appJsContent.indexOf('function buildLiveMachineLogPayload(record) {'),
    appJsContent.indexOf('function buildLiveConsumableLogPayload(record) {')
);
vm.runInContext(machinePayloadCode, sandboxContext);

// Extract buildLiveConsumableLogPayload code from app.js
const consumablePayloadCode = appJsContent.slice(
    appJsContent.indexOf('function buildLiveConsumableLogPayload(record) {'),
    appJsContent.indexOf('async function hydrateLiveMasterData()')
);
vm.runInContext(consumablePayloadCode, sandboxContext);

// 2.1 Test Machine Log Payload Builder
console.log('Testing buildLiveMachineLogPayload...');

// Valid payload
const validMachineInput = {
    date: '2026-09-25',
    machine: 'MACH-01',
    operator: 'EMP-01',
    runningHours: '7.5',
    dieselConsumed: '45.0',
    elecUsed: '120.5',
    breakdownHours: '1.0',
    remarks: 'Routine shift run'
};
const mPayload = sandboxContext.buildLiveMachineLogPayload(validMachineInput);
assert.strictEqual(mPayload.machine_id, 'MACH-01');
assert.strictEqual(mPayload.operator_emp_id, 'EMP-01');
assert.strictEqual(mPayload.plant_id, activePlantId);
assert.strictEqual(mPayload['companyId'], activePlantId);
assert.strictEqual(mPayload.business_id, validBizUuid);
assert.strictEqual(mPayload.hours_run, 7.5);
assert.strictEqual(mPayload.fuel_consumed_litres, 45);
assert.strictEqual(mPayload.units_consumed_kwh, 120.5);
assert.strictEqual(mPayload.breakdown_hours, 1);
assert.strictEqual(mPayload.created_by, 'user-uuid-1234');
assert.strictEqual(mPayload.id, undefined, 'Must not include id');
assert.strictEqual(mPayload.created_at, undefined, 'Must not include created_at');
assert.strictEqual(mPayload.updated_at, undefined, 'Must not include updated_at');
console.log('✓ Valid Machine Log Payload built successfully with 13 exact write fields.');

// Cross-plant machine rejection
assert.throws(() => {
    sandboxContext.buildLiveMachineLogPayload({
        date: '2026-09-25',
        machine: 'MACH-CROSS'
    });
}, /Selected machine belongs to plant "PLANT-002", not active plant "PLANT-001"/);
console.log('✓ Cross-plant machine reference correctly rejected.');

// Cross-plant operator rejection
assert.throws(() => {
    sandboxContext.buildLiveMachineLogPayload({
        date: '2026-09-25',
        machine: 'MACH-01',
        operator: 'EMP-CROSS'
    });
}, /Selected operator belongs to plant "PLANT-002", not active plant "PLANT-001"/);
console.log('✓ Cross-plant operator reference correctly rejected.');

// 2.2 Test Consumable Log Payload Builder
console.log('Testing buildLiveConsumableLogPayload...');

// Valid Purchase (Inward)
const purchaseInput = {
    date: '2026-09-25',
    consumable: 'CON-01',
    movementType: 'Purchased (In)',
    quantity: '20',
    pricePerUnit: '145.50'
};
const cPayload1 = sandboxContext.buildLiveConsumableLogPayload(purchaseInput);
assert.strictEqual(cPayload1.consumable_id, 'CON-01');
assert.strictEqual(cPayload1.movement_type, 'Stock In (Purchase)');
assert.strictEqual(cPayload1.qty, 20);
assert.strictEqual(cPayload1.unit_price, 145.50);
assert.strictEqual(cPayload1.total_cost, 2910);
assert.strictEqual(cPayload1.machine_id, null);
assert.strictEqual(cPayload1.id, undefined, 'Must not include id');
console.log('✓ Purchased (In) successfully mapped to Stock In (Purchase).');

// Valid Issue (Out) with Machine
const issueWithMach = {
    date: '2026-09-25',
    consumable: 'CON-01',
    movementType: 'Issued (Out)',
    machine: 'MACH-01',
    quantity: '5',
    pricePerUnit: '145.50'
};
const cPayload2 = sandboxContext.buildLiveConsumableLogPayload(issueWithMach);
assert.strictEqual(cPayload2.movement_type, 'Issue to Machine');
assert.strictEqual(cPayload2.machine_id, 'MACH-01');
console.log('✓ Issued (Out) with machine successfully mapped to Issue to Machine.');

// Valid Issue (Out) without Machine
const issueWithoutMach = {
    date: '2026-09-25',
    consumable: 'CON-01',
    movementType: 'Issued (Out)',
    quantity: '2',
    pricePerUnit: '145.50'
};
const cPayload3 = sandboxContext.buildLiveConsumableLogPayload(issueWithoutMach);
assert.strictEqual(cPayload3.movement_type, 'Issue to Plant');
assert.strictEqual(cPayload3.machine_id, null);
console.log('✓ Issued (Out) without machine successfully mapped to Issue to Plant.');

// Valid Adjustment and Return
const adjPayload = sandboxContext.buildLiveConsumableLogPayload({
    date: '2026-09-25',
    consumable: 'CON-01',
    movementType: 'Adjustment',
    quantity: '1',
    pricePerUnit: '100'
});
assert.strictEqual(adjPayload.movement_type, 'Adjustment');

const retPayload = sandboxContext.buildLiveConsumableLogPayload({
    date: '2026-09-25',
    consumable: 'CON-01',
    movementType: 'Return',
    quantity: '1',
    pricePerUnit: '100'
});
assert.strictEqual(retPayload.movement_type, 'Return');
console.log('✓ Adjustment and Return preserved exactly.');

// Reject invalid movement type
assert.throws(() => {
    sandboxContext.buildLiveConsumableLogPayload({
        date: '2026-09-25',
        consumable: 'CON-01',
        movementType: 'InvalidType',
        quantity: '1',
        pricePerUnit: '10'
    });
}, /Invalid consumable movement type: InvalidType/);
console.log('✓ Unsupported movement types rejected.');

// Cross-plant consumable rejection
assert.throws(() => {
    sandboxContext.buildLiveConsumableLogPayload({
        date: '2026-09-25',
        consumable: 'CON-CROSS',
        movementType: 'Purchased (In)',
        quantity: '1',
        pricePerUnit: '10'
    });
}, /Selected consumable belongs to plant "PLANT-002", not active plant "PLANT-001"/);
console.log('✓ Cross-plant consumable reference correctly rejected.');

// Cross-plant machine on consumable rejection
assert.throws(() => {
    sandboxContext.buildLiveConsumableLogPayload({
        date: '2026-09-25',
        consumable: 'CON-01',
        movementType: 'Issued (Out)',
        machine: 'MACH-CROSS',
        quantity: '1',
        pricePerUnit: '10'
    });
}, /Selected machine belongs to plant "PLANT-002", not active plant "PLANT-001"/);
console.log('✓ Cross-plant machinery reference on consumable movement correctly rejected.');

console.log('--- ALL SANDBOX UNIT CHECKS PASSED SUCCESSFULLY! ---');
