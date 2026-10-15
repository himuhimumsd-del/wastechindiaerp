const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Set up synthetic test environment
const validBizUuid = 'e8b28cf9-b883-4a18-9730-1c6dc0fb2a06';
const activePlantId = 'PLANT-001';

const state = {
    authAuthorized: true,
    currentUser: { authUid: 'user-uuid-1234', username: 'testuser' },
    currentCompany: activePlantId,
    currentModule: 'machineLogs',
    editingId: null,
    authorizedPlants: [
        { id: activePlantId, business_id: validBizUuid, name: 'Plant 1' }
    ],
    data: {
        machineryMaster: [{ id: 'MACH-01', name: 'Conveyor 1', plant_id: activePlantId }],
        employees: [{ id: 'EMP-01', name: 'John Doe', plant_id: activePlantId }],
        consumablesMaster: [{ id: 'CON-01', name: 'Grease 500g', plant_id: activePlantId, currentStock: 10, lastPrice: 150 }],
        machineLogs: [],
        consumableLogs: []
    },
    liveMasters: {
        plantMachinery: [{ id: 'MACH-01', name: 'Conveyor 1', plant_id: activePlantId }],
        employees: [{ id: 'EMP-01', name: 'John Doe', plant_id: activePlantId }],
        consumables: [{ id: 'CON-01', name: 'Grease 500g', plant_id: activePlantId, currentStock: 10, lastPrice: 150 }],
        machineLogs: [],
        consumableLogs: []
    }
};

const domFields = {};
const mockDoc = {
    getElementById: (id) => domFields[id] || null,
    querySelectorAll: () => []
};

let toasts = [];
const showToast = (msg, type) => { toasts.push({ msg, type }); };
let closedModal = false;
const closeModal = () => { closedModal = true; };
let renderedModule = null;
const renderTableModule = (mod) => { renderedModule = mod; };
let auditLogs = [];
const logAudit = (mod, action, rec) => { auditLogs.push({ mod, action, rec }); };
const hasPerm = () => true;

// Mock Supabase client
let mockClientResponses = {
    machineInsert: { data: null, error: null },
    machineUpdate: { data: null, error: null },
    consumableInsert: { data: null, error: null }
};

const mockClient = {
    from: (table) => {
        return {
            insert: (payload) => ({
                select: () => ({
                    single: async () => {
                        if (table === 'machine_logs') {
                            if (mockClientResponses.machineInsert.error) {
                                return { data: null, error: mockClientResponses.machineInsert.error };
                            }
                            return {
                                data: Object.assign({ id: 'a1111111-1111-1111-1111-111111111111', created_at: new Date().toISOString() }, payload),
                                error: null
                            };
                        }
                        if (table === 'consumable_movements') {
                            if (mockClientResponses.consumableInsert.error) {
                                return { data: null, error: mockClientResponses.consumableInsert.error };
                            }
                            return {
                                data: Object.assign({ id: 'b2222222-2222-2222-2222-222222222222', created_at: new Date().toISOString() }, payload),
                                error: null
                            };
                        }
                    }
                })
            }),
            update: (payload) => ({
                eq: (col, val) => ({
                    select: () => ({
                        single: async () => {
                            if (table === 'machine_logs') {
                                if (mockClientResponses.machineUpdate.error) {
                                    return { data: null, error: mockClientResponses.machineUpdate.error };
                                }
                                return {
                                    data: Object.assign({ id: val, machine_id: 'MACH-01', plant_id: activePlantId, business_id: validBizUuid, "companyId": activePlantId }, payload),
                                    error: null
                                };
                            }
                        }
                    })
                })
            })
        };
    }
};

const getSupabaseClient = () => mockClient;

// Extract helpers and normalization functions from app.js
const extractFn = (startStr, endStr) => {
    const s = appJsContent.indexOf(startStr);
    const e = appJsContent.indexOf(endStr, s);
    return appJsContent.slice(s, e);
};

const sandboxContext = {
    state,
    document: mockDoc,
    showToast,
    closeModal,
    renderTableModule,
    logAudit,
    hasPerm,
    getSupabaseClient,
    getLivePlantMachinery: () => state.liveMasters.plantMachinery,
    getLiveEmployees: () => state.liveMasters.employees,
    getLiveConsumables: () => state.liveMasters.consumables,
    getLiveMachineLogs: () => state.liveMasters.machineLogs,
    getLiveConsumableLogs: () => state.liveMasters.consumableLogs,
    assertAuthorizedPlant: (pId) => state.authorizedPlants.find(p => p.id === pId) || null,
    getCurrentAuthorizedPlant: () => state.authorizedPlants.find(p => p.id === state.currentCompany) || null,
    getCurrentAuthorizedBusiness: () => ({ id: validBizUuid }),
    generateId: (p) => `${p}-1234`,
    console
};
sandboxContext.window = sandboxContext;
vm.createContext(sandboxContext);

// Load normalizers & recompute & handlers
vm.runInContext(extractFn('function normalizeLiveMachineLog(row) {', 'function normalizeLiveConsumableLog(row) {'), sandboxContext);
vm.runInContext(extractFn('function normalizeLiveConsumableLog(row) {', 'function normalizeLiveInvoice(row) {'), sandboxContext);
vm.runInContext(extractFn('function recomputeConsumableStock(consumableId) {', 'function deleteRecord(moduleKey, recordId) {'), sandboxContext);
vm.runInContext(extractFn('function buildLiveMachineLogPayload(record) {', 'function buildLiveConsumableLogPayload(record) {'), sandboxContext);
vm.runInContext(extractFn('function buildLiveConsumableLogPayload(record) {', 'async function hydrateLiveMasterData()'), sandboxContext);
vm.runInContext(extractFn('async function processMachineLogSave() {', 'async function processConsumableLogSave() {'), sandboxContext);
vm.runInContext(extractFn('async function processConsumableLogSave() {', 'function applySmartGST(moduleKey) {'), sandboxContext);

