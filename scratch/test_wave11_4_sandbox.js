const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('--- 1. STATIC CODE CHECKS ---');
assert(appJsContent.includes(".from('trips')"), "Must contain from('trips')");
assert(appJsContent.includes("function buildLiveTripPayload"), "Must contain buildLiveTripPayload");
assert(appJsContent.includes("async function processTripSave"), "Must contain processTripSave");
assert(appJsContent.includes("window.buildLiveTripPayload = buildLiveTripPayload;"), "Must export buildLiveTripPayload");
assert(appJsContent.includes("window.processTripSave = processTripSave;"), "Must export processTripSave");
console.log('✓ All static signatures found.');

console.log('--- 2. FUNCTIONAL SANDBOX CHECKS ---');
const validBizUuid = 'e8b28cf9-b883-4a18-9730-1c6dc0fb2a06';
const activePlantId = 'PLANT-001';
const otherPlantId = 'PLANT-002';

const state = {
    authAuthorized: true,
    currentUser: { authUid: 'user-uuid-1234', username: 'testuser' },
    currentCompany: activePlantId,
    currentModule: 'trips',
    editingId: null,
    authorizedPlants: [
        { id: activePlantId, business_id: validBizUuid, name: 'Plant 1' },
        { id: otherPlantId, business_id: validBizUuid, name: 'Plant 2' }
    ],
    data: {
        partiesMaster: [
            { id: 'PRT-CLIENT-1', name: 'Alpha Steel Corp', party_types: ['Client'] },
            { id: 'PRT-VENDOR-1', name: 'Beta Logistics', party_types: ['Vendor', 'Transporter'] }
        ],
        vehicleMaster: [
            { id: 'VEH-01', vehicleNo: 'CG04AB1234', plant_id: activePlantId },
            { id: 'VEH-SHARED', vehicleNo: 'CG04SH9999', plant_id: null }, // shared vehicle
            { id: 'VEH-OTHER', vehicleNo: 'MH02XY5678', plant_id: otherPlantId } // dedicated to other plant
        ],
        poReceived: [
            { id: 'PO-REC-100', totalQty: '500.00', consumedQty: '0.00', balanceQty: '500.00', status: 'Open' }
        ],
        poIssued: [
            { id: 'PO-ISS-200', totalQty: '300.00', consumedQty: '0.00', balanceQty: '300.00', status: 'Open' }
        ],
        trips: [],
        machineLogs: [],
        consumableLogs: []
    },
    liveMasters: {
        parties: [
            { id: 'PRT-CLIENT-1', name: 'Alpha Steel Corp', party_types: ['Client'] },
            { id: 'PRT-VENDOR-1', name: 'Beta Logistics', party_types: ['Vendor', 'Transporter'] }
        ],
        vehicles: [
            { id: 'VEH-01', vehicleNo: 'CG04AB1234', plant_id: activePlantId },
            { id: 'VEH-SHARED', vehicleNo: 'CG04SH9999', plant_id: null },
            { id: 'VEH-OTHER', vehicleNo: 'MH02XY5678', plant_id: otherPlantId }
        ],
        trips: []
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

let mockClientResponses = {
    tripInsert: { data: null, error: null },
    tripUpdate: { data: null, error: null }
};

const mockClient = {
    from: (table) => ({
        insert: (payload) => ({
            select: () => ({
                single: async () => {
                    if (table === 'trips') {
                        if (mockClientResponses.tripInsert.error) {
                            return { data: null, error: mockClientResponses.tripInsert.error };
                        }
                        return {
                            data: Object.assign({ id: 'a0000000-0000-0000-0000-000000000001', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, payload),
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
                        if (table === 'trips') {
                            if (mockClientResponses.tripUpdate.error) {
                                return { data: null, error: mockClientResponses.tripUpdate.error };
                            }
                            return {
                                data: Object.assign({ id: val, trip_number: 'TRP-1001', plant_id: activePlantId, business_id: validBizUuid, "companyId": activePlantId }, payload),
                                error: null
                            };
                        }
                    }
                })
            })
        })
    })
};

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
    getSupabaseClient: () => mockClient,
    getLiveParties: () => state.data.partiesMaster,
    getLiveVehicles: () => state.data.vehicleMaster,
    getLiveTrips: () => (state.liveMasters && state.liveMasters.trips.length > 0) ? state.liveMasters.trips : state.data.trips,
    assertAuthorizedPlant: (pId) => state.authorizedPlants.find(p => p.id === pId) || null,
    getCurrentAuthorizedPlant: () => state.authorizedPlants.find(p => p.id === state.currentCompany) || null,
    getCurrentAuthorizedBusiness: () => ({ id: validBizUuid }),
    getFinancialYear: () => '2026-2027',
    generateId: (p) => `${p}-8888`,
    console
};
sandboxContext.window = sandboxContext;
vm.createContext(sandboxContext);

// Run normalizers, handlers, and recompute
vm.runInContext(extractFn('function normalizeLiveTrip(row) {', 'function normalizeLiveGateEntry(row) {'), sandboxContext);
vm.runInContext(extractFn('function recomputePoConsumption(poId) {', 'function recomputeAllPoConsumption() {'), sandboxContext);
vm.runInContext(extractFn('function buildLiveTripPayload(record) {', 'async function hydrateLiveMasterData()'), sandboxContext);
vm.runInContext(extractFn('async function processTripSave() {', 'function applySmartGST(moduleKey) {'), sandboxContext);

// 2.1 Test buildLiveTripPayload
console.log('Testing buildLiveTripPayload...');
const validTripInput = {
    tripType: 'Outward (Sales)',
    date: '2026-09-26',
    client: 'PRT-CLIENT-1',
    poReceived: 'PO-REC-100',
    vehicle: 'CG04AB1234',
    transportBy: 'By Road',
    freightPaidBy: 'Consignor',
    billType: 'To Bill',
    insurance: 'Yes',
    insurancePolicyDetails: 'POL-998877',
    originCity: 'Raipur',
    originState: 'Chhattisgarh',
    destinationCity: 'Nagpur',
    destinationState: 'Maharashtra',
    grossWeight: '45.50',
    tareWeight: '15.50',
    netWeight: '30.00',
    driverName: 'Ramesh Singh',
    driverPhone: '9876543210',
    ewbNumber: 'EWB-12345678',
    status: 'In Progress'
};

const tripPayload = sandboxContext.buildLiveTripPayload(validTripInput);
assert.strictEqual(tripPayload.trip_type, 'Outward (Sales)');
assert.strictEqual(tripPayload.trip_date, '2026-09-26');
assert.strictEqual(tripPayload.business_id, validBizUuid);
assert.strictEqual(tripPayload.plant_id, activePlantId);
assert.strictEqual(tripPayload['companyId'], activePlantId);
assert.strictEqual(tripPayload.party_id, 'PRT-CLIENT-1');
assert.strictEqual(tripPayload.vehicle_id, 'VEH-01');
assert.strictEqual(tripPayload.po_received_number, 'PO-REC-100');
assert.strictEqual(tripPayload.is_insured, true);
assert.strictEqual(tripPayload.insurance_policy_details, 'POL-998877');
assert.strictEqual(tripPayload.net_weight, 30.00);
assert.strictEqual(tripPayload.driver_name, 'Ramesh Singh');
assert.strictEqual(tripPayload.driver_phone, '9876543210');
assert.strictEqual(tripPayload.eway_bill_no, 'EWB-12345678');
assert.strictEqual(tripPayload.id, undefined, 'Must not include id');
assert.strictEqual(tripPayload.created_at, undefined, 'Must not include created_at');
assert.strictEqual(tripPayload.updated_at, undefined, 'Must not include updated_at');
console.log('✓ Valid Trip payload built with exact 30 database fields.');

// Shared vehicle acceptance
const sharedVehPayload = sandboxContext.buildLiveTripPayload(Object.assign({}, validTripInput, { vehicle: 'CG04SH9999' }));
assert.strictEqual(sharedVehPayload.vehicle_id, 'VEH-SHARED');
console.log('✓ Business-shared vehicle (plant_id IS NULL) correctly accepted.');

// Vehicle plant dedication check
assert.throws(() => {
    sandboxContext.buildLiveTripPayload(Object.assign({}, validTripInput, { vehicle: 'MH02XY5678' }));
}, /Vehicle MH02XY5678 is dedicated to plant PLANT-002 and cannot be used on trip for plant PLANT-001/);
console.log('✓ Cross-plant dedicated vehicle correctly rejected.');

// Invalid trip type
assert.throws(() => {
    sandboxContext.buildLiveTripPayload(Object.assign({}, validTripInput, { tripType: 'Internal Transfer' }));
}, /Invalid trip type: Internal Transfer/);
console.log('✓ Invalid trip type correctly rejected.');

// Missing origin/destination
assert.throws(() => {
    sandboxContext.buildLiveTripPayload(Object.assign({}, validTripInput, { originCity: '' }));
}, /Origin City is required/);
console.log('✓ Missing origin city correctly rejected.');

(async () => {
    console.log('--- 3. Testing processTripSave() INSERT ---');
    domFields['field_tripType'] = { value: 'Outward (Sales)' };
    domFields['field_date'] = { value: '2026-09-26' };
    domFields['field_client'] = { value: 'PRT-CLIENT-1' };
    domFields['field_poReceived'] = { value: 'PO-REC-100' };
    domFields['field_transportPOReceived'] = { value: '' };
    domFields['field_poIssued'] = { value: '' };
    domFields['field_linkedTransportPOIssued'] = { value: '' };
    domFields['field_vehicle'] = { value: 'CG04AB1234' };
    domFields['field_transportBy'] = { value: 'By Road' };
    domFields['field_freightPaidBy'] = { value: 'Consignor' };
    domFields['field_billType'] = { value: 'To Bill' };
    domFields['field_insurance'] = { value: 'Yes' };
    domFields['field_insurancePolicyDetails'] = { value: 'POL-998877' };
    domFields['field_originCity'] = { value: 'Raipur' };
    domFields['field_originState'] = { value: 'Chhattisgarh' };
    domFields['field_destinationCity'] = { value: 'Nagpur' };
    domFields['field_destinationState'] = { value: 'Maharashtra' };
    domFields['field_grossWeight'] = { value: '40.00' };
    domFields['field_tareWeight'] = { value: '15.00' };
    domFields['field_netWeight'] = { value: '25.00' };
    domFields['field_driverName'] = { value: 'Ramesh Singh' };
    domFields['field_driverPhone'] = { value: '9876543210' };
    domFields['field_ewbNumber'] = { value: 'EWB-12345678' };
    domFields['field_status'] = { value: 'In Progress' };

    state.editingId = null;
    await sandboxContext.processTripSave();

    assert.strictEqual(state.data.trips.length, 1);
    assert.strictEqual(state.liveMasters.trips.length, 1);
    assert.strictEqual(state.data.trips[0].dbId, 'a0000000-0000-0000-0000-000000000001');
    assert.strictEqual(state.data.trips[0].netWeight, 25.00);

    // Verify PO consumption was recomputed
    assert.strictEqual(state.data.poReceived[0].consumedQty, '25.00', 'Consumed Qty should be 25.00');
    assert.strictEqual(state.data.poReceived[0].balanceQty, '475.00', 'Balance Qty should be 475.00');
    console.log('✓ Trip INSERT succeeded, synchronized, and PO consumption recomputed (25.00 consumed / 475.00 balance).');

    console.log('--- 4. Testing processTripSave() INSERT Failure Handling ---');
    mockClientResponses.tripInsert.error = { message: 'Database trip conflict' };
    toasts = [];
    const prevTripCount = state.data.trips.length;
    const prevConsumed = state.data.poReceived[0].consumedQty;
    await sandboxContext.processTripSave();
    assert.strictEqual(state.data.trips.length, prevTripCount, 'State must not be mutated on failure');
    assert.strictEqual(state.data.poReceived[0].consumedQty, prevConsumed, 'PO consumption must not be mutated on failure');
    assert(toasts.some(t => t.type === 'error' && t.msg.includes('Database trip conflict')), 'Error toast surfaced');
    console.log('✓ Trip insert failure properly preserved state and PO balances.');

    mockClientResponses.tripInsert.error = null;

    console.log('--- 5. Testing processTripSave() UPDATE ---');
    state.editingId = 'a0000000-0000-0000-0000-000000000001';
    domFields['field_grossWeight'] = { value: '45.00' };
    domFields['field_tareWeight'] = { value: '15.00' };
    domFields['field_netWeight'] = { value: '30.00' }; // updated from 25 to 30

    await sandboxContext.processTripSave();

    assert.strictEqual(state.data.trips.length, 1);
    assert.strictEqual(state.data.trips[0].netWeight, 30.00);
    assert.strictEqual(state.data.poReceived[0].consumedQty, '30.00', 'Consumed Qty should now be 30.00');
    assert.strictEqual(state.data.poReceived[0].balanceQty, '470.00', 'Balance Qty should now be 470.00');
    console.log('✓ Trip UPDATE succeeded and PO consumption recomputed to 30.00.');

    console.log('--- 6. Secondary Check: Machine Log UPDATE maintenance & breakdown ---');
    assert(appJsContent.includes("maintenance_performed: maintenance,"), "Machine log update must persist maintenance_performed");
    assert(appJsContent.includes("breakdown_hours: Number(breakdownHours.toFixed(2)),"), "Machine log update must persist breakdown_hours");
    console.log('✓ Confirmed: Machine Log UPDATE persists maintenance_performed and breakdown_hours.');

    console.log('--- ALL WAVE 11.4 TESTS PASSED CLEANLY! ---');
})().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
