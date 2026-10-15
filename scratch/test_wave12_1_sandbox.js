const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=== WAVE 12.1: ADMIN / SYSTEM LIVE PERSISTENCE SANDBOX TEST SUITE ===');

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
        this.checked = false;
        this.disabled = false;
        this.style = {};
        this.children = [];
        this.parentElement = { title: '', style: {} };
        this.options = [];
        this.dataset = {};
    }
    remove() {}
    appendChild(child) { this.children.push(child); }
    addEventListener() {}
    querySelector(selector) {
        if (selector === '[data-action="view"]') return { checked: true };
        if (selector === '[data-action="add"]') return { checked: true };
        if (selector === '[data-action="edit"]') return { checked: true };
        if (selector === '[data-action="delete"]') return { checked: false };
        return new MockElement();
    }
    querySelectorAll() { return []; }
    getElementsByTagName() { return []; }
    getAttribute(name) {
        if (name === 'data-module') return 'gateVerification';
        return '';
    }
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
    'modal-footer': new MockElement('modal-footer'),
    'field_id': new MockElement('field_id'),
    'field_name': new MockElement('field_name'),
    'field_tradeName': new MockElement('field_tradeName'),
    'field_phone': new MockElement('field_phone'),
    'field_address': new MockElement('field_address'),
    'field_spcb': new MockElement('field_spcb'),
    'field_epr': new MockElement('field_epr'),
    'field_plantLat': new MockElement('field_plantLat'),
    'field_plantLng': new MockElement('field_plantLng'),
    'field_geofenceRadius': new MockElement('field_geofenceRadius'),
    'field_geofenceEnabled': new MockElement('field_geofenceEnabled'),
    'field_attendanceSelfieRequired': new MockElement('field_attendanceSelfieRequired'),
    'field_fyStartMonth': new MockElement('field_fyStartMonth'),
    'field_cin': new MockElement('field_cin'),
    'field_pan': new MockElement('field_pan'),
    'field_roleName': new MockElement('field_roleName'),
    'field_desc': new MockElement('field_desc'),
    'field_authName': new MockElement('field_authName'),
    'field_signImage': new MockElement('field_signImage'),
    'field_content': new MockElement('field_content'),
    'field_type': new MockElement('field_type'),
    'field_status': new MockElement('field_status'),
    'field_empId': new MockElement('field_empId'),
    'field_roleId': new MockElement('field_roleId'),
    'field_companyId': new MockElement('field_companyId')
};

const mockDocument = {
    getElementById: (id) => mockElements[id] || new MockElement(id),
    querySelector: () => new MockElement(),
    querySelectorAll: (selector) => {
        if (selector === '#matrix-body tr') {
            const tr1 = new MockElement('tr1');
            tr1.getAttribute = () => 'gateVerification';
            const tr2 = new MockElement('tr2');
            tr2.getAttribute = () => 'trips';
            return [tr1, tr2];
        }
        return [];
    },
    createElement: (tag) => new MockElement(tag),
    head: new MockElement('head'),
    body: new MockElement('body'),
    documentElement: { style: {} },
    addEventListener: () => {}
};

const capturedCalls = [];

class MockQueryBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.action = 'select';
        this.payload = null;
        this.filters = [];
        this.selectedColumns = '*';
    }
    select(cols) {
        this.selectedColumns = cols;
        return this;
    }
    insert(payload) {
        this.action = 'insert';
        this.payload = payload;
        capturedCalls.push({ table: this.tableName, action: 'insert', payload });
        return this;
    }
    update(payload) {
        this.action = 'update';
        this.payload = payload;
        capturedCalls.push({ table: this.tableName, action: 'update', payload });
        return this;
    }
    upsert(payload, options) {
        this.action = 'upsert';
        this.payload = payload;
        this.options = options;
        capturedCalls.push({ table: this.tableName, action: 'upsert', payload, options });
        return this;
    }
    delete() {
        this.action = 'delete';
        capturedCalls.push({ table: this.tableName, action: 'delete' });
        return this;
    }
    eq(col, val) {
        this.filters.push({ type: 'eq', col, val });
        return this;
    }
    in(col, vals) {
        this.filters.push({ type: 'in', col, vals });
        return this;
    }
    order() { return this; }
    limit() { return this; }
    async single() {
        if (this.action === 'insert' || this.action === 'update') {
            const row = Object.assign({ id: (this.payload && this.payload.id) || 'MOCK-1' }, this.payload);
            return { data: row, error: null };
        }
        return { data: { id: 'MOCK-1' }, error: null };
    }
    then(resolve, reject) {
        return Promise.resolve({ data: [{ id: 'MOCK-1' }], error: null }).then(resolve, reject);
    }
}

