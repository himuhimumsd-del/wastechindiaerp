const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('--- 1. STATIC PATTERN CHECKS ---');
assert(appJsContent.includes(".from('sales_invoices')"), "Must contain from('sales_invoices')");
assert(appJsContent.includes(".from('vendor_invoices')"), "Must contain from('vendor_invoices')");
assert(appJsContent.includes("function buildLiveSalesInvoicePayload"), "Must contain buildLiveSalesInvoicePayload");
assert(appJsContent.includes("function buildLiveVendorInvoicePayload"), "Must contain buildLiveVendorInvoicePayload");
assert(appJsContent.includes("async function processSalesInvoiceSave"), "Must contain processSalesInvoiceSave");
assert(appJsContent.includes("async function processVendorInvoiceSave"), "Must contain processVendorInvoiceSave");
console.log('✓ All required invoice functions and table references present.');

console.log('\n--- 2. FUNCTIONAL SANDBOX EXECUTION ---');
const validBizUuid = '11111111-1111-1111-1111-111111111111';
const validTaxUuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const validBankUuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const activePlantId = '22222222-2222-2222-2222-222222222222';
const otherPlantId = '99999999-9999-9999-9999-999999999999';

const state = {
    authAuthorized: true,
    currentUser: { authUid: 'user-uuid-1234', username: 'testuser' },
    currentCompany: activePlantId,
    activePlantId: activePlantId,
    activeBusinessId: validBizUuid,
    authorizedPlants: [
        { id: activePlantId, business_id: validBizUuid, name: 'Plant 1', tax_identity_id: validTaxUuid, default_bank_account_id: validBankUuid, state: 'Gujarat' },
        { id: otherPlantId, business_id: validBizUuid, name: 'Plant 2', tax_identity_id: validTaxUuid, default_bank_account_id: validBankUuid, state: 'Maharashtra' }
    ],
    data: {
        poReceived: [
            { id: 'PO-REC-101', dbId: '10101010-1010-1010-1010-101010101010', poNumber: 'PO-REC-101', party: 'Acme Corp', itemName: 'Solid Waste Material', itemId: '44444444-4444-4444-4444-444444444444', itemRate: 1500, unit: 'MT', cgst: 2.5, sgst: 2.5, igst: 0, companyId: activePlantId }
        ],
        poIssued: [
            { id: 'PO-ISS-201', dbId: '20202020-2020-2020-2020-202020202020', poNumber: 'PO-ISS-201', party: 'Supplier X', itemName: 'Chemical Reagent', itemId: '55555555-5555-5555-5555-555555555555', itemRate: 500, unit: 'litre', companyId: activePlantId }
        ],
        grn: [
            { id: 'GRN-301', dbId: '30303030-3030-3030-3030-303030303030', grnNumber: 'GRN-301', poRef: 'PO-REC-101', totalWeight: 35.5, companyId: activePlantId }
        ],
        invoices: [],
        receivedInvoice: [],
        partiesMaster: [
            { id: '33333333-3333-3333-3333-333333333333', name: 'Acme Corp', legal_name: 'Acme Corp Ltd', gstin: '24ABCDE1234F1Z5', state: 'Gujarat', state_code: '24', companyId: activePlantId },
            { id: '33333333-3333-3333-3333-333333333334', name: 'Cross Corp', legal_name: 'Cross Corp Ltd', gstin: '27XYZAB5678G1Z9', state: 'Maharashtra', state_code: '27', companyId: otherPlantId },
            { id: '44444444-3333-3333-3333-333333333333', name: 'Supplier X', legal_name: 'Supplier X Private Ltd', gstin: '24SUPPX1234F1Z8', state: 'Gujarat', companyId: activePlantId }
        ],
        itemMaster: [
            { id: '44444444-4444-4444-4444-444444444444', name: 'Solid Waste Material', hsnCode: '3825', cgst: 2.5, sgst: 2.5, igst: 0, companyId: activePlantId }
        ],
        companyMaster: [
            { id: activePlantId, name: 'Wastech Unit 1', state: 'Gujarat', gstin: '24WASTE0000A1Z1' }
        ]
    },
    liveMasters: {
        plants: [
            { id: activePlantId, business_id: validBizUuid, tax_identity_id: validTaxUuid, default_bank_account_id: validBankUuid }
        ],
        parties: [
            { id: '33333333-3333-3333-3333-333333333333', name: 'Acme Corp', legal_name: 'Acme Corp Ltd', gstin: '24ABCDE1234F1Z5', state: 'Gujarat', state_code: '24', companyId: activePlantId },
            { id: '33333333-3333-3333-3333-333333333334', name: 'Cross Corp', legal_name: 'Cross Corp Ltd', gstin: '27XYZAB5678G1Z9', state: 'Maharashtra', state_code: '27', companyId: otherPlantId },
            { id: '44444444-3333-3333-3333-333333333333', name: 'Supplier X', legal_name: 'Supplier X Private Ltd', gstin: '24SUPPX1234F1Z8', state: 'Gujarat', companyId: activePlantId }
        ],
        invoices: [],
        receivedInvoice: []
    }
};

