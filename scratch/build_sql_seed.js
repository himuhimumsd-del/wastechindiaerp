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
-- ==============================================================================

-- 1. MACHINERY
INSERT INTO public.machinery (id, plant_id, name, type, fuel_type, capacity, status)
VALUES
    ('MAC-1', 'COMP-1', 'Shredder X1', 'Shredder', 'Electric', '5 Ton/hr', 'Active'),
    ('MAC-2', 'COMP-1', 'DG Set 125 KVA', 'DG Set (Generator)', 'Diesel', '125 KVA', 'Active'),
    ('MAC-3', 'COMP-1', 'Hydraulic Baler B-50', 'Baler', 'Electric', '3 Ton/hr', 'Active'),
    ('MAC-4', 'COMP-1', 'Trommel Screen TS-1', 'Separator', 'Electric', '10 Ton/hr', 'Active')
ON CONFLICT (id, plant_id) DO UPDATE SET
    name = EXCLUDED.name, type = EXCLUDED.type, fuel_type = EXCLUDED.fuel_type, capacity = EXCLUDED.capacity, status = EXCLUDED.status;

-- 2. CONSUMABLES
INSERT INTO public.consumables (id, plant_id, name, category, unit, reorder_level, last_price, current_stock, status)
VALUES
    ('CON-1', 'COMP-1', 'Shredder Blade Set', 'Spare Part', 'Nos.', 2, 4500, 8, 'Active'),
    ('CON-2', 'COMP-1', 'Hydraulic Oil (20L)', 'Consumable', 'litre', 40, 180, 120, 'Active'),
    ('CON-3', 'COMP-1', 'Conveyor Fasteners', 'Spare Part', 'packet', 5, 650, 25, 'Active'),
    ('CON-4', 'COMP-1', 'Industrial Grease EP-2', 'Consumable', 'kg', 15, 320, 45, 'Active'),
    ('CON-5', 'COMP-1', 'Safety PPE Kit (Gloves/Helmets)', 'Safety Equipment', 'set', 10, 450, 30, 'Active')
ON CONFLICT (id, plant_id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, unit = EXCLUDED.unit, current_stock = EXCLUDED.current_stock;

-- 3. EMPLOYEES
INSERT INTO public.employees (id, plant_id, name, department, doj, basic_pay, hra, allowances, pf_applicable, esi_applicable, advance_balance, ot_hourly_rate, status)
VALUES
    ('EMP-1', 'COMP-1', 'Super Admin User', 'Management', '2023-01-15', 30000, 15000, 5000, true, false, 0, 200, 'Active'),
    ('EMP-2', 'COMP-1', 'Ramesh (Guard Raipur)', 'Security', '2024-06-01', 12000, 3000, 1000, true, true, 500, 100, 'Active'),
    ('EMP-3', 'COMP-2', 'Suresh (Guard Bhilai)', 'Security', '2024-06-15', 12000, 3000, 1000, true, true, 0, 100, 'Active'),
    ('EMP-4', 'COMP-1', 'Dilip Sahu (Machine Operator)', 'Operations', '2024-02-10', 15000, 3500, 1500, true, true, 0, 120, 'Active'),
    ('EMP-5', 'COMP-1', 'Santosh Verma (Weighbridge In-charge)', 'Logistics', '2023-11-01', 18000, 4000, 2000, true, true, 0, 150, 'Active')
ON CONFLICT (id, plant_id) DO UPDATE SET
    name = EXCLUDED.name, basic_pay = EXCLUDED.basic_pay, status = EXCLUDED.status;

`;

// 4. Invoices SQL
sql += `-- 4. TAX INVOICES\n`;
d.invoices.forEach(inv => {
    sql += `INSERT INTO public.invoices (id, invoice_number, invoice_type, invoice_date, "companyId", total_qty, subtotal, tax_amount, grand_total, status)
VALUES ('${inv.id}', '${inv.id}', 'Tax Invoice (Sales)', '${inv.date}', '${inv.companyId}', ${inv.totalQty}, ${inv.amount}, ${inv.taxAmount}, ${inv.totalAmount}, '${inv.status}')
ON CONFLICT (id) DO UPDATE SET subtotal = EXCLUDED.subtotal, tax_amount = EXCLUDED.tax_amount, grand_total = EXCLUDED.grand_total, status = EXCLUDED.status;\n`;
});

// 5. Machine Logs SQL
sql += `\n-- 5. MACHINE LOGS\n`;
d.machineLogs.forEach(ml => {
    sql += `INSERT INTO public.machine_logs (id, plant_id, machine_id, log_date, hours_run, diesel_consumed_litres, units_consumed_kwh, remarks)
VALUES ('${ml.id}', '${ml.companyId}', '${ml.machine === 'Shredder X1' ? 'MAC-1' : 'MAC-2'}', '${ml.date}', ${parseFloat(ml.runningHours) || 0}, ${parseFloat(ml.dieselConsumed) || 0}, ${parseFloat(ml.elecUsed) || 0}, '${ml.remarks.replace(/'/g, "''")}')
ON CONFLICT (id) DO NOTHING;\n`;
});

// 6. Consumable Logs SQL
sql += `\n-- 6. CONSUMABLE MOVEMENTS\n`;
d.consumableLogs.forEach(cl => {
    sql += `INSERT INTO public.consumable_movements (id, plant_id, consumable_id, movement_type, movement_date, qty, unit_price, total_cost, remarks)
VALUES ('${cl.id}', '${cl.companyId}', '${cl.consumable}', '${cl.movementType}', '${cl.date}', ${parseFloat(cl.quantity) || 0}, ${parseFloat(cl.pricePerUnit) || 0}, ${parseFloat(cl.totalAmount) || 0}, '${cl.remarks.replace(/'/g, "''")}')
ON CONFLICT (id) DO NOTHING;\n`;
});

// 7. Attendance SQL
sql += `\n-- 7. ATTENDANCE (30 DAYS)\n`;
d.attendance.forEach(att => {
    sql += `INSERT INTO public.attendance (id, plant_id, emp_id, attendance_date, status, work_hours)
VALUES ('${att.id}', '${att.companyId}', '${att.empId}', '${att.date}', '${att.status}', ${parseFloat(att.totalHours) || 0})
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, work_hours = EXCLUDED.work_hours;\n`;
});

// 8. Payroll Ledger SQL
sql += `\n-- 8. PAYROLL LEDGER\n`;
d.payrollLedger.forEach(pl => {
    sql += `INSERT INTO public.payroll_ledger (id, plant_id, emp_id, month, year, payable_days, present_days, gross_salary, pf_employee, esi_employee, pt_deduction, total_deductions, net_salary, status)
VALUES ('${pl.id}', '${pl.companyId}', '${pl.empId}', '${pl.monthYear.split('-')[1]}', '${pl.monthYear.split('-')[0]}', ${pl.payableDays}, ${pl.presentDays}, ${pl.grossEarned}, ${pl.pfDeduction}, ${pl.esiDeduction}, ${pl.ptDeduction}, ${pl.totalDeductions}, ${pl.netSalary}, '${pl.status}')
ON CONFLICT (id) DO UPDATE SET gross_salary = EXCLUDED.gross_salary, net_salary = EXCLUDED.net_salary, status = EXCLUDED.status;\n`;
});

fs.writeFileSync('supabase/seed_demo_month.sql', sql, 'utf8');
console.log('Successfully generated supabase/seed_demo_month.sql! Size:', fs.statSync('supabase/seed_demo_month.sql').size, 'bytes');