(async () => {
    console.log('--- 1. Testing processMachineLogSave() INSERT ---');
    domFields['field_date'] = { value: '2026-09-25' };
    domFields['field_machine'] = { value: 'MACH-01' };
    domFields['field_shift'] = { value: 'Day' };
    domFields['field_operator'] = { value: 'EMP-01' };
    domFields['field_runningHours'] = { value: '6.5' };
    domFields['field_dieselConsumed'] = { value: '30.0' };
    domFields['field_elecUsed'] = { value: '50.0' };
    domFields['field_remarks'] = { value: 'All good' };

    state.editingId = null;
    await sandboxContext.processMachineLogSave();

    assert.strictEqual(state.data.machineLogs.length, 1);
    assert.strictEqual(state.liveMasters.machineLogs.length, 1);
    assert.strictEqual(state.data.machineLogs[0].id, 'a1111111-1111-1111-1111-111111111111');
    assert.strictEqual(state.data.machineLogs[0].machine, 'MACH-01');
    console.log('✓ Machine Log INSERT successfully persisted, normalized, and synchronized.');

    console.log('--- 2. Testing processMachineLogSave() INSERT Failure handling ---');
    mockClientResponses.machineInsert.error = { message: 'Database constraint failed' };
    toasts = [];
    const prevCount = state.data.machineLogs.length;
    await sandboxContext.processMachineLogSave();
    assert.strictEqual(state.data.machineLogs.length, prevCount, 'State must NOT be modified on insert failure');
    assert(toasts.some(t => t.type === 'error' && t.msg.includes('Database constraint failed')), 'Error toast surfaced');
    console.log('✓ Simulated DB failure does not mutate local state and surfaces error toast.');

    mockClientResponses.machineInsert.error = null;

    console.log('--- 3. Testing processMachineLogSave() UPDATE ---');
    state.editingId = 'a1111111-1111-1111-1111-111111111111';
    domFields['field_runningHours'] = { value: '8.0' };
    domFields['field_dieselConsumed'] = { value: '38.0' };
    await sandboxContext.processMachineLogSave();

    assert.strictEqual(state.data.machineLogs.length, 1);
    assert.strictEqual(state.data.machineLogs[0].runningHours, '8.00');
    assert.strictEqual(state.data.machineLogs[0].dieselConsumed, '38.00');
    console.log('✓ Machine Log UPDATE successfully updated live record.');

    console.log('--- 4. Testing processConsumableLogSave() APPEND-ONLY Guard ---');
    state.editingId = 'b2222222-2222-2222-2222-222222222222';
    toasts = [];
    await sandboxContext.processConsumableLogSave();
    assert(toasts.some(t => t.type === 'warning' && t.msg.includes('immutable audit records and cannot be edited')), 'Edit guard warned user');
    console.log('✓ Editing consumable movement was cleanly blocked (Append-only enforced).');

    console.log('--- 5. Testing processConsumableLogSave() INSERT ---');
    state.editingId = null;
    domFields['field_date'] = { value: '2026-09-25' };
    domFields['field_consumable'] = { value: 'CON-01' };
    domFields['field_movementType'] = { value: 'Purchased (In)' };
    domFields['field_quantity'] = { value: '50' };
    domFields['field_pricePerUnit'] = { value: '160.00' };
    domFields['field_totalAmount'] = { value: '8000.00' };
    domFields['field_issuedTo'] = { value: '' };
    domFields['field_machine'] = { value: '' };
    domFields['field_remarks'] = { value: 'Stock arrival' };

    await sandboxContext.processConsumableLogSave();

    assert.strictEqual(state.data.consumableLogs.length, 1);
    assert.strictEqual(state.liveMasters.consumableLogs.length, 1);
    assert.strictEqual(state.data.consumableLogs[0].movement_type, 'Stock In (Purchase)');
    assert.strictEqual(state.liveMasters.consumables[0].currentStock, 50, 'Stock should be recomputed from logs to 50');
    console.log('✓ Consumable INSERT succeeded and stock was recomputed correctly to 50.');

    console.log('--- 6. Testing processConsumableLogSave() INSERT Failure handling ---');
    mockClientResponses.consumableInsert.error = { message: 'FK violation' };
    toasts = [];
    const prevConCount = state.data.consumableLogs.length;
    const prevStock = state.liveMasters.consumables[0].currentStock;
    await sandboxContext.processConsumableLogSave();
    assert.strictEqual(state.data.consumableLogs.length, prevConCount, 'State must NOT be modified on insert failure');
    assert.strictEqual(state.liveMasters.consumables[0].currentStock, prevStock, 'Stock must NOT be recomputed on failure');
    assert(toasts.some(t => t.type === 'error' && t.msg.includes('FK violation')), 'Error toast surfaced');
    console.log('✓ Consumable DB failure does not mutate state or stock.');

    console.log('--- ALL HANDLER TESTS PASSED! ---');
})().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
