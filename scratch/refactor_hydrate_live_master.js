const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../frontend/app.js');
let raw = fs.readFileSync(filePath, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// Target the start of hydrateLiveMasterData try block including full bizRes call
const tryStart = `            try {
                // 1. Live Businesses (constrained strictly to authorized businesses)
                const bizRes = await fetchLiveMaster(
                    'businesses',
                    'id, code, legal_name, pan, cin, fy_start_month, logo_url, is_active',
                    { in: { column: 'id', values: authBizIds }, eq: { is_active: true } }
                );`;

if (!code.includes(tryStart)) {
    console.error('Could not find tryStart marker!');
    process.exit(1);
}

// Build the parallelized version
const parallelSetup = `            try {
                // Pre-define columns for parallel queries
                const plantCols = 'id, business_id, tax_identity_id, default_bank_account_id, plant_name, trade_name, phone, spcb_auth, epr_reg_no, physical_address, plant_lat, plant_lng, geofence_radius, geofence_enabled, attendance_selfie_required, is_active';
                const itemCols = 'id, name, hsn_code, description, default_unit_id, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active';
                const partyCols = 'id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin, primary_address, street1, street2, city, district, state, pincode, primary_contact_name, primary_contact_phone, primary_email, is_active';
                const vehicleCols = 'id, business_id, plant_id, "companyId", vehicle_no, party_name, party_id, vehicle_type, capacity_mt, is_active';
                const machCols = 'id, business_id, plant_id, "companyId", name, type, fuel_type, capacity, status';
                const conCols = 'id, business_id, plant_id, "companyId", name, category, unit_id, reorder_level, last_price, current_stock, status';
                const shiftCols = 'id, plant_id, name, start_time, end_time, grace_period_mins, min_hours_full_day, min_hours_half_day, is_active';
                const empCols = 'id, business_id, plant_id, "companyId", name, department, shift_name, shift_id, doj, basic_pay, hra, allowances, pf_applicable, esi_applicable, advance_balance, ot_rate_per_hr, allocated_paid_leaves, bank_name, account_no, ifsc_code, pan_no, aadhar_no, uan_no, esic_no, status, created_at, updated_at';
                const attCols = 'id, emp_id, business_id, plant_id, "companyId", attendance_date, status, shift_id, shift_name, check_in, check_out, work_hours, ot_hours, remarks, created_by, created_at, updated_at';
                const payrollCols = 'id, emp_id, business_id, plant_id, "companyId", month, year, payable_days, present_days, paid_leaves, unpaid_leaves, weekly_offs, holidays, ot_hours, basic_earned, hra_earned, allowances_earned, ot_amount, gross_salary, pf_employee, pf_employer_epf, pf_employer_eps, pf_admin_charges, esi_employee, esi_employer, pt_deduction, advance_deduction, other_deductions, total_deductions, net_salary, status, payment_mode, payment_date, transaction_ref, remarks, created_by, created_at, updated_at';
                const machineLogCols = 'id, machine_id, business_id, plant_id, "companyId", log_date, hours_run, fuel_consumed_litres, units_consumed_kwh, maintenance_performed, breakdown_hours, operator_emp_id, remarks, created_by, created_at, updated_at';
                const consumableMovementsCols = 'id, movement_number, consumable_id, business_id, plant_id, "companyId", movement_type, movement_date, qty, unit_price, total_cost, machine_id, issued_to, remarks, created_by, created_at, updated_at';
                const salesInvCols = 'id, invoice_number, business_id, tax_identity_id, plant_id, "companyId", bank_account_id, party_id, order_id, po_ref, grn_id, grn_ref, invoice_date, due_date, payment_terms_days, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_gstin, buyer_address_text, buyer_state, buyer_state_code, buyer_pan, consignee_name, consignee_gstin, consignee_address_text, consignee_state, items, taxable_amount, cgst_amount, sgst_amount, igst_amount, ugst_amount, round_off, total_amount, paid_amount, balance_amount, reverse_charge, vehicle_no, place_of_supply, eway_bill_no, eway_bill_date, status, terms_conditions, notes, financial_year, created_by, updated_by, created_at, updated_at';
                const vendorInvCols = 'id, vendor_invoice_no, business_id, plant_id, "companyId", party_id, order_id, po_issued_ref, grn_id, grn_ref, invoice_date, due_date, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, items, attachment_url, financial_year, created_by, updated_by, created_at, updated_at';
                const tripCols = 'id, trip_number, trip_type, trip_date, business_id, plant_id, "companyId", party_id, order_id, po_received_number, transport_po_received_number, po_issued_number, linked_transport_po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, is_insured, insurance_policy_details, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year, created_by, updated_by, created_at, updated_at';
                const gateCols = 'id, entry_number, trip_id, business_id, plant_id, "companyId", movement_type, vehicle_no, driver_name, driver_phone, status, photo_front_url, photo_back_url, guard_remarks, created_by, created_at, updated_at';
                const orderCols = 'id, order_type, po_number, po_date, due_date, po_type_id, po_type_name, business_id, plant_id, "companyId", party_id, delivery_location, contact_person, vendor_code, separate_consignor_consignee, item_id, item_description, item_qty, unit_id, item_rate, hsn_code, cgst_rate, sgst_rate, igst_rate, ugst_rate, total_qty, consumed_qty, balance_qty, payment_terms_days, terms_conditions, comments, attachment_url, status, financial_year, created_by, updated_by, created_at, updated_at';
                const grnCols = 'id, grn_number, from_date, to_date, party_id, po_ref, order_id, condition, total_grn_weight, total_shortage, business_id, plant_id, "companyId", financial_year, created_by, updated_by, created_at, updated_at';
                const payrollSettingsCols = 'id, business_id, plant_id, working_days_basis, pf_employee_pct, pf_employer_pct, pf_eps_pct, pf_epf_pct, pf_wage_ceiling, pf_admin_pct, edli_pct, esi_employee_pct, esi_employer_pct, esi_wage_ceiling, ot_multiplier, pt_slabs, created_at, updated_at';

                // High-performance batch hydration: dispatch all master catalog queries concurrently in parallel
                const [
                    bizRes, plantRes, unitRes, poTypeRes, itemRes, partyRes,
                    vehicleRes, machRes, conRes, shiftRes, empRes, attRes,
                    payrollRes, machineLogsRes, consumableLogsRes, salesInvRes,
                    vendorInvRes, tripsRes, gateRes, ordersRes, grnRes,
                    paysetRes, rolesRes, permsRes, sigsRes, tmplRes,
                    sysRes, profRes, auditRes
                ] = await Promise.all([
                    fetchLiveMaster('businesses', 'id, code, legal_name, pan, cin, fy_start_month, logo_url, is_active', { in: { column: 'id', values: authBizIds }, eq: { is_active: true } }),
                    fetchLiveMaster('plants', plantCols, { in: { column: 'id', values: authPlantIds }, eq: { is_active: true } }),
                    fetchLiveMaster('units', 'id, name, description, is_active', { eq: { is_active: true }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('po_types', 'id, name, description, is_active', { eq: { is_active: true }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('items', itemCols, { eq: { is_active: true }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('parties', partyCols, { eq: { is_active: true }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('vehicles', vehicleCols, { in: { column: 'business_id', values: authBizIds }, eq: { is_active: true }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('machinery', machCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('consumables', conCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('shifts', shiftCols, { eq: { is_active: true }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('employees', empCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('attendance', attCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'attendance_date', ascending: false } }),
                    fetchLiveMaster('payroll_ledger', payrollCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'year', ascending: false } }),
                    fetchLiveMaster('machine_logs', machineLogCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'log_date', ascending: false } }),
                    fetchLiveMaster('consumable_movements', consumableMovementsCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'movement_date', ascending: false } }),
                    fetchLiveMaster('sales_invoices', salesInvCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'invoice_date', ascending: false } }),
                    fetchLiveMaster('vendor_invoices', vendorInvCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'invoice_date', ascending: false } }),
                    fetchLiveMaster('trips', tripCols, { in: { column: 'business_id', values: authBizIds } }),
                    fetchLiveMaster('gate_entries', gateCols, { in: { column: 'business_id', values: authBizIds } }),
                    fetchLiveMaster('orders', orderCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'po_date', ascending: false } }),
                    fetchLiveMaster('grn', grnCols, { in: { column: 'business_id', values: authBizIds }, order: { column: 'from_date', ascending: false } }),
                    fetchLiveMaster('payroll_settings', payrollSettingsCols, { in: { column: 'business_id', values: authBizIds } }),
                    fetchLiveMaster('roles', 'id, role_name, description, is_system', { order: { column: 'id', ascending: true } }),
                    fetchLiveMaster('role_permissions', 'id, role_id, module_key, can_view, can_add, can_edit, can_delete', {}),
                    fetchLiveMaster('signatures', 'id, plant_id, auth_name, sign_image_url, is_active', { eq: { is_active: true } }),
                    fetchLiveMaster('document_templates', 'id, plant_id, name, applicable_type, content, is_active', { eq: { is_active: true } }),
                    fetchLiveMaster('system_settings', 'id, default_plant_lat, default_plant_lng, default_geofence_radius, config'),
                    fetchLiveMaster('profiles', 'id, legacy_user_id, username, full_name, emp_id, role_id, default_plant_id, status', {}),
                    (async () => {
                        const auditClient = window.getSupabaseClient ? window.getSupabaseClient() : null;
                        if (!auditClient) return { data: [], error: null };
                        try {
                            const { data, error } = await auditClient.from('audit_logs').select('id, business_id, plant_id, "companyId", user_id, user_email, action, entity_type, entity_id, details, after_state, created_at').in('business_id', authBizIds).order('created_at', { ascending: false });
                            return { data: data || [], error };
                        } catch (e) {
                            return { data: [], error: e };
                        }
                    })()
                ]);

                // 1. Live Businesses validation`;

// Now replace individual sequential fetches with the pre-resolved results
let newCode = code.replace(
    tryStart,
    parallelSetup
);

// Remove sequential queries from the body
const replacements = [
    // 2. plantRes fetch
    [
        `                // 2. Live Plants (constrained strictly to authorized plants, active only, consistent with verified business)
                const plantCols = 'id, business_id, tax_identity_id, default_bank_account_id, plant_name, trade_name, phone, spcb_auth, epr_reg_no, physical_address, plant_lat, plant_lng, geofence_radius, geofence_enabled, attendance_selfie_required, is_active';
                const plantRes = await fetchLiveMaster(
                    'plants',
                    plantCols,
                    { in: { column: 'id', values: authPlantIds }, eq: { is_active: true } }
                );`,
        `                // 2. Live Plants validation`
    ],
    // 3. unitRes fetch
    [
        `                // 3. Live Units (public.units)
                const unitRes = await fetchLiveMaster(
                    'units',
                    'id, name, description, is_active',
                    { eq: { is_active: true }, order: { column: 'id', ascending: true } }
                );`,
        `                // 3. Live Units (public.units)`
    ],
    // 4. poTypeRes fetch
    [
        `                // 4. Live PO Types (public.po_types)
                const poTypeRes = await fetchLiveMaster(
                    'po_types',
                    'id, name, description, is_active',
                    { eq: { is_active: true }, order: { column: 'id', ascending: true } }
                );`,
        `                // 4. Live PO Types (public.po_types)`
    ],
    // 4b. itemRes fetch
    [
        `                // 4b. Live Items (public.items - Core Global Item & Waste Catalog)
                const itemCols = 'id, name, hsn_code, description, default_unit_id, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active';
                const itemRes = await fetchLiveMaster(
                    'items',
                    itemCols,
                    { eq: { is_active: true }, order: { column: 'id', ascending: true } }
                );`,
        `                // 4b. Live Items (public.items - Core Global Item & Waste Catalog)`
    ],
    // 5. partyRes fetch
    [
        `                // 5. Live Parties (public.parties - Shared Global Master)
                const partyCols = 'id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin, primary_address, street1, street2, city, district, state, pincode, primary_contact_name, primary_contact_phone, primary_email, is_active';
                const partyRes = await fetchLiveMaster(
                    'parties',
                    partyCols,
                    { eq: { is_active: true }, order: { column: 'id', ascending: true } }
                );`,
        `                // 5. Live Parties (public.parties - Shared Global Master)`
    ],
    // 6. vehicleRes fetch
    [
        `                // 6. Live Vehicles (public.vehicles - Plant-Dedicated & Business-Shared Fleet)
                const vehicleCols = 'id, business_id, plant_id, "companyId", vehicle_no, party_name, party_id, vehicle_type, capacity_mt, is_active';
                const vehicleRes = await fetchLiveMaster(
                    'vehicles',
                    vehicleCols,
                    { in: { column: 'business_id', values: authBizIds }, eq: { is_active: true }, order: { column: 'id', ascending: true } }
                );`,
        `                // 6. Live Vehicles (public.vehicles - Plant-Dedicated & Business-Shared Fleet)`
    ],
    // 7. machRes fetch
    [
        `                // 7. Live Plant Machinery (public.machinery - Plant-Dedicated Equipment Master)
                const machCols = 'id, business_id, plant_id, "companyId", name, type, fuel_type, capacity, status';
                const machRes = await fetchLiveMaster(
                    'machinery',
                    machCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'id', ascending: true } }
                );`,
        `                // 7. Live Plant Machinery (public.machinery - Plant-Dedicated Equipment Master)`
    ],
    // 8. conRes fetch
    [
        `                // 8. Live Consumables (public.consumables - Plant Storeroom Inventory Master)
                const conCols = 'id, business_id, plant_id, "companyId", name, category, unit_id, reorder_level, last_price, current_stock, status';
                const conRes = await fetchLiveMaster(
                    'consumables',
                    conCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'id', ascending: true } }
                );`,
        `                // 8. Live Consumables (public.consumables - Plant Storeroom Inventory Master)`
    ],
    // 9. shiftRes fetch
    [
        `                // 9. Live Shifts (public.shifts - Plant-Scoped with Global Fallback)
                const shiftCols = 'id, plant_id, name, start_time, end_time, grace_period_mins, min_hours_full_day, min_hours_half_day, is_active';
                const shiftRes = await fetchLiveMaster(
                    'shifts',
                    shiftCols,
                    { eq: { is_active: true }, order: { column: 'id', ascending: true } }
                );`,
        `                // 9. Live Shifts (public.shifts - Plant-Scoped with Global Fallback)`
    ],
    // 10. empRes fetch
    [
        `                // 10. Live Employees (public.employees - Compound Business + Plant Scoped)
                const empCols = 'id, business_id, plant_id, "companyId", name, department, shift_name, shift_id, doj, basic_pay, hra, allowances, pf_applicable, esi_applicable, advance_balance, ot_rate_per_hr, allocated_paid_leaves, bank_name, account_no, ifsc_code, pan_no, aadhar_no, uan_no, esic_no, status, created_at, updated_at';
                const empRes = await fetchLiveMaster(
                    'employees',
                    empCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'id', ascending: true } }
                );`,
        `                // 10. Live Employees (public.employees - Compound Business + Plant Scoped)`
    ],
    // 11. attRes fetch
    [
        `                // 11. Live Attendance (public.attendance - Compound Business + Plant Scoped)
                const attCols = 'id, emp_id, business_id, plant_id, "companyId", attendance_date, status, shift_id, shift_name, check_in, check_out, work_hours, ot_hours, remarks, created_by, created_at, updated_at';
                const attRes = await fetchLiveMaster(
                    'attendance',
                    attCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'attendance_date', ascending: false } }
                );`,
        `                // 11. Live Attendance (public.attendance - Compound Business + Plant Scoped)`
    ],
    // 12. payrollRes fetch
    [
        `                // 12. Live Payroll Ledger (public.payroll_ledger - Compound Business + Plant Scoped)
                const payrollCols = 'id, emp_id, business_id, plant_id, "companyId", month, year, payable_days, present_days, paid_leaves, unpaid_leaves, weekly_offs, holidays, ot_hours, basic_earned, hra_earned, allowances_earned, ot_amount, gross_salary, pf_employee, pf_employer_epf, pf_employer_eps, pf_admin_charges, esi_employee, esi_employer, pt_deduction, advance_deduction, other_deductions, total_deductions, net_salary, status, payment_mode, payment_date, transaction_ref, remarks, created_by, created_at, updated_at';
                const payrollRes = await fetchLiveMaster(
                    'payroll_ledger',
                    payrollCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'year', ascending: false } }
                );`,
        `                // 12. Live Payroll Ledger (public.payroll_ledger - Compound Business + Plant Scoped)`
    ],
    // 13. machineLogsRes fetch
    [
        `                // Step 13: Live Machine Logs (Wave 10.5)
                const machineLogCols = 'id, machine_id, business_id, plant_id, "companyId", log_date, hours_run, fuel_consumed_litres, units_consumed_kwh, maintenance_performed, breakdown_hours, operator_emp_id, remarks, created_by, created_at, updated_at';
                const machineLogsRes = await fetchLiveMaster(
                    'machine_logs',
                    machineLogCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'log_date', ascending: false } }
                );`,
        `                // Step 13: Live Machine Logs (Wave 10.5)`
    ],
    // 14. consumableLogsRes fetch
    [
        `                // 14. Live Consumable Movements (public.consumable_movements - Plant Storeroom Stock Transactions)
                const consumableMovementsCols = 'id, movement_number, consumable_id, business_id, plant_id, "companyId", movement_type, movement_date, qty, unit_price, total_cost, machine_id, issued_to, remarks, created_by, created_at, updated_at';
                const consumableLogsRes = await fetchLiveMaster(
                    'consumable_movements',
                    consumableMovementsCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'movement_date', ascending: false } }
                );`,
        `                // 14. Live Consumable Movements (public.consumable_movements - Plant Storeroom Stock Transactions)`
    ],
    // 15. salesInvRes fetch
    [
        `                // 15. Live Sales Invoices (public.sales_invoices - Compound Business + Plant Scoped)
                const salesInvCols = 'id, invoice_number, business_id, tax_identity_id, plant_id, "companyId", bank_account_id, party_id, order_id, po_ref, grn_id, grn_ref, invoice_date, due_date, payment_terms_days, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_gstin, buyer_address_text, buyer_state, buyer_state_code, buyer_pan, consignee_name, consignee_gstin, consignee_address_text, consignee_state, items, taxable_amount, cgst_amount, sgst_amount, igst_amount, ugst_amount, round_off, total_amount, paid_amount, balance_amount, reverse_charge, vehicle_no, place_of_supply, eway_bill_no, eway_bill_date, status, terms_conditions, notes, financial_year, created_by, updated_by, created_at, updated_at';
                const salesInvRes = await fetchLiveMaster(
                    'sales_invoices',
                    salesInvCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'invoice_date', ascending: false } }
                );`,
        `                // 15. Live Sales Invoices (public.sales_invoices - Compound Business + Plant Scoped)`
    ],
    // 16. vendorInvRes fetch
    [
        `                // 16. Live Received Invoices (public.vendor_invoices - Compound Business + Plant Scoped)
                const vendorInvCols = 'id, vendor_invoice_no, business_id, plant_id, "companyId", party_id, order_id, po_issued_ref, grn_id, grn_ref, invoice_date, due_date, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, items, attachment_url, financial_year, created_by, updated_by, created_at, updated_at';
                const vendorInvRes = await fetchLiveMaster(
                    'vendor_invoices',
                    vendorInvCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'invoice_date', ascending: false } }
                );`,
        `                // 16. Live Received Invoices (public.vendor_invoices - Compound Business + Plant Scoped)`
    ],
    // 17. tripsRes fetch
    [
        `                // 17. Live Trips (public.trips - Fleet & Operations)
                let liveTrips = [];
                const tripCols = 'id, trip_number, trip_type, trip_date, business_id, plant_id, "companyId", party_id, order_id, po_received_number, transport_po_received_number, po_issued_number, linked_transport_po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, is_insured, insurance_policy_details, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year, created_by, updated_by, created_at, updated_at';
                const tripsRes = await fetchLiveMaster(
                    'trips',
                    tripCols,
                    { in: { column: 'business_id', values: authBizIds } }
                );`,
        `                // 17. Live Trips (public.trips - Fleet & Operations)
                let liveTrips = [];`
    ],
    // 18. gateRes fetch
    [
        `                // 18. Live Gate Entries (public.gate_entries - Security & Logistics)
                let liveGateEntries = [];
                const gateCols = 'id, entry_number, trip_id, business_id, plant_id, "companyId", movement_type, vehicle_no, driver_name, driver_phone, status, photo_front_url, photo_back_url, guard_remarks, created_by, created_at, updated_at';
                const gateRes = await fetchLiveMaster(
                    'gate_entries',
                    gateCols,
                    { in: { column: 'business_id', values: authBizIds } }
                );`,
        `                // 18. Live Gate Entries (public.gate_entries - Security & Logistics)
                let liveGateEntries = [];`
    ],
    // 19. ordersRes fetch
    [
        `                // 19. Live Orders (public.orders - Split into poReceived and poIssued)
                const orderCols = 'id, order_type, po_number, po_date, due_date, po_type_id, po_type_name, business_id, plant_id, "companyId", party_id, delivery_location, contact_person, vendor_code, separate_consignor_consignee, item_id, item_description, item_qty, unit_id, item_rate, hsn_code, cgst_rate, sgst_rate, igst_rate, ugst_rate, total_qty, consumed_qty, balance_qty, payment_terms_days, terms_conditions, comments, attachment_url, status, financial_year, created_by, updated_by, created_at, updated_at';
                const ordersRes = await fetchLiveMaster(
                    'orders',
                    orderCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'po_date', ascending: false } }
                );`,
        `                // 19. Live Orders (public.orders - Split into poReceived and poIssued)`
    ],
    // 20. grnRes fetch
    [
        `                // 20. Live GRN (public.grn & public.grn_items - Reconstructed with Child Items)
                const grnCols = 'id, grn_number, from_date, to_date, party_id, po_ref, order_id, condition, total_grn_weight, total_shortage, business_id, plant_id, "companyId", financial_year, created_by, updated_by, created_at, updated_at';
                const grnRes = await fetchLiveMaster(
                    'grn',
                    grnCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'from_date', ascending: false } }
                );`,
        `                // 20. Live GRN (public.grn & public.grn_items - Reconstructed with Child Items)`
    ],
    // 21. paysetRes fetch
    [
        `                // 21. Live Payroll Settings (public.payroll_settings - Statutory Configuration)
                const payrollSettingsCols = 'id, business_id, plant_id, working_days_basis, pf_employee_pct, pf_employer_pct, pf_eps_pct, pf_epf_pct, pf_wage_ceiling, pf_admin_pct, edli_pct, esi_employee_pct, esi_employer_pct, esi_wage_ceiling, ot_multiplier, pt_slabs, created_at, updated_at';
                const paysetRes = await fetchLiveMaster(
                    'payroll_settings',
                    payrollSettingsCols,
                    { in: { column: 'business_id', values: authBizIds } }
                );`,
        `                // 21. Live Payroll Settings (public.payroll_settings - Statutory Configuration)`
    ],
    // 23. rolesRes & permsRes fetch
    [
        `                // 23. Live Roles & Permissions (public.roles & public.role_permissions)
                const rolesRes = await fetchLiveMaster('roles', 'id, role_name, description, is_system', { order: { column: 'id', ascending: true } });
                const permsRes = await fetchLiveMaster('role_permissions', 'id, role_id, module_key, can_view, can_add, can_edit, can_delete', {});`,
        `                // 23. Live Roles & Permissions (public.roles & public.role_permissions)`
    ],
    // 24. sigsRes fetch
    [
        `                // 24. Live Signatures (public.signatures)
                const sigsRes = await fetchLiveMaster('signatures', 'id, plant_id, auth_name, sign_image_url, is_active', { eq: { is_active: true } });`,
        `                // 24. Live Signatures (public.signatures)`
    ],
    // 25. tmplRes fetch
    [
        `                // 25. Live Document Templates (public.document_templates)
                const tmplRes = await fetchLiveMaster('document_templates', 'id, plant_id, name, applicable_type, content, is_active', { eq: { is_active: true } });`,
        `                // 25. Live Document Templates (public.document_templates)`
    ],
    // 26. sysRes fetch
    [
        `                // 26. Live System Settings (public.system_settings)
                const sysRes = await fetchLiveMaster('system_settings', 'id, default_plant_lat, default_plant_lng, default_geofence_radius, config');`,
        `                // 26. Live System Settings (public.system_settings)`
    ],
    // 27. profRes fetch
    [
        `                // 27. Live Profiles / Users (public.profiles)
                const profRes = await fetchLiveMaster('profiles', 'id, legacy_user_id, username, full_name, emp_id, role_id, default_plant_id, status', {});`,
        `                // 27. Live Profiles / Users (public.profiles)`
    ],
    // 28. audit_logs query (we use auditRes from the batch)
    [
        `                // 28. Live Audit Logs (public.audit_logs - Recent Audit Trail)
                let liveAuditLogs = [];
                const auditClient = window.getSupabaseClient ? window.getSupabaseClient() : null;
                if (auditClient) {
                    try {
                        const { data: auditRows, error: auditErr } = await auditClient
                            .from('audit_logs')
                            .select('id, business_id, plant_id, "companyId", user_id, user_email, action, entity_type, entity_id, details, after_state, created_at')
                            .in('business_id', authBizIds)
                            .order('created_at', { ascending: false });
                        if (!auditErr && Array.isArray(auditRows)) {
                            liveAuditLogs = auditRows.map(normalizeLiveAuditLog);
                            state.liveMasters.auditLogs = liveAuditLogs;
                            if (liveAuditLogs.length > 0) {
                                state.data.auditLogs = liveAuditLogs;
                            }
                            if (state.liveMasterLoaded) state.liveMasterLoaded.auditLogs = true;
                        } else if (auditErr) {
                            console.warn('[LiveMaster] Audit logs read error:', auditErr);
                            if (state.liveMasterLoaded) state.liveMasterLoaded.auditLogs = false;
                        }
                    } catch (auditFetchErr) {
                        console.warn('[LiveMaster] Audit logs fetch exception:', auditFetchErr);
                    }
                }`,
        `                // 28. Live Audit Logs (public.audit_logs - Recent Audit Trail)
                let liveAuditLogs = [];
                if (auditRes && !auditRes.error && Array.isArray(auditRes.data)) {
                    liveAuditLogs = auditRes.data.map(normalizeLiveAuditLog);
                    state.liveMasters.auditLogs = liveAuditLogs;
                    if (liveAuditLogs.length > 0) {
                        state.data.auditLogs = liveAuditLogs;
                    }
                    if (state.liveMasterLoaded) state.liveMasterLoaded.auditLogs = true;
                } else if (auditRes && auditRes.error) {
                    console.warn('[LiveMaster] Audit logs read error:', auditRes.error);
                    if (state.liveMasterLoaded) state.liveMasterLoaded.auditLogs = false;
                }`
    ]
];

for (const [target, replacement] of replacements) {
    if (!newCode.includes(target)) {
        console.error('Target not found:', target.substring(0, 80));
        process.exit(1);
    }
    newCode = newCode.replace(target, replacement);
}

// Restore line endings if originally CRLF
if (isCrlf) {
    newCode = newCode.replace(/\n/g, '\r\n');
}

// Test syntax
const vm = require('vm');
try {
    new vm.Script(newCode);
    console.log('Syntax check passed! Writing updated file...');
    fs.writeFileSync(filePath, newCode, 'utf8');
    console.log('Successfully updated app.js!');
} catch (e) {
    console.error('Syntax error in updated code:', e);
    process.exit(1);
}