const mockSupabaseClient = {
    from: (tableName) => new MockQueryBuilder(tableName),
    auth: {
        getUser: async () => ({ data: { user: { id: 'user-uuid-1', email: 'admin@wastech.com' } }, error: null }),
        signOut: async () => ({ error: null })
    }
};

const sandbox = {
    window: {
        innerWidth: 1024,
        devicePixelRatio: 1,
        addEventListener: () => {},
        removeEventListener: () => {},
        matchMedia: () => ({ matches: false, addEventListener: () => {} }),
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        scrollTo: () => {},
        URL: { createObjectURL: () => 'blob:mock' },
        Blob: class { constructor() {} },
        getSupabaseClient: () => mockSupabaseClient,
        confirm: () => true
    },
    document: mockDocument,
    URL: { createObjectURL: () => 'blob:mock' },
    Blob: class { constructor() {} },
    console: {
        log: () => {},
        warn: () => {},
        error: () => {},
        info: () => {},
        table: () => {}
    },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    requestAnimationFrame: (fn) => fn(),
    navigator: { userAgent: 'Node' },
    location: { reload: () => {} },
    sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    confirm: () => true,
    alert: () => {}
};

sandbox.window.window = sandbox.window;
sandbox.window.document = mockDocument;

const code = fs.readFileSync('frontend/app.js', 'utf8');
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const win = sandbox.window;
const state = win.state;

