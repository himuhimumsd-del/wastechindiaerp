const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== WAVE 9.6 EXTENSION: PARTIES MASTER UNIT TEST ===');

const appJsPath = path.resolve(__dirname, '../frontend/app.js');
const code = fs.readFileSync(appJsPath, 'utf8');

// Set up mock browser environment
const domMock = {
    window: {},
    document: {
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        body: { classList: { add: () => {}, remove: () => {} } }
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    },
    navigator: { onLine: true },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
};

const sandbox = vm.createContext({
    ...domMock,
    window: domMock,
    document: domMock.document,
    localStorage: domMock.localStorage,
    navigator: domMock.navigator,
    console: console
});

try {
    vm.runInContext(code, sandbox);
    console.log('✔ app.js successfully evaluated without syntax errors.');
} catch (e) {
    console.error('✘ Error evaluating app.js:', e);
    process.exit(1);
}

const state = sandbox.state;
const hydrateLiveMasterData = sandbox.hydrateLiveMasterData;
const fetchLiveMaster = sandbox.fetchLiveMaster;
const getLiveParties = sandbox.getLiveParties;
const getLiveUnits = sandbox.getLiveUnits;
const getLivePoTypes = sandbox.getLivePoTypes;
const getLivePlantData = sandbox.getLivePlantData;
const getLiveBusinessData = sandbox.getLiveBusinessData;
const logoutUser = sandbox.logoutUser;

console.log('\n--- TEST 1: Initial state structure ---');
if (state.liveMasters && Array.isArray(state.liveMasters.parties)) {
    console.log('✔ state.liveMasters.parties exists as array');
} else {
    console.error('✘ state.liveMasters.parties is missing or not an array');
    process.exit(1);
}

console.log('\n--- TEST 2: Unauthenticated / fail-closed hydration ---');
sandbox.supabase = {
    auth: {
        getUser: async () => ({ data: { user: null }, error: null })
    }
};
state.authorizedBusinesses = [];
state.authorizedPlants = [];

(async () => {
    try {
        await hydrateLiveMasterData();
        if (state.liveMasters.parties.length === 0) {
            console.log('✔ Unauthenticated state keeps liveMasters.parties empty');
        } else {
            console.error('✘ Unauthenticated state populated liveMasters.parties!');
            process.exit(1);
        }

        console.log('\n--- TEST 3: Authenticated Admin hydration with parties ---');
        state.authorizedBusinesses = [{ id: 'biz-uuid-1', code: 'WST' }];
        state.authorizedPlants = [{ id: 'COMP-1', name: 'Plant 1' }, { id: 'COMP-2', name: 'Plant 2' }];
        state.currentBusiness = { id: 'biz-uuid-1', code: 'WST' };

        const mockParties = [
            { id: 'PRT-1', name: 'Tata Steel', trade_name: 'Tata Steel Ltd', party_type: ['Vendor', 'Supplier'], gstin: '27AAAAA0000A1Z5', state: 'Maharashtra', is_active: true, business_id: 'biz-uuid-1' },
            { id: 'PRT-2', name: 'JSW Energy', trade_name: 'JSW Energy Ltd', party_type: ['Client'], gstin: '27BBBBB0000B1Z6', state: 'Maharashtra', is_active: true, business_id: 'biz-uuid-1' },
            { id: 'PRT-3', name: 'Adani Logistics', trade_name: 'Adani Logistics', party_type: ['Transporter'], gstin: '24CCCCC0000C1Z7', state: 'Gujarat', is_active: true, business_id: 'biz-uuid-1' }
        ];

        sandbox.supabase = {
            auth: {
                getUser: async () => ({ data: { user: { id: 'admin-uuid' } }, error: null })
            },
            from: (table) => {
                return {
                    select: (cols) => {
                        let queryObj = {
                            table,
                            eq: (col, val) => queryObj,
                            in: (col, vals) => queryObj,
                            order: (col, opts) => queryObj,
                            then: (resolve) => {
                                if (table === 'businesses') resolve({ data: [{ id: 'biz-uuid-1', legal_name: 'Wastech Ltd' }], error: null });
                                else if (table === 'plants') resolve({ data: [{ id: 'COMP-1', plant_name: 'Plant 1' }, { id: 'COMP-2', plant_name: 'Plant 2' }], error: null });
                                else if (table === 'units') resolve({ data: [{ id: 'UNT-1', name: 'MT' }, { id: 'UNT-2', name: 'KG' }], error: null });
                                else if (table === 'po_types') resolve({ data: [{ id: 'POT-1', name: 'Material' }], error: null });
                                else if (table === 'parties') resolve({ data: mockParties, error: null });
                                else resolve({ data: [], error: null });
                            }
                        };
                        return queryObj;
                    }
                };
            }
        };

        await hydrateLiveMasterData();
        console.log('Hydrated liveMasters:', {
            businesses: state.liveMasters.businesses.length,
            plants: state.liveMasters.plants.length,
            units: state.liveMasters.units.length,
            poTypes: state.liveMasters.poTypes.length,
            parties: state.liveMasters.parties.length
        });

        if (state.liveMasters.parties.length === 3) {
            console.log('✔ state.liveMasters.parties populated with 3 live rows');
        } else {
            console.error('✘ state.liveMasters.parties unexpected length:', state.liveMasters.parties.length);
            process.exit(1);
        }

        const liveParties = getLiveParties();
        if (liveParties.length === 3 && liveParties[0].id === 'PRT-1' && liveParties[0].tradeName === 'Tata Steel Ltd') {
            console.log('✔ getLiveParties() successfully returns mapped normalized parties');
        } else {
            console.error('✘ getLiveParties() format unexpected:', liveParties[0]);
            process.exit(1);
        }

        console.log('\n--- TEST 4: Fallback behavior when live masters empty ---');
        state.liveMasters.parties = [];
        const fallbackParties = getLiveParties();
        if (fallbackParties.length === state.data.partiesMaster.length) {
            console.log(`✔ getLiveParties() falls back cleanly to state.data.partiesMaster (${fallbackParties.length} items)`);
        } else {
            console.error('✘ getLiveParties() fallback failed');
            process.exit(1);
        }

        console.log('\n--- TEST 5: Logout cleanup ---');
        state.liveMasters.parties = [{ id: 'PRT-99' }];
        logoutUser();
        if (state.liveMasters.parties.length === 0) {
            console.log('✔ logoutUser() cleared state.liveMasters.parties');
        } else {
            console.error('✘ logoutUser() did not clear state.liveMasters.parties');
            process.exit(1);
        }

        console.log('\n============================================================');
        console.log('ALL PARTIES MASTER UNIT TESTS PASSED');
        console.log('============================================================');
    } catch (err) {
        console.error('✘ Test failure:', err);
        process.exit(1);
    }
})();
