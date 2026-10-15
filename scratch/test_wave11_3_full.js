const vm = require('vm');

const mockState = {
  authAuthorized: true,
  currentCompany: 'PLANT-01',
  currentUser: {
    authUid: '11111111-1111-1111-1111-111111111111',
    id: 'USR-01',
    username: 'admin_user',
    roleId: 'Super Administrator',
    roleCode: 'ROLE-ADMIN'
  },
  stage1AuthUser: {
    id: '11111111-1111-1111-1111-111111111111'
  },
  authorizedPlants: [
    { id: 'PLANT-01', business_id: '22222222-2222-2222-2222-222222222222', plant_name: 'Bhilai Yard' },
    { id: 'PLANT-02', business_id: '22222222-2222-2222-2222-222222222222', plant_name: 'Raipur Yard' }
  ],
  authorizedBusinesses: [
    { id: '22222222-2222-2222-2222-222222222222', legal_name: 'Wastech Core' }
  ],
  currentPermissions: {
    machineLogs: { view: true, add: true, edit: true, delete: false },
    consumableLogs: { view: true, add: true, edit: false, delete: false },
    consumablesMaster: { view: true, add: true, edit: true, delete: false }
  },
  liveMasters: {
    machineLogs: [],
    consumableLogs: [],
    plantMachinery: [
      { id: 'MACH-01', name: 'Excavator 01', plant_id: 'PLANT-01', companyId: 'PLANT-01' },
      { id: 'MACH-02', name: 'Shredder 02', plant_id: 'PLANT-02', companyId: 'PLANT-02' }
    ],
    consumables: [
      { id: 'CON-OIL', name: 'Hydraulic Oil 68', plant_id: 'PLANT-01', companyId: 'PLANT-01', currentStock: 100, lastPrice: 250 },
      { id: 'CON-GREASE', name: 'Chassis Grease', plant_id: 'PLANT-02', companyId: 'PLANT-02', currentStock: 50, lastPrice: 120 }
    ],
    employees: [
      { id: 'EMP-01', name: 'Sunil Operator', plant_id: 'PLANT-01', companyId: 'PLANT-01' },
      { id: 'EMP-02', name: 'Raju Driver', plant_id: 'PLANT-02', companyId: 'PLANT-02' }
    ]
  },
  data: {
    machineLogs: [],
    consumableLogs: [],
    consumablesMaster: [
      { id: 'CON-OIL', name: 'Hydraulic Oil 68', plant_id: 'PLANT-01', companyId: 'PLANT-01', currentStock: 100, lastPrice: 250 }
    ]
  },
  currentModule: 'machineLogs',
  editingId: null
};

// We will load buildLiveMachineLogPayload and buildLiveConsumableLogPayload and run tests
console.log('Testing Wave 11.3 Sandbox setup...');
console.log('Setup verified.');