const assertAuthorizedPlant = (pId) => state.authorizedPlants.find(p => p.id === pId) || null;
const getCurrentAuthorizedPlant = () => state.authorizedPlants.find(p => p.id === state.currentCompany) || null;
const getCurrentAuthorizedBusiness = () => ({ id: validBizUuid });
const getLiveParties = () => state.liveMasters.parties;
const getFinancialYear = (d, p) => '2026-2027';
const addDaysToDate = (d, days) => '2026-11-05';

const sandboxContext = {
    window: {},
    state,
    assertAuthorizedPlant,
    getCurrentAuthorizedPlant,
    getCurrentAuthorizedBusiness,
    getLiveParties,
    getFinancialYear,
    addDaysToDate,
    console
};
vm.createContext(sandboxContext);

// Extract buildLiveSalesInvoicePayload and buildLiveVendorInvoicePayload
const extractPayloadCode = `
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
` + appJsContent.substring(
    appJsContent.indexOf('function buildLiveSalesInvoicePayload'),
    appJsContent.indexOf('async function hydrateLiveMasterData')
);

vm.runInContext(extractPayloadCode, sandboxContext);

// --- TEST 1: Sales Invoice Payload Construction ---
console.log('Testing buildLiveSalesInvoicePayload...');
const validSalesRecord = {
    id: 'INV-2026-001',
    date: '2026-10-06',
    client: 'Acme Corp',
    poRef: 'PO-REC-101',
    createWithGrn: true,
    grnRef: 'GRN-301',
    paymentTermsDays: '30',
    totalQty: 35.5,
    amount: 53250,
    taxAmount: 2662.5,
    totalAmount: 55912.5,
    status: 'Generated',
    plantId: activePlantId
};

const salesPayload = sandboxContext.buildLiveSalesInvoicePayload(validSalesRecord);
assert.strictEqual(salesPayload.invoice_number, 'INV-2026-001');
assert.strictEqual(salesPayload.business_id, validBizUuid);
assert.strictEqual(salesPayload.plant_id, activePlantId);
assert.strictEqual(salesPayload.tax_identity_id, validTaxUuid);
assert.strictEqual(salesPayload.bank_account_id, validBankUuid);
assert.strictEqual(salesPayload.party_id, '33333333-3333-3333-3333-333333333333');
assert.strictEqual(salesPayload.order_id, '10101010-1010-1010-1010-101010101010');
assert.strictEqual(salesPayload.po_ref, 'PO-REC-101');
assert.strictEqual(salesPayload.grn_id, '30303030-3030-3030-3030-303030303030');
assert.strictEqual(salesPayload.grn_ref, 'GRN-301');
assert.strictEqual(salesPayload.status, 'Issued'); // 'Generated' maps to DB enum 'Issued'
assert.strictEqual(salesPayload.buyer_name, 'Acme Corp');
assert.strictEqual(salesPayload.buyer_gstin, '24ABCDE1234F1Z5');
assert(Array.isArray(salesPayload.items), 'items must be JSONB array');
assert.strictEqual(salesPayload.items.length, 1);
assert.strictEqual(salesPayload.items[0].qty, 35.5);
assert.strictEqual(salesPayload.items[0].rate, 1500);
console.log('✓ buildLiveSalesInvoicePayload passed with exact column and JSONB mapping');

