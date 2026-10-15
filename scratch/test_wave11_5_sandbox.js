const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('--- 1. STATIC PATTERN CHECKS ---');
assert(appJsContent.includes(".from('orders')"), "Must contain from('orders')");
assert(appJsContent.includes(".from('grn')"), "Must contain from('grn')");
assert(appJsContent.includes(".from('grn_items')"), "Must contain from('grn_items')");
assert(appJsContent.includes("function buildLiveOrderPayload"), "Must contain buildLiveOrderPayload");
assert(appJsContent.includes("function buildLiveGrnPayload"), "Must contain buildLiveGrnPayload");
assert(appJsContent.includes("function normalizeLiveOrder"), "Must contain normalizeLiveOrder");
assert(appJsContent.includes("function normalizeLiveGrn"), "Must contain normalizeLiveGrn");
assert(appJsContent.includes("async function processOrderSave"), "Must contain processOrderSave");
assert(appJsContent.includes("async function processGrnSave"), "Must contain processGrnSave");
console.log('✓ All required function declarations and table references present.');

console.log('\n--- 2. FUNCTIONAL SANDBOX EXECUTION ---');
const validBizUuid = '11111111-1111-1111-1111-111111111111';
const activePlantId = '22222222-2222-2222-2222-222222222222';
const otherPlantId = '99999999-9999-9999-9999-999999999999';

const state = {
    authAuthorized: true,
    currentUser: { authUid: 'user-uuid-1234', username: 'testuser' },
    currentCompany: activePlantId,
    activePlantId: activePlantId,
    activeBusinessId: validBizUuid,
    authorizedPlants: [
        { id: activePlantId, business_id: validBizUuid, name: 'Plant 1' },
        { id: otherPlantId, business_id: validBizUuid, name: 'Plant 2' }
    ],
    data: {
        poReceived: [],
        poIssued: [],
        grn: [],
        parties: [
            { id: '33333333-3333-3333-3333-333333333333', name: 'Acme Corp', party_name: 'Acme Corp', business_id: validBizUuid, plant_id: activePlantId },
            { id: '33333333-3333-3333-3333-333333333334', name: 'Cross Corp', party_name: 'Cross Corp', business_id: validBizUuid, plant_id: otherPlantId }
        ],
        items: [
            { id: '44444444-4444-4444-4444-444444444444', item_name: 'Solid Waste Material', name: 'Solid Waste Material', business_id: validBizUuid, plant_id: activePlantId },
            { id: '44444444-4444-4444-4444-444444444445', item_name: 'Cross Waste', name: 'Cross Waste', business_id: validBizUuid, plant_id: otherPlantId }
        ],
        units: [
            { id: '55555555-5555-5555-5555-555555555555', unit_name: 'MT', business_id: validBizUuid }
        ],
        trips: [
            { id: '77777777-7777-7777-7777-777777777777', trip_number: 'TRIP-9901', plant_id: activePlantId, business_id: validBizUuid },
            { id: '88888888-8888-8888-8888-888888888888', trip_number: 'TRIP-9902', plant_id: activePlantId, business_id: validBizUuid },
            { id: '77777777-7777-7777-7777-777777777779', trip_number: 'TRIP-CROSS', plant_id: otherPlantId, business_id: validBizUuid }
        ]
    },
    liveMasters: {
        parties: [
            { id: '33333333-3333-3333-3333-333333333333', name: 'Acme Corp', party_name: 'Acme Corp', business_id: validBizUuid, plant_id: activePlantId },
            { id: '33333333-3333-3333-3333-333333333334', name: 'Cross Corp', party_name: 'Cross Corp', business_id: validBizUuid, plant_id: otherPlantId }
        ],
        items: [
            { id: '44444444-4444-4444-4444-444444444444', item_name: 'Solid Waste Material', name: 'Solid Waste Material', business_id: validBizUuid, plant_id: activePlantId },
            { id: '44444444-4444-4444-4444-444444444445', item_name: 'Cross Waste', name: 'Cross Waste', business_id: validBizUuid, plant_id: otherPlantId }
        ],
        units: [
            { id: '55555555-5555-5555-5555-555555555555', unit_name: 'MT', business_id: validBizUuid }
        ],
        trips: [
            { id: '77777777-7777-7777-7777-777777777777', trip_number: 'TRIP-9901', plant_id: activePlantId, business_id: validBizUuid },
            { id: '88888888-8888-8888-8888-888888888888', trip_number: 'TRIP-9902', plant_id: activePlantId, business_id: validBizUuid },
            { id: '77777777-7777-7777-7777-777777777779', trip_number: 'TRIP-CROSS', plant_id: otherPlantId, business_id: validBizUuid }
        ],
        orders: [
            { id: '66666666-6666-6666-6666-666666666666', order_number: 'PO-ISS-002', order_type: 'issued', plant_id: activePlantId, business_id: validBizUuid }
        ]
    }
};

