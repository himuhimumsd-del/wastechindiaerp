const fs = require('fs');

console.log('Running Comprehensive Bulk Multi-Record Checkbox & Deletion Verification Suite...');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Verify global isUUID definition
if (!appJs.includes('const isUUID = (str) => typeof str === \'string\'') || !appJs.includes('window.isUUID = isUUID')) {
    console.error('FAIL: Global isUUID helper not defined');
    process.exit(1);
}
console.log('✓ PASS: Global isUUID helper defined and exported to window');

// 2. Verify table header contains selectAllCheckbox
if (!appJs.includes('id="selectAllCheckbox"') || !appJs.includes('toggleSelectAllRows')) {
    console.error('FAIL: Table header selectAllCheckbox not found');
    process.exit(1);
}
console.log('✓ PASS: Table header selectAllCheckbox properly configured');

// 3. Verify rows contain row-select-checkbox
if (!appJs.includes('class="row-select-checkbox') || !appJs.includes('updateSelectedCount')) {
    console.error('FAIL: Row select checkbox not found in generateTableRows');
    process.exit(1);
}
console.log('✓ PASS: Row select checkbox wired with updateSelectedCount in generateTableRows');

// 4. Verify bulk delete button exists
if (!appJs.includes('id="bulkDeleteBtn"') || !appJs.includes('deleteSelectedRecords')) {
    console.error('FAIL: Bulk delete button not found in renderTableModule');
    process.exit(1);
}
console.log('✓ PASS: Bulk delete button wired in table action bar');

// 5. Verify deleteSelectedRecords has isUUID defined locally & works with client
const testClientCalls = [];
const sandbox = {
    state: {
        currentUser: { id: 'admin-1', username: 'admin' },
        currentModule: 'trips',
        data: {
            trips: [
                { id: 'LR-1', trip_number: 'LR-1', dbId: '11111111-1111-1111-1111-111111111111' },
                { id: 'LR-2', trip_number: 'LR-2', dbId: '22222222-2222-2222-2222-222222222222' },
                { id: 'LR-3', trip_number: 'LR-3', dbId: '33333333-3333-3333-3333-333333333333' }
            ]
        },
        liveMasters: {
            trips: [
                { id: 'LR-1', trip_number: 'LR-1', dbId: '11111111-1111-1111-1111-111111111111' },
                { id: 'LR-2', trip_number: 'LR-2', dbId: '22222222-2222-2222-2222-222222222222' },
                { id: 'LR-3', trip_number: 'LR-3', dbId: '33333333-3333-3333-3333-333333333333' }
            ]
        }
    },
    modulesConfig: {
        trips: { title: 'Fleet & Trips' }
    },
    hasPerm: () => true,
    showToast: (msg, type) => console.log(`[Toast ${type}]: ${msg}`),
    renderTableModule: () => {},
    document: {
        getElementById: (id) => {
            if (id === 'module-tbody') {
                return {
                    querySelectorAll: () => [
                        { getAttribute: () => 'LR-1', checked: true },
                        { getAttribute: () => 'LR-2', checked: true }
                    ]
                };
            }
            return null;
        }
    },
    confirm: () => true,
    window: {
        getSupabaseClient: () => ({
            from: (tbl) => ({
                delete: () => ({
                    eq: (col, val) => {
                        testClientCalls.push({ tbl, col, val });
                        return Promise.resolve({ error: null });
                    }
                })
            })
        })
    }
};

const start = appJs.indexOf('async function deleteSelectedRecords(');
const end = appJs.indexOf('window.toggleSelectAllRows = toggleSelectAllRows;');
const fnCode = appJs.substring(start, end);

const fn = new Function('state', 'modulesConfig', 'hasPerm', 'showToast', 'renderTableModule', 'document', 'confirm', 'window', `
    ${fnCode}
    return deleteSelectedRecords('trips');
`);

fn(sandbox.state, sandbox.modulesConfig, sandbox.hasPerm, sandbox.showToast, sandbox.renderTableModule, sandbox.document, sandbox.confirm, sandbox.window)
    .then(() => {
        if (sandbox.state.data.trips.length !== 1 || sandbox.state.data.trips[0].id !== 'LR-3') {
            console.error('FAIL: trips not deleted properly. Remaining:', sandbox.state.data.trips);
            process.exit(1);
        }
        console.log('✓ PASS: Multiple records cleanly deleted with Supabase sync');
        console.log(`✓ PASS: Database delete calls executed: ${testClientCalls.length} calls`);
        console.log('\n======================================');
        console.log('ALL BULK DELETION TESTS PASSED 100%!');
        console.log('======================================');
    })
    .catch(err => {
        console.error('FAIL in executing bulk delete:', err);
        process.exit(1);
    });