// --- TEST 2: Sales Invoice Cross-Plant Isolation ---
console.log('Testing Sales Invoice cross-plant party rejection...');
assert.throws(() => {
    sandboxContext.buildLiveSalesInvoicePayload({
        ...validSalesRecord,
        client: 'Cross Corp'
    });
}, /belongs to plant "99999999-9999-9999-9999-999999999999"/);
console.log('✓ Cross-plant client correctly rejected');

// --- TEST 3: Sales Invoice Missing PO Reference ---
console.log('Testing Sales Invoice missing PO reference rejection...');
assert.throws(() => {
    sandboxContext.buildLiveSalesInvoicePayload({
        ...validSalesRecord,
        poRef: ''
    });
}, /PO Reference is required/);
console.log('✓ Missing PO reference correctly rejected');

// --- TEST 4: Vendor Invoice Payload Construction ---
console.log('Testing buildLiveVendorInvoicePayload...');
const validVendorRecord = {
    id: 'VINV-9999',
    vendorInvoiceNumber: 'VINV-9999',
    date: '2026-10-06',
    dueDate: '2026-11-06',
    vendor: 'Supplier X',
    poRef: 'PO-ISS-201',
    qty: 100,
    rate: 500,
    amount: 50000,
    taxAmount: 9000,
    totalAmount: 59000,
    status: 'Pending',
    plantId: activePlantId
};

const vendorPayload = sandboxContext.buildLiveVendorInvoicePayload(validVendorRecord);
assert.strictEqual(vendorPayload.vendor_invoice_no, 'VINV-9999');
assert.strictEqual(vendorPayload.business_id, validBizUuid);
assert.strictEqual(vendorPayload.plant_id, activePlantId);
assert.strictEqual(vendorPayload.party_id, '44444444-3333-3333-3333-333333333333');
assert.strictEqual(vendorPayload.order_id, '20202020-2020-2020-2020-202020202020');
assert.strictEqual(vendorPayload.po_issued_ref, 'PO-ISS-201');
assert.strictEqual(vendorPayload.status, 'Pending Approval'); // 'Pending' maps to DB enum 'Pending Approval'
assert(Array.isArray(vendorPayload.items), 'items must be JSONB array');
assert.strictEqual(vendorPayload.items.length, 1);
assert.strictEqual(vendorPayload.items[0].qty, 100);
assert.strictEqual(vendorPayload.items[0].rate, 500);
assert.strictEqual(vendorPayload.total_amount, 59000);
console.log('✓ buildLiveVendorInvoicePayload passed with exact column and JSONB mapping');

// --- TEST 5: Vendor Invoice Cross-Plant Isolation ---
console.log('Testing Vendor Invoice cross-plant vendor rejection...');
assert.throws(() => {
    sandboxContext.buildLiveVendorInvoicePayload({
        ...validVendorRecord,
        vendor: 'Cross Corp'
    });
}, /belongs to plant "99999999-9999-9999-9999-999999999999"/);
console.log('✓ Cross-plant vendor correctly rejected');

// --- TEST 6: Normalizers Parity ---
console.log('Testing normalizeLiveInvoice and normalizeLiveReceivedInvoice...');
const mockDbSalesRow = {
    id: '55555555-5555-5555-5555-555555555555',
    invoice_number: 'INV-2026-001',
    business_id: validBizUuid,
    plant_id: activePlantId,
    tax_identity_id: validTaxUuid,
    party_id: '33333333-3333-3333-3333-333333333333',
    buyer_name: 'Acme Corp',
    po_ref: 'PO-REC-101',
    order_id: '10101010-1010-1010-1010-101010101010',
    grn_ref: 'GRN-301',
    grn_id: '30303030-3030-3030-3030-303030303030',
    invoice_date: '2026-10-06',
    due_date: '2026-11-05',
    payment_terms_days: 30,
    items: [{ qty: 35.5, rate: 1500, amount: 53250 }],
    taxable_amount: 53250,
    cgst_amount: 1331.25,
    sgst_amount: 1331.25,
    igst_amount: 0,
    round_off: 0,
    total_amount: 55912.5,
    paid_amount: 0,
    balance_amount: 55912.5,
    status: 'Issued'
};

