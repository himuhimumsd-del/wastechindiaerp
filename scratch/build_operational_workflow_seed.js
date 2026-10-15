const fs = require('fs');
const vm = require('vm');
const { getNewGenerateDummyDataCode } = require('./generate_and_apply_one_month_demo.js');

const masters = JSON.parse(fs.readFileSync('scratch/original_masters.json', 'utf8'));
const appJs = fs.readFileSync('frontend/app.js', 'utf8');
const pStart = appJs.indexOf('const indianStates =');
const pEnd = appJs.indexOf('// --- 2. STATE & DUMMY DATA ---');
let configCode = appJs.substring(pStart, pEnd);
configCode += '\nglobalThis.modulesConfig = modulesConfig;';

const code = getNewGenerateDummyDataCode();
const sandbox = { dummyPodSvg: '', window: {}, document: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(configCode, sandbox);
vm.runInContext(code + '\nglobalThis.data = generateDummyData();', sandbox);

const d = sandbox.data;

let sql = `-- ==============================================================================
-- ECOMANAGE ERP: OPERATIONAL WORKFLOW DEMO SEED
-- Scope: PO Issued & Received -> Fleet & Gate Security -> Weighbridge Trips -> GRN -> Sales Invoices
-- Period: 2026-09-16 to 2026-10-15 (1 Month of Realistic Operations)
-- ==============================================================================

-- 0. PREREQUISITE REFERENCES (Safety guards: Ensure foreign keys exist with ON CONFLICT DO NOTHING)

-- 0.1 PO Types
INSERT INTO public.po_types (id, name, is_active)
VALUES
    ('POT-1', 'Raw Material Purchase', true),
    ('POT-2', 'Finished Goods Sale', true),
    ('POT-3', 'Transport Service', true)
ON CONFLICT (id) DO NOTHING;

-- 0.2 Measurement Units
INSERT INTO public.units (id, name, symbol, is_active)
VALUES
    ('UNT-1', 'Metric Ton', 'MT', true),
    ('UNT-2', 'Kilogram', 'KG', true),
    ('UNT-3', 'Pieces', 'PCS', true),
    ('UNT-4', 'Litre', 'LTR', true)
ON CONFLICT (id) DO NOTHING;

-- 0.3 Items Master
INSERT INTO public.items (id, name, code, category, default_unit_id, is_active)
VALUES
    ('ITM-1', 'RDF Raw', 'RM001', 'Raw Material', 'UNT-1', true),
    ('ITM-2', 'RDF', 'FG001', 'Finished Goods', 'UNT-1', true),
    ('ITM-3', 'PLYWOOD WASTE', 'RM002', 'Raw Material', 'UNT-1', true),
    ('ITM-4', 'SHREDDED RDF', 'FG002', 'Finished Goods', 'UNT-1', true),
    ('ITM-5', 'PLASTIC WASTE', 'RM003', 'Raw Material', 'UNT-1', true),
    ('ITM-6', 'HYDRAULIC OIL 68', 'CON001', 'Consumables', 'UNT-4', true),
    ('ITM-7', 'AGRO WASTE', 'RM004', 'Raw Material', 'UNT-1', true),
    ('ITM-8', 'EPR Credit Cat 2', 'EPR001', 'Services', 'UNT-1', true),
    ('ITM-9', 'MSW', 'RM005', 'Raw Material', 'UNT-1', true),
    ('ITM-10', 'PAPER WASTE', 'RM006', 'Raw Material', 'UNT-1', true),
    ('ITM-11', 'MIXED PLASTIC SCRAP', 'RM007', 'Raw Material', 'UNT-1', true),
    ('ITM-12', 'CARDBOARD BALES', 'FG003', 'Finished Goods', 'UNT-1', true)
ON CONFLICT (id) DO NOTHING;

-- 0.4 Parties Directory (Guarantees foreign keys for Vehicles, Orders, Trips, GRN, Invoices)
INSERT INTO public.parties (id, name, party_types, not_gst_payer, gstin, pan, city, state, is_active)
VALUES
    ('PAR-1', 'TIKAM CHAND JAIN', ARRAY['Supplier']::TEXT[], false, '22AABCT1234F1Z5', 'AABCT1234F', 'Raipur', 'Chhattisgarh', true),
    ('PAR-2', 'MP WASTE MGT', ARRAY['Client']::TEXT[], false, '23AAICG8184C1ZP', 'FGHIE5678J', 'Indore', 'Madhya Pradesh', true),
    ('PAR-3', 'FAST LOGISTICS', ARRAY['Transporter']::TEXT[], true, NULL, 'LMNOP9012K', 'Raipur', 'Chhattisgarh', true),
    ('PAR-9', 'ACC LIMITED (Jamul)', ARRAY['Client']::TEXT[], false, '22AAACT1507C1Z7', 'AAACT1507C1', 'Jamul', 'Chhattisgarh', true),
    ('PAR-10', 'GG WASTECH PRIVATE LIMITED', ARRAY['Supplier', 'Transporter']::TEXT[], false, '22AAICG8184C1ZP', 'AAICG8184C1', 'Raipur', 'Chhattisgarh', true),
    ('PAR-11', 'GG ORGANICS', ARRAY['Supplier', 'Transporter']::TEXT[], false, '22AAGFG4433K1Z1', 'AAGFG4433K', 'Raipur', 'Chhattisgarh', true),
    ('PAR-13', 'DALMIA CEMENT (BHARAT) LIMITED', ARRAY['Client']::TEXT[], false, '10AAACD0149G1Z8', 'AAACD0149G', 'Banjari', 'Bihar', true),
    ('PAR-14', 'SHREE RAIPUR CEMENT PLANT', ARRAY['Client']::TEXT[], false, '22AAACS0598K1ZB', 'AAACS0598K', 'Baloda Bazar', 'Chhattisgarh', true),
    ('PAR-15', 'KAMLESH SAHU', ARRAY['Supplier', 'Transporter']::TEXT[], true, NULL, 'ABCPS1234K', 'Raipur', 'Chhattisgarh', true),
    ('PAR-16', 'DEEPAK BHAIYA', ARRAY['Supplier', 'Transporter']::TEXT[], true, NULL, 'XYZPD5678L', 'Raipur', 'Chhattisgarh', true),
    ('PAR-17', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', ARRAY['Supplier']::TEXT[], false, '29AAGCS3321M1Z4', 'AAGCS3321M', 'Bengaluru', 'Karnataka', true),
    ('PAR-18', 'Ajay Singh', ARRAY['Supplier']::TEXT[], true, NULL, 'BCDPS9988N', 'Raipur', 'Chhattisgarh', true),
    ('PAR-19', 'HBMCPL AND EOWS JV', ARRAY['Supplier']::TEXT[], false, '22AABCH9911P1Z2', 'AABCH9911P', 'Bhilai', 'Chhattisgarh', true),
    ('PAR-20', 'DELHI MSW RAIPUR', ARRAY['Supplier']::TEXT[], false, '22AAGCD5544L1Z9', 'AAGCD5544L', 'Raipur', 'Chhattisgarh', true),
    ('PAR-21', 'RAMNIWAS INFRA BUILD PVT LTD', ARRAY['Client']::TEXT[], false, '22AAACR7766N1Z7', 'AAACR7766N', 'Raipur', 'Chhattisgarh', true),
    ('PAR-22', 'SLV WASTE MANAGEMENT PVT LTD', ARRAY['Supplier']::TEXT[], false, '29AAGCS3321M1Z4', 'AAGCS3321M', 'Bengaluru', 'Karnataka', true),
    ('PAR-23', 'GGL DPR', ARRAY['Supplier', 'Transporter']::TEXT[], true, NULL, 'GGLDP1122Q', 'Raipur', 'Chhattisgarh', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    state = EXCLUDED.state,
    is_active = true;

-- 1. VEHICLES (Shared Transport Fleet Master)
INSERT INTO public.vehicles (id, business_id, plant_id, vehicle_no, party_name, party_id, is_active)
VALUES
    ('VEH-1', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04NF4358', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-2', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04MS9722', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-3', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG07ZZ1122', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-4', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04JB8841', 'KAMLESH SAHU', 'PAR-15', true),
    ('VEH-5', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04KU1290', 'DEEPAK BHAIYA', 'PAR-16', true),
    ('VEH-6', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04LR7733', 'GGL DPR', 'PAR-23', true)
ON CONFLICT (id) DO UPDATE SET
    vehicle_no = EXCLUDED.vehicle_no,
    party_name = EXCLUDED.party_name,
    party_id = EXCLUDED.party_id,
    plant_id = NULL,
    is_active = true;

-- 2. COMMERCIAL ORDERS: PO ISSUED (Purchase Orders to Inward Waste Suppliers)
`;

const partyMap = {};
d.partiesMaster.forEach(p => { partyMap[p.name] = p.id; });
partyMap['DELHI MSW RAIPUR'] = 'PAR-20';
partyMap['SLV WASTE MANAGEMENT PRIVATE LIMITED'] = 'PAR-17';
partyMap['MP WASTE MGT'] = 'PAR-2';
partyMap['HBMCPL AND EOWS JV'] = 'PAR-19';
partyMap['GG WASTECH PRIVATE LIMITED'] = 'PAR-10';
partyMap['Ajay Singh'] = 'PAR-18';
partyMap['ACC LIMITED (Jamul)'] = 'PAR-9';
partyMap['DALMIA CEMENT (BHARAT) LIMITED'] = 'PAR-13';
partyMap['SHREE RAIPUR CEMENT PLANT'] = 'PAR-14';
partyMap['TIKAM CHAND JAIN'] = 'PAR-1';

const itemMap = {
    'MSW': 'ITM-9',
    'PLASTIC WASTE': 'ITM-5',
    'AGRO WASTE': 'ITM-7',
    'PLYWOOD WASTE': 'ITM-3',
    'PAPER WASTE': 'ITM-10',
    'MIXED PLASTIC SCRAP': 'ITM-11',
    'CARDBOARD BALES': 'ITM-12',
    'SHREDDED RDF': 'ITM-4',
    'RDF': 'ITM-2',
    'EPR Credit Cat 2': 'ITM-8'
};

d.poIssued.forEach(po => {
    const partyId = partyMap[po.party] || 'PAR-10';
    const itemId = itemMap[po.itemName] || 'ITM-2';
    const rate = parseFloat(po.itemRate) || 0;
    const totalQty = parseFloat(po.totalQty) || 0;
    const consumedQty = parseFloat(po.consumedQty) || 0;
    const balanceQty = parseFloat(po.balanceQty) || 0;
    sql += `INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', '${po.id}', '${po.date}', '${po.dueDate}', 'POT-1', '${po.companyId}', '${partyId}', '${itemId}', 'UNT-1', ${rate}, ${totalQty}, ${consumedQty}, ${balanceQty}, '${po.status}', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;\n`;
});

sql += `\n-- 3. COMMERCIAL ORDERS: PO RECEIVED (Sales Orders from Cement Plants & Off-takers)\n`;
d.poReceived.forEach(po => {
    const partyId = partyMap[po.party] || 'PAR-9';
    const itemId = itemMap[po.itemName] || 'ITM-4';
    const rate = parseFloat(po.itemRate) || 0;
    const totalQty = parseFloat(po.totalQty) || 0;
    const consumedQty = parseFloat(po.consumedQty) || 0;
    const balanceQty = parseFloat(po.balanceQty) || 0;
    sql += `INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', '${po.id}', '${po.date}', '${po.dueDate}', 'POT-2', '${po.companyId}', '${partyId}', '${itemId}', 'UNT-1', ${rate}, ${totalQty}, ${consumedQty}, ${balanceQty}, '${po.status}', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;\n`;
});

sql += `\n-- 4. LOGISTICS & WEIGHBRIDGE TRIPS (30 Trips: Gross, Tare, Net Weights, E-Way Bill, Driver)\n`;
const vehMap = {
    'CG04NF4358': 'VEH-1',
    'CG04MS9722': 'VEH-2',
    'CG07ZZ1122': 'VEH-3',
    'CG04JB8841': 'VEH-4',
    'CG04KU1290': 'VEH-5',
    'CG04LR7733': 'VEH-6'
};

d.trips.forEach(t => {
    const partyId = partyMap[t.client] || 'PAR-9';
    const vehId = vehMap[t.vehicle] || 'VEH-1';
    const net = parseFloat(t.netWeight) || 0;
    const tare = 14.50;
    const gross = (net + tare).toFixed(2);
    const poRec = t.poReceived ? `'${t.poReceived}'` : 'NULL';
    const poIss = t.poIssued ? `'${t.poIssued}'` : 'NULL';
    const ewb = t.ewbNumber || '';

    sql += `INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('${t.id}', '${t.tripType}', '${t.date}', '${t.companyId}', '${partyId}', ${poRec}, ${poIss}, '${vehId}', 'By Road', '${t.freightPaidBy}', '${t.billType}', '${t.originCity}', '${t.originState}', '${t.destinationCity}', '${t.destinationState}', ${gross}, ${tare}, ${net}, '${t.driverName}', '${t.driverPhone}', '${ewb}', '${t.status}', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;\n`;
});

sql += `\n-- 5. GATE SECURITY VERIFICATION (30 Gate Passes)\n`;
// Clean existing gate entries with these entry numbers so insert is always clean
const gateIds = d.gateVerification.map(g => `'${g.id}'`).join(', ');
sql += `DELETE FROM public.gate_entries WHERE entry_number IN (${gateIds});\n\n`;

d.gateVerification.forEach(g => {
    const statusVal = g.type.includes('Inward') ? 'Verified - Allowed Entry' : 'Verified - Allowed Exit';
    sql += `INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('${g.id}', '${g.companyId}', '${g.type}', '${g.vehicleNo}', '${g.driverName}', '${g.driverPhone}', '${statusVal}', '${g.remarks.replace(/'/g, "''")}');\n`;
});

sql += `\n-- 6. GOODS RECEIPT NOTES (14 GRNs)\n`;
d.grn.forEach(grn => {
    const partyId = partyMap[grn.client] || 'PAR-20';
    const totalWt = parseFloat(grn.totalWeight) || 0;
    const shortage = parseFloat(grn.totalShortage) || 0;
    sql += `INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('${grn.id}', '${grn.companyId}', '${partyId}', '${grn.poRef}', '${grn.fromDate}', '${grn.toDate}', 'Good', ${totalWt}, ${shortage}, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;\n`;
});

sql += `\n-- 7. SALES INVOICES (15 GST Tax Invoices)\n`;
d.invoices.forEach(inv => {
    const partyId = partyMap[inv.client] || 'PAR-9';
    const isInterState = inv.client.includes('DALMIA');
    const taxable = parseFloat(inv.amount) || 0;
    const taxAmt = parseFloat(inv.taxAmount) || 0;
    const total = parseFloat(inv.totalAmount) || 0;
    const cgst = isInterState ? 0 : Math.round(taxAmt / 2);
    const sgst = isInterState ? 0 : Math.round(taxAmt / 2);
    const igst = isInterState ? taxAmt : 0;
    const statusVal = inv.status === 'Paid' ? 'Paid' : 'Issued';

    sql += `INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('${inv.id}', '${inv.companyId}', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = '${inv.companyId}' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), '${partyId}', '${inv.poRef}', '${inv.date}', '${inv.date}', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', '${inv.client.replace(/'/g, "''")}', 'Consignee Plant Site', '${isInterState ? 'Bihar' : 'Chhattisgarh'}', '${isInterState ? '10' : '22'}', ${taxable}, ${cgst}, ${sgst}, ${igst}, ${total}, ${inv.status === 'Paid' ? total : 0}, ${inv.status === 'Paid' ? 0 : total}, '${statusVal}', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;\n`;
});

sql = sql.trim() + '\n';
fs.writeFileSync('supabase/seed_demo_month.sql', sql, 'utf8');
console.log('Successfully generated focused operational workflow SQL in supabase/seed_demo_month.sql! Size:', fs.statSync('supabase/seed_demo_month.sql').size, 'bytes');