const assertAuthorizedPlant = (pId) => state.authorizedPlants.find(p => p.id === pId) || null;
const getCurrentAuthorizedPlant = () => state.authorizedPlants.find(p => p.id === state.currentCompany) || null;
const getCurrentAuthorizedBusiness = () => ({ id: validBizUuid });
const getLiveParties = () => state.liveMasters.parties;
const getLiveItems = () => state.liveMasters.items;
const getLiveUnits = () => state.liveMasters.units;

const sandboxContext = {
    window: {},
    state,
    assertAuthorizedPlant,
    getCurrentAuthorizedPlant,
    getCurrentAuthorizedBusiness,
    getLiveParties,
    getLiveItems,
    getLiveUnits,
    console
};
vm.createContext(sandboxContext);

// Extract the Wave 11.5 normalizers and payload builders
const startMarker = 'function normalizeLiveOrder(row) {';
const endMarker = 'async function hydrateLiveMasterData()';
const codeToRun = appJsContent.slice(
    appJsContent.indexOf(startMarker),
    appJsContent.indexOf(endMarker)
);

vm.runInContext(codeToRun, sandboxContext);

// TEST 2.1: buildLiveOrderPayload (poReceived)
console.log('Testing buildLiveOrderPayload (poReceived)...');
const poRecRecord = {
    order_number: 'PO-REC-001',
    order_date: '2026-09-20',
    party_id: '33333333-3333-3333-3333-333333333333',
    item_id: '44444444-4444-4444-4444-444444444444',
    item_description: 'Solid Waste Material',
    item_qty: 100,
    unit_id: '55555555-5555-5555-5555-555555555555',
    item_rate: 1500,
    hsn_code: '3825',
    payment_terms_days: 30,
    status: 'ACTIVE'
};
const poRecPayload = sandboxContext.buildLiveOrderPayload(poRecRecord, 'received');
assert.strictEqual(poRecPayload.order_type, 'received');
assert.strictEqual(poRecPayload.po_number, 'PO-REC-001');
assert.strictEqual(poRecPayload.business_id, validBizUuid);
assert.strictEqual(poRecPayload.plant_id, activePlantId);
assert.strictEqual(poRecPayload['companyId'], activePlantId);
assert.strictEqual(poRecPayload.party_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(poRecPayload.item_id, '44444444-4444-4444-4444-444444444444');
assert.strictEqual(poRecPayload.unit_id, '55555555-5555-5555-5555-555555555555');
assert.strictEqual(poRecPayload.item_qty, 100);
assert.strictEqual(poRecPayload.total_qty, 100);
assert.strictEqual(poRecPayload.item_rate, 1500);
assert.strictEqual(poRecPayload.payment_terms_days, 30);
assert.strictEqual(poRecPayload.id, undefined, 'Must not include id');
assert.strictEqual(poRecPayload.created_at, undefined, 'Must not include created_at');
console.log('✓ buildLiveOrderPayload (poReceived) passed with exact columns');

// TEST 2.2: Cross-plant Party rejection
console.log('Testing cross-plant party rejection...');
assert.throws(() => {
    sandboxContext.buildLiveOrderPayload({
        order_number: 'PO-REC-FAIL',
        po_date: '2026-09-20',
        party_id: '33333333-3333-3333-3333-333333333334', // cross-plant
        item_id: '44444444-4444-4444-4444-444444444444',
        item_qty: 10
    }, 'received');
}, /Selected party belongs to plant "99999999-9999-9999-9999-999999999999", not active plant "22222222-2222-2222-2222-222222222222"/);
console.log('✓ Cross-plant party correctly rejected');

// TEST 2.3: Cross-plant Item rejection
console.log('Testing cross-plant item rejection...');
assert.throws(() => {
    sandboxContext.buildLiveOrderPayload({
        order_number: 'PO-REC-FAIL',
        po_date: '2026-09-20',
        party_id: '33333333-3333-3333-3333-333333333333',
        item_id: '44444444-4444-4444-4444-444444444445', // cross-plant item
        item_qty: 10
    }, 'received');
}, /Selected item belongs to plant "99999999-9999-9999-9999-999999999999", not active plant "22222222-2222-2222-2222-222222222222"/);
console.log('✓ Cross-plant item correctly rejected');

// TEST 2.4: buildLiveOrderPayload (poIssued)
console.log('Testing buildLiveOrderPayload (poIssued)...');
const poIssRecord = {
    po_number: 'PO-ISS-002',
    po_date: '2026-09-22',
    vendor_id: '33333333-3333-3333-3333-333333333333',
    item_id: '44444444-4444-4444-4444-444444444444',
    quantity: 50,
    unit_price: 2000,
    status: 'ACTIVE'
};
const poIssPayload = sandboxContext.buildLiveOrderPayload(poIssRecord, 'issued');
assert.strictEqual(poIssPayload.order_type, 'issued');
assert.strictEqual(poIssPayload.po_number, 'PO-ISS-002');
assert.strictEqual(poIssPayload.party_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(poIssPayload.item_id, '44444444-4444-4444-4444-444444444444');
assert.strictEqual(poIssPayload.item_qty, 50);
assert.strictEqual(poIssPayload.item_rate, 2000);
console.log('✓ buildLiveOrderPayload (poIssued) passed with exact columns');

// TEST 2.5: buildLiveGrnPayload
console.log('Testing buildLiveGrnPayload...');
const grnRecord = {
    grn_number: 'GRN-2026-001',
    grn_date: '2026-09-25',
    vendor_id: '33333333-3333-3333-3333-333333333333',
    po_id: '66666666-6666-6666-6666-666666666666',
    po_ref: 'PO-ISS-002',
    from_date: '2026-09-20',
    to_date: '2026-09-25',
    condition: 'Good',
    remarks: 'Delivered in sound condition',
    trips: [
        {
            trip_uuid: '77777777-7777-7777-7777-777777777777',
            trip_number: 'TRIP-9901',
            trip_weight: 25.5,
            received_weight: 25.0,
            grn_weight: 25.0,
            shortage: 0.5,
            material_doc_num: 'MAT-001'
        },
        {
            trip_uuid: '88888888-8888-8888-8888-888888888888',
            trip_number: 'TRIP-9902',
            trip_weight: 24.5,
            received_weight: 24.5,
            grn_weight: 24.5,
            shortage: 0.0,
            material_doc_num: 'MAT-002'
        }
    ]
};
const grnPayload = sandboxContext.buildLiveGrnPayload(grnRecord);
assert.strictEqual(grnPayload.header.grn_number, 'GRN-2026-001');
assert.strictEqual(grnPayload.header.business_id, validBizUuid);
assert.strictEqual(grnPayload.header.plant_id, activePlantId);
assert.strictEqual(grnPayload.header['companyId'], activePlantId);
assert.strictEqual(grnPayload.header.party_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(grnPayload.header.order_id, '66666666-6666-6666-6666-666666666666');
assert.strictEqual(grnPayload.header.total_grn_weight, 49.5);
assert.strictEqual(grnPayload.header.total_shortage, 0.5);
assert.strictEqual(grnPayload.items.length, 2);
assert.strictEqual(grnPayload.items[0].trip_uuid, '77777777-7777-7777-7777-777777777777');
assert.strictEqual(grnPayload.items[0].plant_id, activePlantId);
assert.strictEqual(grnPayload.items[1].trip_uuid, '88888888-8888-8888-8888-888888888888');
console.log('✓ buildLiveGrnPayload passed with header & items');

// TEST 2.6: Cross-plant Trip in GRN rejection
console.log('Testing cross-plant trip in GRN rejection...');
assert.throws(() => {
    sandboxContext.buildLiveGrnPayload({
        grn_number: 'GRN-FAIL',
        fromDate: '2026-09-20',
        toDate: '2026-09-25',
        poRef: 'PO-ISS-002',
        vendor_id: '33333333-3333-3333-3333-333333333333',
        trips: [
            {
                trip_uuid: '77777777-7777-7777-7777-777777777779' // cross-plant trip
            }
        ]
    });
}, /Trip "77777777-7777-7777-7777-777777777779" belongs to plant "99999999-9999-9999-9999-999999999999", not active plant "22222222-2222-2222-2222-222222222222"/);
console.log('✓ Cross-plant trip in GRN correctly rejected');

// TEST 2.7: normalizeLiveOrder
console.log('Testing normalizeLiveOrder...');
const liveOrderRow = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    business_id: validBizUuid,
    plant_id: activePlantId,
    order_type: 'issued',
    order_number: 'PO-ISS-002',
    order_date: '2026-09-22',
    party_id: '33333333-3333-3333-3333-333333333333',
    item_id: '44444444-4444-4444-4444-444444444444',
    item_description: 'Solid Waste Material',
    item_qty: 50,
    unit_id: '55555555-5555-5555-5555-555555555555',
    item_rate: 2000,
    taxable_amount: 100000,
    total_amount: 118000,
    consumed_qty: 10,
    balance_qty: 40,
    status: 'ACTIVE'
};
const normOrder = sandboxContext.normalizeLiveOrder(liveOrderRow);
assert.strictEqual(normOrder.id, 'PO-ISS-002');
assert.strictEqual(normOrder.dbId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
assert.strictEqual(normOrder.order_number, 'PO-ISS-002');
assert.strictEqual(normOrder.po_number, 'PO-ISS-002');
assert.strictEqual(normOrder.vendor_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(normOrder.customer_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(normOrder.quantity, 50);
assert.strictEqual(normOrder.unit_price, 2000);
console.log('✓ normalizeLiveOrder passed');

// TEST 2.8: normalizeLiveGrn
console.log('Testing normalizeLiveGrn...');
const liveGrnRow = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    business_id: validBizUuid,
    plant_id: activePlantId,
    grn_number: 'GRN-2026-001',
    party_id: '33333333-3333-3333-3333-333333333333',
    order_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    po_ref: 'PO-ISS-002',
    from_date: '2026-09-20',
    to_date: '2026-09-25',
    condition: 'Good',
    total_grn_weight: 49.5,
    total_shortage: 0.5,
    remarks: 'Delivered in sound condition'
};
const liveGrnItems = [
    {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        grn_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        plant_id: activePlantId,
        trip_uuid: '77777777-7777-7777-7777-777777777777',
        trip_number: 'TRIP-9901',
        trip_weight: 25.5,
        received_weight: 25.0,
        grn_weight: 25.0,
        shortage: 0.5,
        material_doc_num: 'MAT-001'
    }
];
const normGrn = sandboxContext.normalizeLiveGrn(liveGrnRow, liveGrnItems);
assert.strictEqual(normGrn.id, 'GRN-2026-001');
assert.strictEqual(normGrn.dbId, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
assert.strictEqual(normGrn.grn_number, 'GRN-2026-001');
assert.strictEqual(normGrn.vendor_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(normGrn.po_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
assert.strictEqual(normGrn.trips.length, 1);
assert.strictEqual(normGrn.trips[0].trip_uuid, '77777777-7777-7777-7777-777777777777');
console.log('✓ normalizeLiveGrn passed');

console.log('\n--- ALL WAVE 11.5 SANDBOX TESTS PASSED SUCCESSFULLY! ---');