const extractNormCode = appJsContent.substring(
    appJsContent.indexOf('function normalizeLiveInvoice'),
    appJsContent.indexOf('function normalizeLiveTrip')
);
vm.runInContext(extractNormCode, sandboxContext);

const normSales = sandboxContext.normalizeLiveInvoice(mockDbSalesRow);
assert.strictEqual(normSales.id, 'INV-2026-001');
assert.strictEqual(normSales.db_id, '55555555-5555-5555-5555-555555555555');
assert.strictEqual(normSales.totalQty, 35.5);
assert.strictEqual(normSales.amount, 53250);
assert.strictEqual(normSales.status, 'Generated'); // DB 'Issued' mapped to UI 'Generated'
assert.strictEqual(normSales.db_status, 'Issued');
assert.strictEqual(normSales._isLive, true);
console.log('✓ normalizeLiveInvoice passed with DB-to-UI status translation and amounts');

const mockDbVendorRow = {
    id: '66666666-6666-6666-6666-666666666666',
    vendor_invoice_no: 'VINV-9999',
    business_id: validBizUuid,
    plant_id: activePlantId,
    party_id: '44444444-3333-3333-3333-333333333333',
    party_name: 'Supplier X',
    po_issued_ref: 'PO-ISS-201',
    invoice_date: '2026-10-06',
    due_date: '2026-11-06',
    items: [{ qty: 100, rate: 500, amount: 50000 }],
    taxable_amount: 50000,
    cgst_amount: 4500,
    sgst_amount: 4500,
    total_amount: 59000,
    status: 'Pending Approval'
};
const normVendor = sandboxContext.normalizeLiveReceivedInvoice(mockDbVendorRow);
assert.strictEqual(normVendor.id, '66666666-6666-6666-6666-666666666666');
assert.strictEqual(normVendor.vendorInvoiceNumber, 'VINV-9999');
assert.strictEqual(normVendor.qty, 100);
assert.strictEqual(normVendor.rate, 500);
assert.strictEqual(normVendor.status, 'Pending'); // DB 'Pending Approval' mapped to UI 'Pending'
assert.strictEqual(normVendor.db_status, 'Pending Approval');
assert.strictEqual(normVendor._isLive, true);
console.log('✓ normalizeLiveReceivedInvoice passed with DB-to-UI status translation and amounts');

// --- TEST 7: JSONB Custom Items Preservation ---
console.log('Testing custom JSONB line items preservation...');
const multiLineRecord = {
    ...validSalesRecord,
    items: [
        { item_name: 'Line Item 1', qty: 10, rate: 1000, amount: 10000, totalAmount: 10500 },
        { item_name: 'Line Item 2', qty: 20, rate: 2000, amount: 40000, totalAmount: 42000 }
    ]
};
const multiLinePayload = sandboxContext.buildLiveSalesInvoicePayload(multiLineRecord);
assert.strictEqual(multiLinePayload.items.length, 2);
assert.strictEqual(multiLinePayload.items[0].item_name, 'Line Item 1');
assert.strictEqual(multiLinePayload.items[0].qty, 10);
assert.strictEqual(multiLinePayload.items[1].item_name, 'Line Item 2');
assert.strictEqual(multiLinePayload.items[1].qty, 20);
console.log('✓ Multi-item JSONB array preserved accurately');

// --- TEST 8: Delete Protections on Invoices ---
console.log('Testing deleteRecord protection for invoices & receivedInvoice...');
assert(appJsContent.includes("Sales invoices are statutory financial documents and cannot be deleted once created"), "Must have sales invoice delete protection");
assert(appJsContent.includes("Vendor invoice deletion is restricted to protect purchase orders and GRN audit integrity"), "Must have vendor invoice delete protection");
console.log('✓ Deletion protections intact without fake local deletions');

console.log('\n--- ALL WAVE 11.6 SANDBOX TESTS PASSED SUCCESSFULLY! ---');

