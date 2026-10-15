const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('scratch/app_test.js', 'utf8');

function setupSandbox(supabaseMock) {
  const domElements = {};
  const sandbox = {
    window: {
      getSupabaseClient: () => supabaseMock
    },
    document: {
      getElementById: (id) => domElements[id] || null
    },
    domElements,
    toasts: [],
    audits: [],
    modalsClosed: 0,
    tablesRendered: [],
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
        gateVerification: { view: true, add: true, edit: true, delete: false }
      },
      liveMasters: {
        gateVerification: [],
        trips: [
          { id: 'TRP-101', dbId: '33333333-3333-3333-3333-333333333333', plantId: 'PLANT-01', vehicle: 'MH12AB1234' }
        ]
      },
      data: {
        gateVerification: [],
        trips: [
          { id: 'TRP-101', dbId: '33333333-3333-3333-3333-333333333333', plantId: 'PLANT-01', vehicle: 'MH12AB1234' }
        ]
      },
      currentModule: 'gateVerification',
      editingId: null
    },
    showToast: (msg, type) => { sandbox.toasts.push({ msg, type }); },
    logAudit: (mod, act, rec) => { sandbox.audits.push({ mod, act, rec }); },
    closeModal: () => { sandbox.modalsClosed++; },
    renderTableModule: (mod) => { sandbox.tablesRendered.push(mod); },
    generateId: (prefix) => `${prefix}-1234`,
    hasPerm: (mod, act) => sandbox.state.currentPermissions[mod]?.[act] === true,
    console: console,
    getLiveTrips: () => sandbox.state.liveMasters.trips,
    getLiveGateEntries: () => sandbox.state.liveMasters.gateVerification,
    assertAuthorizedPlant: (id) => sandbox.state.authorizedPlants.find(p => p.id === id) || null,
    getCurrentAuthorizedPlant: () => sandbox.state.authorizedPlants[0],
    getCurrentAuthorizedBusiness: () => sandbox.state.authorizedBusinesses[0]
  };

  const norm = code.replace(/\r\n/g, '\n');
  const extractFn = (startStr, endStr) => {
    const start = norm.indexOf(startStr);
    const end = norm.indexOf(endStr, start);
    return norm.substring(start, end);
  };

  vm.createContext(sandbox);
  vm.runInContext(extractFn('function normalizeLiveGateEntry', 'function buildLiveGateEntryPayload'), sandbox);
  vm.runInContext(extractFn('function buildLiveGateEntryPayload', 'async function hydrateLiveMasterData'), sandbox);
  vm.runInContext(extractFn('async function processGateSave', 'function applySmartGST'), sandbox);

  return sandbox;
}

