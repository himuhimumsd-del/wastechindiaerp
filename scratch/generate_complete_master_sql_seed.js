const fs = require('fs');
const { getNewGenerateDummyDataCode } = require('./generate_and_apply_one_month_demo.js');
const vm = require('vm');

const originalMasters = JSON.parse(fs.readFileSync('scratch/original_masters.json', 'utf8'));
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
-- ECOMANAGE ERP: COMPLETE 1-MONTH OPERATIONAL & MASTER DEMO SEED
-- Covers: Units, PO Types, Parties, Items, Vehicles, Machinery, Consumables, Employees,
--         Orders (PO Issued/Received), Trips (Logistics/LR/Weighments),
--         Gate Entries, GRN (Goods Receipt Notes), Sales Invoices,
--         Machine Logs, Consumables Movements, Attendance, Payroll Ledger.
-- Date Period: 2026-09-16 to 2026-10-15 (Current FY 2026-2027)
-- ==============================================================================

-- 1. UNITS (Global Units of Measure)
INSERT INTO public.units (id, name, description, is_active)
VALUES
    ('UNT-1', 'MT', 'Metric Ton', true),
    ('UNT-2', 'KG', 'Kilogram', true),
    ('UNT-3', 'Nos.', 'Numbers / Pieces', true),
    ('UNT-4', 'litre', 'Litres', true),
    ('UNT-5', 'BUNDLE', 'Bundles', true),
    ('UNT-6', 'MTR', 'Metres', true),
    ('UNT-7', 'BOX', 'Boxes', true),
    ('UNT-8', 'packet', 'Packets', true),
    ('UNT-9', 'set', 'Sets', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;

-- 2. PO TYPES (Order Types)
INSERT INTO public.po_types (id, name, description, is_active)
VALUES
    ('POT-1', 'Material', 'Raw Materials and Scraps', true),
    ('POT-2', 'Transport', 'Freight and Transportation', true),
    ('POT-3', 'Service', 'Processing and Job Work', true),
    ('POT-4', 'Fixed Asset', 'Capital Goods and Machinery', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;

-- 3. PARTIES MASTER (17 Verified Commercial Partners)
`;

originalMasters.partiesMaster.forEach(p => {
    const typesArr = "ARRAY[" + (p.type || ['Client']).map(t => `'${t}'`).join(', ') + "]::TEXT[]";
    const name = p.name.replace(/'/g, "''");
    const addr = (p.address || '').replace(/'/g, "''");
    const street1 = (p.street1 || '').replace(/'/g, "''");
    const street2 = (p.street2 || '').replace(/'/g, "''");
    const city = (p.city || '').replace(/'/g, "''");
    const district = (p.district || p.city || '').replace(/'/g, "''");
    const state = (p.state || 'Chhattisgarh').replace(/'/g, "''");
    const pin = p.pinCode || p.pincode || '492001';
    const cName = (p.contactName || p.primary_contact_name || '').replace(/'/g, "''");
    const cPhone = p.contactNumber || p.primary_contact_phone || '';
    const email = p.email || p.primary_email || '';
    const gstin = p.gstin ? `'${p.gstin}'` : 'NULL';
    const pan = p.pan ? `'${p.pan}'` : 'NULL';
    const cin = p.cin ? `'${p.cin}'` : 'NULL';
    const vCode = p.vendorCode ? `'${p.vendorCode}'` : 'NULL';
    const notGst = p.notGstPayer === true;

    sql += `INSERT INTO public.parties (id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin, primary_address, street1, street2, city, district, state, pincode, primary_contact_name, primary_contact_phone, primary_email, is_active)
VALUES ('${p.id}', '${name}', ${typesArr}, ${vCode}, ${notGst}, ${gstin}, ${pan}, ${cin}, '${addr}', '${street1}', '${street2}', '${city}', '${district}', '${state}', '${pin}', '${cName}', '${cPhone}', '${email}', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, party_types = EXCLUDED.party_types, state = EXCLUDED.state, is_active = true;\n`;
});

sql += `\n-- 4. ITEMS MASTER (33 Items Catalog)\n`;
originalMasters.itemMaster.forEach(item => {
    const name = item.name.replace(/'/g, "''");
    const desc = (item.description || item.name).replace(/'/g, "''");
    const cgst = parseFloat(item.cgst) || 0;
    const sgst = parseFloat(item.sgst) || 0;
    const igst = parseFloat(item.igst) || 0;
    const ugst = parseFloat(item.ugst) || 0;
    sql += `INSERT INTO public.items (id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active)
VALUES ('${item.id}', '${name}', '${item.hsnCode || '3825'}', '${desc}', ${cgst}, ${sgst}, ${igst}, ${ugst}, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, cgst_rate = EXCLUDED.cgst_rate, sgst_rate = EXCLUDED.sgst_rate, igst_rate = EXCLUDED.igst_rate;\n`;
});

sql += `\n-- 5. VEHICLES (Fleet Master)\n`;
sql += `INSERT INTO public.vehicles (id, plant_id, vehicle_no, party_name, party_id, is_active)
VALUES
    ('VEH-1', 'COMP-1', 'CG04NF4358', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-2', 'COMP-1', 'CG04MS9722', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-3', 'COMP-2', 'CG07ZZ1122', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-4', 'COMP-1', 'CG04JB8841', 'KAMLESH SAHU', 'PAR-15', true),
    ('VEH-5', 'COMP-1', 'CG04KU1290', 'DEEPAK BHAIYA', 'PAR-16', true),
    ('VEH-6', 'COMP-2', 'CG04LR7733', 'GGL DPR', 'PAR-23', true)
ON CONFLICT (id) DO UPDATE SET
    vehicle_no = EXCLUDED.vehicle_no, party_name = EXCLUDED.party_name, is_active = true;\n`;

sql += `\n-- 6. MACHINERY (Plant Equipment Master)\n`;
sql += `INSERT INTO public.machinery (id, plant_id, name, type, fuel_type, capacity, status)
VALUES
    ('MAC-1', 'COMP-1', 'Shredder X1', 'Shredder', 'Electric', '5 Ton/hr', 'Active'),
    ('MAC-2', 'COMP-1', 'DG Set 125 KVA', 'DG Set (Generator)', 'Diesel', '125 KVA', 'Active'),
    ('MAC-3', 'COMP-1', 'Hydraulic Baler B-50', 'Baler', 'Electric', '3 Ton/hr', 'Active'),
    ('MAC-4', 'COMP-1', 'Trommel Screen TS-1', 'Other', 'Electric', '10 Ton/hr', 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, type = EXCLUDED.type, fuel_type = EXCLUDED.fuel_type, capacity = EXCLUDED.capacity, status = EXCLUDED.status;\n`;

sql += `\n-- 7. CONSUMABLES (Plant Consumables & Spares)\n`;
sql += `INSERT INTO public.consumables (id, plant_id, name, category, unit_id, reorder_level, last_price, current_stock, status)
VALUES
    ('CON-1', 'COMP-1', 'Shredder Blade Set', 'Spare Part', 'UNT-3', 2, 4500, 8, 'Active'),
    ('CON-2', 'COMP-1', 'Hydraulic Oil (20L)', 'Consumable', 'UNT-4', 40, 180, 120, 'Active'),
    ('CON-3', 'COMP-1', 'Conveyor Fasteners', 'Spare Part', 'UNT-8', 5, 650, 25, 'Active'),
    ('CON-4', 'COMP-1', 'Industrial Grease EP-2', 'Consumable', 'UNT-2', 15, 320, 45, 'Active'),
    ('CON-5', 'COMP-1', 'Safety PPE Kit (Gloves/Helmets)', 'Safety Equipment', 'UNT-9', 10, 450, 30, 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, unit_id = EXCLUDED.unit_id, current_stock = EXCLUDED.current_stock;\n`;

sql += `\n-- 8. EMPLOYEES (Plant Personnel Master)\n`;
sql += `INSERT INTO public.employees (id, plant_id, name, department, doj, basic_pay, hra, allowances, pf_applicable, esi_applicable, advance_balance, ot_rate_per_hr, status)
VALUES
    ('EMP-1', 'COMP-1', 'Super Admin User', 'Management', '2023-01-15', 30000, 15000, 5000, 'Yes', 'No', 0, 200, 'Active'),
    ('EMP-2', 'COMP-1', 'Ramesh (Guard Raipur)', 'Security', '2024-06-01', 12000, 3000, 1000, 'Yes', 'Yes', 500, 100, 'Active'),
    ('EMP-3', 'COMP-2', 'Suresh (Guard Bhilai)', 'Security', '2024-06-15', 12000, 3000, 1000, 'Yes', 'Yes', 0, 100, 'Active'),
    ('EMP-4', 'COMP-1', 'Dilip Sahu (Machine Operator)', 'Operations', '2024-02-10', 15000, 3500, 1500, 'Yes', 'Yes', 0, 120, 'Active'),
    ('EMP-5', 'COMP-1', 'Santosh Verma (Weighbridge In-charge)', 'Logistics', '2023-11-01', 18000, 4000, 2000, 'Yes', 'Yes', 0, 150, 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, basic_pay = EXCLUDED.basic_pay, status = EXCLUDED.status;\n`;

sql += `\n-- 9. COMMERCIAL ORDERS (PO Issued / Purchase Orders)\n`;
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

sql += `\n-- 10. COMMERCIAL ORDERS (PO Received / Sales Orders)\n`;
d.poReceived.forEach(po => {
    const partyId = partyMap[po.party] || 'PAR-9';
    const itemId = itemMap[po.itemName] || 'ITM-4';
    const rate = parseFloat(po.itemRate) || 0;
    const totalQty = parseFloat(po.totalQty) || 0;
    const consumedQty = parseFloat(po.consumedQty) || 0;
    const balanceQty = parseFloat(po.balanceQty) || 0;
    sql += `INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', '${po.id}', '${po.date}', '${po.dueDate}', 'POT-1', '${po.companyId}', '${partyId}', '${itemId}', 'UNT-1', ${rate}, ${totalQty}, ${consumedQty}, ${balanceQty}, '${po.status}', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;\n`;
});

sql += `\n-- 11. LOGISTICS TRIPS & WEIGHBRIDGE (30 Trips: Gross/Tare/Net, E-Way Bill, Driver)\n`;
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

sql += `\n-- 12. GATE VERIFICATION (30 Gate Passes)\n`;
d.gateVerification.forEach(g => {
    const statusVal = g.type.includes('Inward') ? 'Verified - Allowed Entry' : 'Verified - Allowed Exit';
    sql += `INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('${g.id}', '${g.companyId}', '${g.type}', '${g.vehicleNo}', '${g.driverName}', '${g.driverPhone}', '${statusVal}', '${g.remarks.replace(/'/g, "''")}');\n`;
});

sql += `\n-- 13. GOODS RECEIPT NOTES (14 GRNs)\n`;
d.grn.forEach(grn => {
    const partyId = partyMap[grn.client] || 'PAR-20';
    const totalWt = parseFloat(grn.totalWeight) || 0;
    const shortage = parseFloat(grn.totalShortage) || 0;
    sql += `INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('${grn.id}', '${grn.companyId}', '${partyId}', '${grn.poRef}', '${grn.fromDate}', '${grn.toDate}', 'Good', ${totalWt}, ${shortage}, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;\n`;
});

sql += `\n-- 14. SALES INVOICES (15 GST Tax Invoices)\n`;
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
VALUES ('${inv.id}', '${inv.companyId}', (SELECT tax_identity_id FROM public.plants WHERE id = '${inv.companyId}' LIMIT 1), '${partyId}', '${inv.poRef}', '${inv.date}', '${inv.date}', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', '${inv.client.replace(/'/g, "''")}', 'Consignee Plant Site', '${isInterState ? 'Bihar' : 'Chhattisgarh'}', '${isInterState ? '10' : '22'}', ${taxable}, ${cgst}, ${sgst}, ${igst}, ${total}, ${inv.status === 'Paid' ? total : 0}, ${inv.status === 'Paid' ? 0 : total}, '${statusVal}', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;\n`;
});

sql += `\n-- 15. ATTENDANCE (152 Daily Attendance Records)\n`;
d.attendance.forEach(att => {
    const hrs = parseFloat(att.totalHours) || 0;
    sql += `INSERT INTO public.attendance (plant_id, emp_id, attendance_date, status, work_hours)
VALUES ('${att.companyId}', '${att.empId}', '${att.date}', '${att.status}', ${hrs})
ON CONFLICT (emp_id, attendance_date) DO UPDATE SET status = EXCLUDED.status, work_hours = EXCLUDED.work_hours;\n`;
});

sql += `\n-- 16. PAYROLL LEDGER (September 2026 Paid + October 2026 Draft)\n`;
d.payrollLedger.forEach(pl => {
    const month = parseInt(pl.monthYear.split('-')[1]);
    const year = parseInt(pl.monthYear.split('-')[0]);
    sql += `INSERT INTO public.payroll_ledger (plant_id, emp_id, month, year, payable_days, present_days, gross_salary, pf_employee, esi_employee, pt_deduction, total_deductions, net_salary, status)
VALUES ('${pl.companyId}', '${pl.empId}', ${month}, ${year}, ${pl.payableDays}, ${pl.presentDays}, ${pl.grossEarned}, ${pl.pfDeduction}, ${pl.esiDeduction}, ${pl.ptDeduction}, ${pl.totalDeductions}, ${pl.netSalary}, '${pl.status}')
ON CONFLICT (emp_id, month, year) DO UPDATE SET gross_salary = EXCLUDED.gross_salary, net_salary = EXCLUDED.net_salary, status = EXCLUDED.status;\n`;
});

sql += `\n-- 17. MACHINE LOGS (45 Daily Machinery Operating Logs)\n`;
d.machineLogs.forEach(ml => {
    const machId = ml.machine === 'Shredder X1' ? 'MAC-1' : 'MAC-2';
    const hrs = parseFloat(ml.runningHours) || 0;
    const diesel = parseFloat(ml.dieselConsumed) || 0;
    const kwh = parseFloat(ml.elecUsed) || 0;
    const remarks = ml.remarks ? ml.remarks.replace(/'/g, "''") : '';
    sql += `INSERT INTO public.machine_logs (plant_id, machine_id, log_date, hours_run, fuel_consumed_litres, units_consumed_kwh, remarks)
VALUES ('${ml.companyId}', '${machId}', '${ml.date}', ${hrs}, ${diesel}, ${kwh}, '${remarks}');\n`;
});

sql += `\n-- 18. CONSUMABLE MOVEMENTS (16 Stock In & Machine Issues)\n`;
d.consumableLogs.forEach((cl, idx) => {
    const movType = cl.movementType.includes('Purchased') ? 'Stock In (Purchase)' : 'Issue to Machine';
    const machId = cl.machine || (movType === 'Issue to Machine' ? 'MAC-1' : null);
    const machVal = machId ? `'${machId}'` : 'NULL';
    const remarks = cl.remarks ? cl.remarks.replace(/'/g, "''") : '';
    sql += `INSERT INTO public.consumable_movements (movement_number, consumable_id, plant_id, movement_type, movement_date, qty, unit_price, total_cost, machine_id, remarks)
VALUES ('MOV-${1000 + idx}', '${cl.consumable}', '${cl.companyId}', '${movType}', '${cl.date}', ${parseFloat(cl.quantity) || 0}, ${parseFloat(cl.pricePerUnit) || 0}, ${parseFloat(cl.totalAmount) || 0}, ${machVal}, '${remarks}');\n`;
});

fs.writeFileSync('supabase/seed_demo_month.sql', sql, 'utf8');
console.log('Successfully written self-contained master seed to supabase/seed_demo_month.sql! Size:', fs.statSync('supabase/seed_demo_month.sql').size, 'bytes');
