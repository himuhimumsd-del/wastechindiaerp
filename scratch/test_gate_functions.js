const fs = require('fs');

const code = fs.readFileSync('scratch/app_test.js', 'utf8');

// We test extracting buildLiveGateEntryPayload and running it
const vm = require('vm');

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => null
  },
  state: {
    authAuthorized: true,
    currentCompany: 'PLANT-01',
    currentUser: {
      authUid: '11111111-1111-1111-1111-111111111111',
      id: 'USR-01',
      username: 'guard_user',
      roleId: 'Gate Guard'
    },
    stage1AuthUser: {
      id: '11111111-1111-1111-1111-111111111111'
    },
    authorizedPlants: [
      { id: 'PLANT-01', business_id: '22222222-2222-2222-2222-222222222222', plant_name: 'Main Plant' },
      { id: 'PLANT-02', business_id: '22222222-2222-2222-2222-222222222222', plant_name: 'Secondary Plant' }
    ],
    authorizedBusinesses: [
      { id: '22222222-2222-2222-2222-222222222222', legal_name: 'Wastech Core Biz' }
    ],
    currentPermissions: {
      gateVerification: { view: true, add: true, edit: false, delete: false }
    },
    liveMasters: {
      gateVerification: [],
      trips: [
        { id: 'TRP-101', dbId: '33333333-3333-3333-3333-333333333333', plantId: 'PLANT-01', vehicle: 'MH12AB1234' },
        { id: 'TRP-102', dbId: '44444444-4444-4444-4444-444444444444', plantId: 'PLANT-02', vehicle: 'MH12CD5678' }
      ]
    },
    data: {
      gateVerification: [],
      trips: [
        { id: 'TRP-101', dbId: '33333333-3333-3333-3333-333333333333', plantId: 'PLANT-01', vehicle: 'MH12AB1234' },
        { id: 'TRP-102', dbId: '44444444-4444-4444-4444-444444444444', plantId: 'PLANT-02', vehicle: 'MH12CD5678' }
      ]
    },
    currentModule: 'gateVerification',
    editingId: null
  },
  showToast: (msg, type) => { console.log(`[Toast ${type}] ${msg}`); },
  logAudit: (mod, act, rec) => { console.log(`[Audit] ${mod} ${act} ${rec.id}`); },
  closeModal: () => { console.log('[closeModal] called'); },
  renderTableModule: (mod) => { console.log(`[renderTableModule] ${mod}`); },
  generateId: (prefix) => `${prefix}-9999`,
  console: console,
  getLiveTrips: () => sandbox.state.liveMasters.trips,
  getLiveGateEntries: () => sandbox.state.liveMasters.gateVerification,
  assertAuthorizedPlant: (id) => sandbox.state.authorizedPlants.find(p => p.id === id) || null,
  getCurrentAuthorizedPlant: () => sandbox.state.authorizedPlants[0],
  getCurrentAuthorizedBusiness: () => sandbox.state.authorizedBusinesses[0]
};

vm.createContext(sandbox);

// Extract the functions from scratch/app_test.js
// We can run the file partially or extract normalizeLiveGateEntry and buildLiveGateEntryPayload
const extractFn = (startStr, endStr) => {
  const norm = code.replace(/\r\n/g, '\n');
  const start = norm.indexOf(startStr);
  const end = norm.indexOf(endStr, start);
  return norm.substring(start, end);
};

const normCode = code.replace(/\r\n/g, '\n');
const normGateEntrySrc = extractFn('function normalizeLiveGateEntry', 'function buildLiveGateEntryPayload');
const buildPayloadSrc = extractFn('function buildLiveGateEntryPayload', 'async function hydrateLiveMasterData');
const gateSaveSrc = extractFn('async function processGateSave', 'function applySmartGST');

vm.runInContext(normGateEntrySrc, sandbox);
vm.runInContext(buildPayloadSrc, sandbox);
vm.runInContext(gateSaveSrc, sandbox);

console.log('Testing buildLiveGateEntryPayload:');

// Test 1: Valid payload creation
const validPayload = sandbox.buildLiveGateEntryPayload({
  vehicleNo: 'MH12AB1234',
  type: 'Inward (Entering Plant)',
  status: 'Verified - Allowed Entry',
  tripId: 'TRP-101',
  driverName: 'Ramesh Kumar',
  driverPhone: '9876543210',
  photoFront: 'data:image/jpeg;base64,front123',
  photoBack: 'data:image/jpeg;base64,back123',
  remarks: 'All good'
});

console.log('Payload created keys count:', Object.keys(validPayload).length);
console.log('Payload keys:', Object.keys(validPayload));
console.log('trip_id resolved to live UUID:', validPayload.trip_id === '33333333-3333-3333-3333-333333333333');
console.log('business_id is UUID:', validPayload.business_id === '22222222-2222-2222-2222-222222222222');
console.log('plant_id matches:', validPayload.plant_id === 'PLANT-01');
console.log('companyId matches:', validPayload.companyId === 'PLANT-01');
console.log('created_by is auth UUID:', validPayload.created_by === '11111111-1111-1111-1111-111111111111');
console.log('No id field:', !('id' in validPayload));
console.log('No created_at field:', !('created_at' in validPayload));
console.log('No updated_at field:', !('updated_at' in validPayload));

// Test 2: Mismatched plant trip
try {
  sandbox.buildLiveGateEntryPayload({
    vehicleNo: 'MH12CD5678',
    type: 'Inward (Entering Plant)',
    status: 'Verified - Allowed Entry',
    tripId: 'TRP-102' // TRP-102 belongs to PLANT-02, active is PLANT-01
  });
  console.log('Cross-plant trip check: FAILED (should have thrown)');
} catch (e) {
  console.log('Cross-plant trip check: PASSED (threw expected error:', e.message, ')');
}

// Test 3: Unplanned trip
const unplannedPayload = sandbox.buildLiveGateEntryPayload({
  vehicleNo: 'MH12XX9999',
  type: 'Outward (Leaving Plant)',
  status: 'Verified - Allowed Exit',
  tripId: 'Unplanned'
});
console.log('Unplanned trip_id is null:', unplannedPayload.trip_id === null);

// Test 4: Missing vehicle
try {
  sandbox.buildLiveGateEntryPayload({
    vehicleNo: '',
    type: 'Inward (Entering Plant)',
    status: 'Verified - Allowed Entry'
  });
  console.log('Missing vehicle check: FAILED (should have thrown)');
} catch (e) {
  console.log('Missing vehicle check: PASSED (threw expected error:', e.message, ')');
}

// Test 5: Invalid status
try {
  sandbox.buildLiveGateEntryPayload({
    vehicleNo: 'MH12XX9999',
    type: 'Inward (Entering Plant)',
    status: 'Some Random Status'
  });
  console.log('Invalid status check: FAILED (should have thrown)');
} catch (e) {
  console.log('Invalid status check: PASSED (threw expected error:', e.message, ')');
}