async function runTests() {
    console.log('Test 1: Verification of normalizers');
    assert.strictEqual(typeof win.normalizeLiveRole, 'function', 'normalizeLiveRole exported');
    assert.strictEqual(typeof win.normalizeLiveSignature, 'function', 'normalizeLiveSignature exported');
    assert.strictEqual(typeof win.normalizeLiveTemplate, 'function', 'normalizeLiveTemplate exported');
    assert.strictEqual(typeof win.normalizeLiveSystemSettings, 'function', 'normalizeLiveSystemSettings exported');
    assert.strictEqual(typeof win.normalizeLiveProfile, 'function', 'normalizeLiveProfile exported');
    assert.strictEqual(typeof win.normalizeLiveAuditLog, 'function', 'normalizeLiveAuditLog exported');

    const roleNorm = win.normalizeLiveRole({ id: 'ROLE-TEST', role_name: 'Test Role', description: 'Testing' }, [
        { role_id: 'ROLE-TEST', module_key: 'trips', can_view: true, can_add: true, can_edit: false, can_delete: false }
    ]);
    assert.strictEqual(roleNorm.id, 'ROLE-TEST');
    assert.strictEqual(roleNorm.roleName, 'Test Role');
    const rolePerms = JSON.parse(roleNorm.permissions);
    assert.strictEqual(rolePerms.trips.view, true);
    assert.strictEqual(rolePerms.trips.edit, false);
    console.log('✓ Test 1: Normalizers verify cleanly');

    console.log('Test 2: Company / Plant settings live update');
    state.authAuthorized = true;
    state.currentUser = { username: 'admin', roleId: 'ROLE-ADMIN' };
    state.currentBusiness = 'biz-uuid-1';
    state.currentCompany = 'COMP-1';
    state.authorizedBusinesses = [{ id: 'biz-uuid-1', code: 'BIZ-1' }];
    state.authorizedPlants = [{ id: 'COMP-1', name: 'HQ Plant' }, { id: 'COMP-2', name: 'Bhilai Plant' }];
    state.currentPermissions = {
        companyMaster: { view: true, add: true, edit: true, delete: true },
        rolesMaster: { view: true, add: true, edit: true, delete: true },
        signatureMaster: { view: true, add: true, edit: true, delete: true },
        templatesMaster: { view: true, add: true, edit: true, delete: true },
        systemSettings: { view: true, add: true, edit: true, delete: true },
        usersMaster: { view: true, add: true, edit: true, delete: true }
    };
    state.editingId = 'COMP-1';

    mockElements['field_id'].value = 'COMP-1';
    mockElements['field_tradeName'].value = 'Updated Plant HQ';
    mockElements['field_name'].value = 'GG Wastech Pvt Ltd';
    mockElements['field_phone'].value = '9876543210';
    mockElements['field_address'].value = 'Sector 10, Raipur';
    mockElements['field_plantLat'].value = '21.2514';
    mockElements['field_plantLng'].value = '81.6296';
    mockElements['field_geofenceRadius'].value = '600';
    mockElements['field_geofenceEnabled'].checked = true;
    mockElements['field_attendanceSelfieRequired'].checked = true;

    capturedCalls.length = 0;
    await win.processCompanyMasterSave();

    const plantUpdate = capturedCalls.find(c => c.table === 'plants' && c.action === 'update');
    assert.ok(plantUpdate, 'Live plant update called');
    assert.strictEqual(plantUpdate.payload.trade_name, 'Updated Plant HQ');
    assert.strictEqual(plantUpdate.payload.geofence_radius, 600);
    assert.strictEqual(plantUpdate.payload.plant_lat, 21.2514);
    console.log('✓ Test 2: Plant settings live update persists with correct schema columns');

    console.log('Test 3: Roles and Permissions live persistence');
    state.editingId = 'ROLE-OPERATOR';
    mockElements['field_roleName'].value = 'Plant Operator';
    mockElements['field_desc'].value = 'Operates machine plant';

    capturedCalls.length = 0;
    await win.processRolesMasterSave();

    const roleUpdate = capturedCalls.find(c => c.table === 'roles' && c.action === 'update');
    assert.ok(roleUpdate, 'Live role update called');
    assert.strictEqual(roleUpdate.payload.role_name, 'Plant Operator');

    const permUpsert = capturedCalls.find(c => c.table === 'role_permissions' && c.action === 'upsert');
    assert.ok(permUpsert, 'Live role_permissions upsert called');
    assert.ok(Array.isArray(permUpsert.payload), 'Role permissions sent as array');
    console.log('✓ Test 3: Roles and permissions live persistence verified');

    console.log('Test 4: Signatures live CRUD');
    state.editingId = null;
    mockElements['field_authName'].value = 'Authorized Signatory';
    mockElements['field_signImage'].value = 'data:image/svg+xml,test-signature-data';

    capturedCalls.length = 0;
    await win.processSignatureMasterSave();

    const sigInsert = capturedCalls.find(c => c.table === 'signatures' && c.action === 'insert');
    assert.ok(sigInsert, 'Live signature insert called');
    assert.strictEqual(sigInsert.payload.auth_name, 'Authorized Signatory');
    assert.strictEqual(sigInsert.payload.sign_image_url, 'data:image/svg+xml,test-signature-data');
    assert.strictEqual(sigInsert.payload.plant_id, 'COMP-1');

    capturedCalls.length = 0;
    await win.processSignatureDelete('SIGN-1234');
    const sigDelete = capturedCalls.find(c => c.table === 'signatures' && c.action === 'delete');
    assert.ok(sigDelete, 'Live signature delete called');
    console.log('✓ Test 4: Signatures live CRUD verified');

    console.log('Test 5: Document Templates live CRUD');
    state.editingId = null;
    mockElements['field_name'].value = 'Special DC Terms';
    mockElements['field_type'].value = 'Delivery Challan (DC)';
    mockElements['field_content'].value = 'Terms and conditions for DC';

    capturedCalls.length = 0;
    await win.processTemplatesMasterSave();

    const tmplInsert = capturedCalls.find(c => c.table === 'document_templates' && c.action === 'insert');
    assert.ok(tmplInsert, 'Live document_templates insert called');
    assert.strictEqual(tmplInsert.payload.name, 'Special DC Terms');
    assert.strictEqual(tmplInsert.payload.applicable_type, 'Delivery Challan (DC)');
    assert.strictEqual(tmplInsert.payload.content, 'Terms and conditions for DC');

    capturedCalls.length = 0;
    await win.processTemplateDelete('TMP-1234');
    const tmplDelete = capturedCalls.find(c => c.table === 'document_templates' && c.action === 'delete');
    assert.ok(tmplDelete, 'Live template delete called');
    console.log('✓ Test 5: Document templates live CRUD verified');

    console.log('Test 6: System Settings live singleton update');
    state.editingId = 'SET-1';
    mockElements['field_plantLat'].value = '22.0000';
    mockElements['field_plantLng'].value = '82.0000';
    mockElements['field_geofenceRadius'].value = '750';

    capturedCalls.length = 0;
    await win.processSystemSettingsSave();

    const sysUpdate = capturedCalls.find(c => c.table === 'system_settings' && c.action === 'update');
    assert.ok(sysUpdate, 'Live system_settings update called');
    assert.strictEqual(sysUpdate.payload.default_plant_lat, 22.0);
    assert.strictEqual(sysUpdate.payload.default_plant_lng, 82.0);
    assert.strictEqual(sysUpdate.payload.default_geofence_radius, 750);
    console.log('✓ Test 6: System settings singleton update verified');

    console.log('Test 7: Audit Logs append-only non-recursive persistence');
    capturedCalls.length = 0;
    win.logAudit('trips', 'Create', { id: 'TRIP-999', vehicle: 'CG04AA1111' });

    await new Promise(r => setTimeout(r, 20));
    const auditInsert = capturedCalls.find(c => c.table === 'audit_logs' && c.action === 'insert');
    assert.ok(auditInsert, 'Live audit_logs insert fired');
    assert.strictEqual(auditInsert.payload.action, 'CREATE');
    assert.strictEqual(auditInsert.payload.entity_type, 'trips');
    assert.strictEqual(auditInsert.payload.entity_id, 'TRIP-999');

    capturedCalls.length = 0;
    win.logAudit('auditLogs', 'Create', { id: 'AUD-TEST' });
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(capturedCalls.length, 0, 'No recursion when module is auditLogs');
    console.log('✓ Test 7: Audit logs append-only non-recursive persistence verified');

    console.log('Test 8: User accounts deferred boundary check');
    state.editingId = null;
    let toastMsg = '';
    sandbox.showToast = (msg, type) => { toastMsg = msg; };
    await win.processUsersMasterSave();
    assert.ok(toastMsg.includes('DEFERRED — SUPABASE AUTH ADMIN BOUNDARY'), 'Direct user password creation blocked at boundary');
    console.log('✓ Test 8: User accounts boundary correctly deferred');

    console.log('Test 9: Sensitive entity deletion protection');
    toastMsg = '';
    await win.deleteRecord('rolesMaster', 'ROLE-ADMIN');
    assert.ok(toastMsg.includes('System roles cannot be deleted'), 'System admin role deletion blocked');

    toastMsg = '';
    await win.deleteRecord('systemSettings', 'SET-1');
    assert.ok(toastMsg.includes('Global system settings cannot be deleted'), 'System settings deletion blocked');

    toastMsg = '';
    await win.deleteRecord('companyMaster', 'COMP-1');
    assert.ok(toastMsg.includes('Plant facility deletion is restricted'), 'Plant deletion blocked');

    toastMsg = '';
    await win.deleteRecord('auditLogs', 'AUD-01');
    assert.ok(toastMsg.includes('Audit log entries are immutable'), 'Audit log deletion blocked');
    console.log('✓ Test 9: Sensitive entity deletion protection verified');

    console.log('Test 10: Plant isolation fail-closed check');
    state.authorizedPlants = [{ id: 'COMP-1' }];
    state.editingId = 'COMP-99';
    mockElements['field_id'].value = 'COMP-99';
    capturedCalls.length = 0;
    toastMsg = '';
    await win.processCompanyMasterSave();
    assert.strictEqual(capturedCalls.filter(c => c.table === 'plants').length, 0, 'No plants update when plant is unauthorized');
    assert.ok(toastMsg.includes('Access Denied'), 'Toast reflects access denied for unauthorized plant');
    console.log('✓ Test 10: Cross-tenant / unauthorized plant update fail-closed verified');

    console.log('Test 11: Hydration of Wave 12.1 collections');
    state.authorizedBusinesses = [{ id: 'biz-uuid-1' }];
    state.authorizedPlants = [{ id: 'COMP-1' }];
    state.authAuthorized = true;

    mockSupabaseClient.from = (tableName) => {
        const qb = new MockQueryBuilder(tableName);
        qb.then = function(resolve, reject) {
            if (tableName === 'businesses') {
                return Promise.resolve({ data: [{ id: 'biz-uuid-1', legal_name: 'Live Wastech Corp', pan: 'LIVE1234', cin: 'LIVECIN', fy_start_month: 'April', is_active: true }], error: null }).then(resolve, reject);
            }
            if (tableName === 'plants') {
                return Promise.resolve({ data: [{ id: 'COMP-1', business_id: 'biz-uuid-1', plant_name: 'Live Plant 1', trade_name: 'Live Plant HQ', physical_address: 'Live Addr', geofence_radius: 550, is_active: true }], error: null }).then(resolve, reject);
            }
            if (tableName === 'roles') {
                return Promise.resolve({ data: [{ id: 'ROLE-ADMIN', role_name: 'Super Admin', description: 'All access', is_system: true }], error: null }).then(resolve, reject);
            }
            if (tableName === 'role_permissions') {
                return Promise.resolve({ data: [{ id: 'perm-1', role_id: 'ROLE-ADMIN', module_key: 'trips', can_view: true, can_add: true, can_edit: true, can_delete: true }], error: null }).then(resolve, reject);
            }
            if (tableName === 'signatures') {
                return Promise.resolve({ data: [{ id: 'SIGN-LIVE', plant_id: 'COMP-1', auth_name: 'Live Director', sign_image_url: 'data:img', is_active: true }], error: null }).then(resolve, reject);
            }
            if (tableName === 'document_templates') {
                return Promise.resolve({ data: [{ id: 'TMP-LIVE', plant_id: 'COMP-1', name: 'Live LR', applicable_type: 'LR', content: 'Live content', is_active: true }], error: null }).then(resolve, reject);
            }
            if (tableName === 'system_settings') {
                return Promise.resolve({ data: [{ id: 'SET-1', default_plant_lat: 21.5, default_plant_lng: 81.5, default_geofence_radius: 650, config: {} }], error: null }).then(resolve, reject);
            }
            if (tableName === 'profiles') {
                return Promise.resolve({ data: [{ id: 'prof-uuid', legacy_user_id: 'USER-LIVE', username: 'live_user', full_name: 'Live User', role_id: 'ROLE-ADMIN', default_plant_id: 'COMP-1', status: 'Active' }], error: null }).then(resolve, reject);
            }
            if (tableName === 'audit_logs') {
                return Promise.resolve({ data: [{ id: 'aud-uuid', business_id: 'biz-uuid-1', plant_id: 'COMP-1', action: 'LOGIN', entity_type: 'auth', entity_id: 'live_user', details: { description: 'Live login' }, created_at: new Date().toISOString() }], error: null }).then(resolve, reject);
            }
            return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        };
        return qb;
    };

    const hydRes = await win.hydrateLiveMasterData();
    assert.strictEqual(hydRes.success, true, 'hydrateLiveMasterData succeeds');
    assert.strictEqual(state.liveMasterLoaded.companyMaster, true, 'companyMaster marked loaded');
    assert.strictEqual(state.liveMasterLoaded.roles, true, 'roles marked loaded');
    assert.strictEqual(state.liveMasterLoaded.signatures, true, 'signatures marked loaded');
    assert.strictEqual(state.liveMasterLoaded.templatesMaster, true, 'templatesMaster marked loaded');
    assert.strictEqual(state.liveMasterLoaded.systemSettings, true, 'systemSettings marked loaded');
    assert.strictEqual(state.liveMasterLoaded.usersMaster, true, 'usersMaster marked loaded');
    assert.strictEqual(state.liveMasterLoaded.auditLogs, true, 'auditLogs marked loaded');

    assert.strictEqual(state.data.companyMaster[0].tradeName, 'Live Plant HQ', 'Live plant trade name hydrated');
    assert.strictEqual(state.data.rolesMaster[0].roleName, 'Super Admin', 'Live role hydrated');
    assert.strictEqual(state.data.signatureMaster[0].authName, 'Live Director', 'Live signature hydrated');
    assert.strictEqual(state.data.templatesMaster[0].name, 'Live LR', 'Live template hydrated');
    assert.strictEqual(state.data.systemSettings[0].geofenceRadius, '650', 'Live system settings hydrated');
    assert.strictEqual(state.data.usersMaster[0].username, 'live_user', 'Live user profile hydrated');
    assert.strictEqual(state.data.auditLogs[0].action, 'LOGIN', 'Live audit log hydrated');
    console.log('✓ Test 11: Hydration completeness across all Wave 12.1 collections verified');

    console.log('Test 12: Delete protection across all statutory and operational ledgers');
    toastMsg = '';
    await win.deleteRecord('trips', 'TRIP-1');
    assert.ok(toastMsg.includes('operational logistics records and cannot be deleted'), 'Trip deletion blocked');

    toastMsg = '';
    await win.deleteRecord('gateVerification', 'GATE-1');
    assert.ok(toastMsg.includes('Gate security verification entries are permanent audit records'), 'Gate entry deletion blocked');

    toastMsg = '';
    await win.deleteRecord('poReceived', 'PO-1');
    assert.ok(toastMsg.includes('Purchase and sales orders are commercial legal contracts'), 'PO deletion blocked');

    toastMsg = '';
    await win.deleteRecord('grn', 'GRN-1');
    assert.ok(toastMsg.includes('Goods Receipt Notes are statutory inventory receipts'), 'GRN deletion blocked');

    toastMsg = '';
    await win.deleteRecord('payrollSettings', 'PAYSET-1');
    assert.ok(toastMsg.includes('Payroll statutory settings cannot be deleted'), 'Payroll settings deletion blocked');
    console.log('✓ Test 12: Statutory & operational ledgers delete protection verified');

    console.log('Test 13: Audit log password redaction defense-in-depth');
    capturedCalls.length = 0;
    win.logAudit('usersMaster', 'Create', { id: 'USER-SEC', username: 'sec_user', password: 'plainPassword123' });
    await new Promise(r => setTimeout(r, 20));
    const secAudit = capturedCalls.find(c => c.table === 'audit_logs' && c.payload && c.payload.entity_id === 'USER-SEC');
    assert.ok(secAudit, 'Audit log created');
    assert.strictEqual(secAudit.payload.after_state.password, '******', 'Password redacted in audit payload');
    console.log('✓ Test 13: Audit log password redaction verified');

    console.log('\n======================================================');
    console.log('ALL WAVE 12.1 SANDBOX TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
}

runTests().catch(err => {
    console.error('Test failure:', err);
    process.exit(1);
});