async function runTests() {
  console.log('--- Test 1: INSERT Success ---');
  let insertedPayload = null;
  const mockInsertClient = {
    from: (table) => ({
      insert: (payload) => {
        insertedPayload = payload;
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: '99999999-9999-9999-9999-999999999999',
                ...payload,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        };
      }
    })
  };

  const s1 = setupSandbox(mockInsertClient);
  s1.domElements['gate-vehicle'] = { value: 'MH12AB1234' };
  s1.domElements['gate-type'] = { value: 'Inward (Entering Plant)' };
  s1.domElements['gate-status'] = { value: 'Verified - Allowed Entry' };
  s1.domElements['gate-trip'] = { value: 'TRP-101' };
  s1.domElements['gate-driverName'] = { value: 'Driver Dave' };
  s1.domElements['gate-driverPhone'] = { value: '9876543210' };
  s1.domElements['field_photoFront'] = { value: 'data:img_front' };
  s1.domElements['field_photoBack'] = { value: 'data:img_back' };
  s1.domElements['gate-remarks'] = { value: 'Gate checked' };

  await s1.processGateSave();

  console.log('Toasts:', s1.toasts);
  console.log('Modal closed:', s1.modalsClosed === 1);
  console.log('LiveMasters updated:', s1.state.liveMasters.gateVerification.length === 1);
  console.log('LiveMasters row dbId is UUID:', s1.state.liveMasters.gateVerification[0].dbId === '99999999-9999-9999-9999-999999999999');
  console.log('LiveMasters row tripId resolved:', s1.state.liveMasters.gateVerification[0].tripId === 'TRP-101');
  console.log('State.data updated:', s1.state.data.gateVerification.length === 1);
  console.log('Inserted payload vehicle:', insertedPayload.vehicle_no === 'MH12AB1234');
  console.log('Inserted payload created_by:', insertedPayload.created_by === '11111111-1111-1111-1111-111111111111');

  console.log('\n--- Test 2: INSERT Failure (DB error) ---');
  const mockFailClient = {
    from: (table) => ({
      insert: (payload) => ({
        select: () => ({
          single: async () => ({
            data: null,
            error: { message: 'Row level security policy violation' }
          })
        })
      })
    })
  };

  const s2 = setupSandbox(mockFailClient);
  s2.domElements['gate-vehicle'] = { value: 'MH12AB1234' };
  s2.domElements['gate-type'] = { value: 'Inward (Entering Plant)' };
  s2.domElements['gate-status'] = { value: 'Verified - Allowed Entry' };

  await s2.processGateSave();

  console.log('Toasts:', s2.toasts);
  console.log('Modal closed (should be 0):', s2.modalsClosed === 0);
  console.log('LiveMasters NOT updated:', s2.state.liveMasters.gateVerification.length === 0);
  console.log('State.data NOT updated:', s2.state.data.gateVerification.length === 0);

  console.log('\n--- Test 3: UPDATE Success ---');
  let updatedPayload = null;
  let updateFilterId = null;
  const mockUpdateClient = {
    from: (table) => ({
      update: (payload) => {
        updatedPayload = payload;
        return {
          eq: (col, val) => {
            updateFilterId = val;
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: val,
                    entry_number: 'GAT-1234',
                    ...payload,
                    business_id: '22222222-2222-2222-2222-222222222222',
                    plant_id: 'PLANT-01',
                    created_by: '11111111-1111-1111-1111-111111111111',
                    created_at: '2026-09-28T00:00:00Z',
                    updated_at: new Date().toISOString()
                  },
                  error: null
                })
              })
            };
          }
        };
      }
    })
  };

  const s3 = setupSandbox(mockUpdateClient);
  // Existing row in liveMasters
  s3.state.liveMasters.gateVerification.push({
    id: 'GAT-1234',
    dbId: '88888888-8888-8888-8888-888888888888',
    entry_number: 'GAT-1234',
    plantId: 'PLANT-01',
    companyId: 'PLANT-01'
  });
  s3.state.data.gateVerification.push({
    id: 'GAT-1234',
    dbId: '88888888-8888-8888-8888-888888888888',
    entry_number: 'GAT-1234',
    plantId: 'PLANT-01',
    companyId: 'PLANT-01'
  });
  s3.state.editingId = 'GAT-1234';

  s3.domElements['field_vehicleNo'] = { value: 'MH12AB9999' };
  s3.domElements['field_type'] = { value: 'Outward (Leaving Plant)' };
  s3.domElements['field_status'] = { value: 'Verified - Allowed Exit' };
  s3.domElements['field_remarks'] = { value: 'Exited successfully' };

  await s3.processGateSave();

  console.log('Toasts:', s3.toasts);
  console.log('Update filtered by live UUID:', updateFilterId === '88888888-8888-8888-8888-888888888888');
  console.log('Update payload vehicle:', updatedPayload.vehicle_no === 'MH12AB9999');
  console.log('Update payload no id:', !('id' in updatedPayload));
  console.log('Update payload no entry_number:', !('entry_number' in updatedPayload));
  console.log('Update payload no created_at:', !('created_at' in updatedPayload));
  console.log('Update payload no created_by:', !('created_by' in updatedPayload));
  console.log('Modal closed:', s3.modalsClosed === 1);
  console.log('EditingId reset:', s3.state.editingId === null);
  console.log('LiveMasters updated in place:', s3.state.liveMasters.gateVerification[0].vehicleNo === 'MH12AB9999');
}

runTests();
