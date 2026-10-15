const fs = require('fs');
const { getNewGenerateDummyDataCode } = require('./generate_and_apply_one_month_demo.js');
const vm = require('vm');

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
-- SEED SCRIPT: COMPLETE 1-MONTH DEMO DATA (2026-09-16 to 2026-10-15)
-- EcoManage Enterprise ERP: Multi-Plant, Orders, Trips, GRN, Invoices, HR & Logs
-- Target: Supabase PostgreSQL (100% Aligned to Migrations & Compound RLS Schema)
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

-- 2. MACHINERY (Plant Machinery Master)
INSERT INTO public.machinery (id, plant_id, name, type, fuel_type, capacity, status)
VALUES
    ('MAC-1', 'COMP-1', 'Shredder X1', 'Shredder', 'Electric', '5 Ton/hr', 'Active'),
    ('MAC-2', 'COMP-1', 'DG Set 125 KVA', 'DG Set (Generator)', 'Diesel', '125 KVA', 'Active'),
    ('MAC-3', 'COMP-1', 'Hydraulic Baler B-50', 'Baler', 'Electric', '3 Ton/hr', 'Active'),
    ('MAC-4', 'COMP-1', 'Trommel Screen TS-1', 'Other', 'Electric', '10 Ton/hr', 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, type = EXCLUDED.type, fuel_type = EXCLUDED.fuel_type, capacity = EXCLUDED.capacity, status = EXCLUDED.status;

-- 3. CONSUMABLES (Plant Consumables & Spares)
-- Note: Uses unit_id referencing public.units(id)
INSERT INTO public.consumables (id, plant_id, name, category, unit_id, reorder_level, last_price, current_stock, status)
VALUES
    ('CON-1', 'COMP-1', 'Shredder Blade Set', 'Spare Part', 'UNT-3', 2, 4500, 8, 'Active'),
    ('CON-2', 'COMP-1', 'Hydraulic Oil (20L)', 'Consumable', 'UNT-4', 40, 180, 120, 'Active'),
    ('CON-3', 'COMP-1', 'Conveyor Fasteners', 'Spare Part', 'UNT-8', 5, 650, 25, 'Active'),
    ('CON-4', 'COMP-1', 'Industrial Grease EP-2', 'Consumable', 'UNT-2', 15, 320, 45, 'Active'),
    ('CON-5', 'COMP-1', 'Safety PPE Kit (Gloves/Helmets)', 'Safety Equipment', 'UNT-9', 10, 450, 30, 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, unit_id = EXCLUDED.unit_id, current_stock = EXCLUDED.current_stock;

-- 4. EMPLOYEES (Plant Personnel Master)
INSERT INTO public.employees (id, plant_id, name, department, doj, basic_pay, hra, allowances, pf_applicable, esi_applicable, advance_balance, ot_rate_per_hr, status)
VALUES
    ('EMP-1', 'COMP-1', 'Super Admin User', 'Management', '2023-01-15', 30000, 15000, 5000, 'Yes', 'No', 0, 200, 'Active'),
    ('EMP-2', 'COMP-1', 'Ramesh (Guard Raipur)', 'Security', '2024-06-01', 12000, 3000, 1000, 'Yes', 'Yes', 500, 100, 'Active'),
    ('EMP-3', 'COMP-2', 'Suresh (Guard Bhilai)', 'Security', '2024-06-15', 12000, 3000, 1000, 'Yes', 'Yes', 0, 100, 'Active'),
    ('EMP-4', 'COMP-1', 'Dilip Sahu (Machine Operator)', 'Operations', '2024-02-10', 15000, 3500, 1500, 'Yes', 'Yes', 0, 120, 'Active'),
    ('EMP-5', 'COMP-1', 'Santosh Verma (Weighbridge In-charge)', 'Logistics', '2023-11-01', 18000, 4000, 2000, 'Yes', 'Yes', 0, 150, 'Active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, basic_pay = EXCLUDED.basic_pay, status = EXCLUDED.status;

-- 5. ATTENDANCE (30 Days Daily Attendance - 152 Records)
-- Uses composite natural unique key (emp_id, attendance_date)
`;

d.attendance.forEach(att => {
    const hrs = parseFloat(att.totalHours) || 0;
    sql += `INSERT INTO public.attendance (plant_id, emp_id, attendance_date, status, work_hours)
VALUES ('${att.companyId}', '${att.empId}', '${att.date}', '${att.status}', ${hrs})
ON CONFLICT (emp_id, attendance_date) DO UPDATE SET status = EXCLUDED.status, work_hours = EXCLUDED.work_hours;\n`;
});

// 6. PAYROLL LEDGER
sql += `\n-- 6. PAYROLL LEDGER (September 2026 Paid + October 2026 Draft)
-- Uses composite unique key (emp_id, month, year)
`;

d.payrollLedger.forEach(pl => {
    const month = parseInt(pl.monthYear.split('-')[1]);
    const year = parseInt(pl.monthYear.split('-')[0]);
    sql += `INSERT INTO public.payroll_ledger (plant_id, emp_id, month, year, payable_days, present_days, gross_salary, pf_employee, esi_employee, pt_deduction, total_deductions, net_salary, status)
VALUES ('${pl.companyId}', '${pl.empId}', ${month}, ${year}, ${pl.payableDays}, ${pl.presentDays}, ${pl.grossEarned}, ${pl.pfDeduction}, ${pl.esiDeduction}, ${pl.ptDeduction}, ${pl.totalDeductions}, ${pl.netSalary}, '${pl.status}')
ON CONFLICT (emp_id, month, year) DO UPDATE SET gross_salary = EXCLUDED.gross_salary, net_salary = EXCLUDED.net_salary, status = EXCLUDED.status;\n`;
});

// 7. MACHINE LOGS
sql += `\n-- 7. MACHINE LOGS (45 Daily Machinery Operating Logs)
`;

d.machineLogs.forEach(ml => {
    const machId = ml.machine === 'Shredder X1' ? 'MAC-1' : 'MAC-2';
    const hrs = parseFloat(ml.runningHours) || 0;
    const diesel = parseFloat(ml.dieselConsumed) || 0;
    const kwh = parseFloat(ml.elecUsed) || 0;
    const remarks = ml.remarks ? ml.remarks.replace(/'/g, "''") : '';
    sql += `INSERT INTO public.machine_logs (plant_id, machine_id, log_date, hours_run, fuel_consumed_litres, units_consumed_kwh, remarks)
VALUES ('${ml.companyId}', '${machId}', '${ml.date}', ${hrs}, ${diesel}, ${kwh}, '${remarks}');\n`;
});

// 8. CONSUMABLE MOVEMENTS
sql += `\n-- 8. CONSUMABLE MOVEMENTS (Stock In & Machine Issues)
`;

d.consumableLogs.forEach((cl, idx) => {
    const movType = cl.movementType.includes('Purchased') ? 'Stock In (Purchase)' : 'Issue to Machine';
    const machId = cl.machine || (movType === 'Issue to Machine' ? 'MAC-1' : null);
    const machVal = machId ? `'${machId}'` : 'NULL';
    const remarks = cl.remarks ? cl.remarks.replace(/'/g, "''") : '';
    sql += `INSERT INTO public.consumable_movements (movement_number, consumable_id, plant_id, movement_type, movement_date, qty, unit_price, total_cost, machine_id, remarks)
VALUES ('MOV-${1000 + idx}', '${cl.consumable}', '${cl.companyId}', '${movType}', '${cl.date}', ${parseFloat(cl.quantity) || 0}, ${parseFloat(cl.pricePerUnit) || 0}, ${parseFloat(cl.totalAmount) || 0}, ${machVal}, '${remarks}');\n`;
});

fs.writeFileSync('supabase/seed_demo_month.sql', sql, 'utf8');
console.log('Successfully generated clean supabase/seed_demo_month.sql! Size:', fs.statSync('supabase/seed_demo_month.sql').size, 'bytes');
