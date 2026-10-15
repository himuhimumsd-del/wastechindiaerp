// Comprehensive sandbox test to verify payload builders and logic for Wave 11.7
const assert = require('assert');

// Mock state and environment
const mockState = {
    authAuthorized: true,
    currentUser: { id: 'usr-1', email: 'admin@wastech.com', name: 'Admin' },
    currentCompany: 'COMP-1',
    authorizedPlants: [
        { id: 'COMP-1', name: 'HQ Raipur', business_id: '11111111-1111-1111-1111-111111111111' },
        { id: 'COMP-2', name: 'Bhilai Plant', business_id: '11111111-1111-1111-1111-111111111111' }
    ],
    data: {
        companyMaster: [
            { id: 'COMP-1', name: 'GG WASTECH', tradeName: 'HQ Raipur', plantLat: '21.25', plantLng: '81.62', geofenceRadius: '500' }
        ],
        payrollSettings: [
            { id: 'SET-1', workingDaysBasis: 'Fixed 26 Days', pfEmployeePct: '12', pfEmployerPct: '12', esiEmployeePct: '0.75', esiEmployerPct: '3.25', ptSlabs: [] }
        ],
        attendance: [],
        payrollLedger: []
    },
    liveMasters: {
        attendance: [],
        payrollLedger: []
    }
};

const mockEmployees = [
    { id: 'EMP-1', name: 'Rahul Sharma', companyId: 'COMP-1', shiftId: 'SH-1', basicPay: 15000, hra: 5000, allowances: 2000, pfApplicable: 'Yes', esiApplicable: 'Yes', bankName: 'HDFC', accountNo: '123456' },
    { id: 'EMP-2', name: 'Anita Verma', companyId: 'COMP-2', shiftId: 'SH-2', basicPay: 20000, hra: 6000, allowances: 3000 }
];

const mockShifts = [
    { id: 'SH-1', name: 'General Shift', plant_id: 'COMP-1', startTime: '09:00', endTime: '18:00', minHoursFullDay: 8, minHoursHalfDay: 4 },
    { id: 'SH-2', name: 'Night Shift', plant_id: 'COMP-2', startTime: '20:00', endTime: '05:00', minHoursFullDay: 8, minHoursHalfDay: 4 }
];

function getLiveEmployees() { return mockEmployees; }
function getLiveShifts() { return mockShifts; }
function getLiveAttendance() { return mockState.liveMasters.attendance; }
function getLivePayrollLedger() { return mockState.liveMasters.payrollLedger; }
function assertAuthorizedPlant(p) { return mockState.authorizedPlants.find(x => x.id === p); }
function getCurrentAuthorizedPlant() { return mockState.authorizedPlants[0]; }
function getCurrentAuthorizedBusiness() { return { id: '11111111-1111-1111-1111-111111111111' }; }
function hasPerm() { return true; }

// --- PAYLOAD BUILDERS ---
function buildLiveAttendancePayload(record) {
    if (!record || typeof record !== 'object') {
        throw new Error('Attendance record must be an object');
    }

    const empId = (record.emp_id || record.empId || '').trim();
    if (!empId) {
        throw new Error('Employee ID is required for attendance.');
    }
    const emp = getLiveEmployees().find(e => e.id === empId || e.emp_id === empId);
    if (!emp) {
        throw new Error(`Employee "${empId}" not found in employee master.`);
    }

    const currentPlant = mockState.currentCompany;
    let authPlant = assertAuthorizedPlant(currentPlant) || getCurrentAuthorizedPlant();
    if (!authPlant || !authPlant.id) {
        throw new Error('No authorized plant context available for attendance persistence.');
    }

    const empPlant = emp.companyId || emp.plant_id || authPlant.id;
    if (empPlant !== authPlant.id) {
        throw new Error(`Employee "${emp.name || empId}" belongs to plant "${empPlant}", not active plant "${authPlant.id}". Cross-plant attendance is prohibited.`);
    }

    const businessId = authPlant.business_id || getCurrentAuthorizedBusiness()?.id;
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (!isUUID(businessId)) {
        throw new Error(`Active plant "${authPlant.id}" has invalid business UUID (${businessId}).`);
    }

    const dateStr = (record.attendance_date || record.date || '').split('T')[0];
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error('Valid attendance date (YYYY-MM-DD) is required.');
    }

    let shiftId = record.shift_id || record.shiftId || emp.shiftId || null;
    let shiftName = record.shift_name || record.shiftName || null;
    if (shiftId) {
        const shift = getLiveShifts().find(s => s.id === shiftId || s.name === shiftId);
        if (shift) {
            shiftId = shift.id;
            shiftName = shift.name || shiftName;
            if (shift.plant_id && shift.plant_id !== authPlant.id) {
                throw new Error(`Shift "${shift.name || shiftId}" belongs to plant "${shift.plant_id}", not active plant "${authPlant.id}".`);
            }
        }
    }

    let rawStatus = record.status || 'Present';
    let dbStatus = 'Present';
    let extraRemark = '';
    if (rawStatus === 'Half-Day' || rawStatus === 'Half Day') {
        dbStatus = 'Half Day';
    } else if (rawStatus === 'Late') {
        dbStatus = 'Present';
        extraRemark = 'Late punch-in';
    } else if (['Present', 'Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(rawStatus)) {
        dbStatus = rawStatus;
    } else {
        dbStatus = 'Present';
    }

    let checkIn = record.check_in || null;
    if (!checkIn && record.punchTime) {
        try {
            const [h, m] = record.punchTime.split(':');
            const d = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`);
            if (!isNaN(d.getTime())) checkIn = d.toISOString();
        } catch (_) {}
    }

    let checkOut = record.check_out || null;
    if (!checkOut && record.punchOutTime) {
        try {
            const [h, m] = record.punchOutTime.split(':');
            const d = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`);
            if (!isNaN(d.getTime())) checkOut = d.toISOString();
        } catch (_) {}
    }

    let workHours = 0;
    if (record.work_hours != null) workHours = parseFloat(record.work_hours) || 0;
    else if (record.totalHours != null) workHours = parseFloat(record.totalHours) || 0;
    workHours = Math.max(0, Math.min(24, Math.round(workHours * 100) / 100));

    let otHours = 0;
    if (record.ot_hours != null) otHours = parseFloat(record.ot_hours) || 0;
    else if (record.otHours != null) otHours = parseFloat(record.otHours) || 0;
    otHours = Math.max(0, Math.min(24, Math.round(otHours * 100) / 100));

    let remarks = (record.remarks || '').trim();
    if (extraRemark && !remarks.includes(extraRemark)) {
        remarks = remarks ? `${remarks}; ${extraRemark}` : extraRemark;
    }

    const currentUser = mockState.currentUser?.email || mockState.currentUser?.name || 'system';

    return {
        emp_id: empId,
        business_id: businessId,
        plant_id: authPlant.id,
        companyId: authPlant.id,
        attendance_date: dateStr,
        status: dbStatus,
        shift_id: shiftId,
        shift_name: shiftName,
        check_in: checkIn,
        check_out: checkOut,
        work_hours: workHours,
        ot_hours: otHours,
        remarks: remarks || null,
        created_by: currentUser
    };
}

function buildLivePayrollLedgerPayload(record) {
    if (!record || typeof record !== 'object') {
        throw new Error('Payroll ledger record must be an object');
    }

    const empId = (record.emp_id || record.empId || '').trim();
    if (!empId) {
        throw new Error('Employee ID is required for payroll ledger.');
    }
    const emp = getLiveEmployees().find(e => e.id === empId || e.emp_id === empId);
    if (!emp) {
        throw new Error(`Employee "${empId}" not found in employee master.`);
    }

    const currentPlant = mockState.currentCompany;
    let authPlant = assertAuthorizedPlant(currentPlant) || getCurrentAuthorizedPlant();
    if (!authPlant || !authPlant.id) {
        throw new Error('No authorized plant context available for payroll persistence.');
    }

    const empPlant = emp.companyId || emp.plant_id || authPlant.id;
    if (empPlant !== authPlant.id) {
        throw new Error(`Employee "${emp.name || empId}" belongs to plant "${empPlant}", not active plant "${authPlant.id}". Cross-plant payroll is prohibited.`);
    }

    const businessId = authPlant.business_id || getCurrentAuthorizedBusiness()?.id;
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (!isUUID(businessId)) {
        throw new Error(`Active plant "${authPlant.id}" has invalid business UUID (${businessId}).`);
    }

    let m = record.month != null ? parseInt(record.month, 10) : null;
    let y = record.year != null ? parseInt(record.year, 10) : null;
    if ((!m || !y) && record.monthKey) {
        const parts = record.monthKey.split('-');
        if (parts.length === 2) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
        }
    }
    if (!m || m < 1 || m > 12) {
        throw new Error(`Invalid payroll month "${m}". Must be between 1 and 12.`);
    }
    if (!y || y < 2000) {
        throw new Error(`Invalid payroll year "${y}". Must be >= 2000.`);
    }

    let rawStatus = record.status || 'Draft';
    let dbStatus = 'Draft';
    if (rawStatus === 'Reviewed' || rawStatus === 'Processed') {
        dbStatus = 'Processed';
    } else if (['Draft', 'Approved', 'Paid'].includes(rawStatus)) {
        dbStatus = rawStatus;
    } else {
        dbStatus = 'Draft';
    }

    const toNum = (val, dec = 2) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
    };

    const payableDays = toNum(record.payable_days != null ? record.payable_days : record.payableDays, 1);
    const presentDays = toNum(record.present_days != null ? record.present_days : record.presentDays, 1);
    const paidLeaves = toNum(record.paid_leaves != null ? record.paid_leaves : record.paidLeaveDays, 1);
    const unpaidLeaves = toNum(record.unpaid_leaves != null ? record.unpaid_leaves : (record.unpaidLeaveDays != null ? record.unpaidLeaveDays : record.absentDays), 1);
    const weeklyOffs = toNum(record.weekly_offs != null ? record.weekly_offs : record.weeklyOffDays, 1);
    const holidays = toNum(record.holidays != null ? record.holidays : record.holidayDays, 1);
    const otHours = toNum(record.ot_hours != null ? record.ot_hours : record.otHours, 2);

    const basicEarned = toNum(record.basic_earned != null ? record.basic_earned : record.basicEarned, 2);
    const hraEarned = toNum(record.hra_earned != null ? record.hra_earned : record.hraEarned, 2);
    const allowancesEarned = toNum(record.allowances_earned != null ? record.allowances_earned : record.allowancesEarned, 2);
    const otAmount = toNum(record.ot_amount != null ? record.ot_amount : record.otAmount, 2);
    const grossSalary = toNum(record.gross_salary != null ? record.gross_salary : record.grossEarned, 2);

    const pfEmployee = toNum(record.pf_employee != null ? record.pf_employee : record.pfDeduction, 2);
    const pfEmployerEpf = toNum(record.pf_employer_epf != null ? record.pf_employer_epf : record.employerPF, 2);
    const pfEmployerEps = toNum(record.pf_employer_eps, 2);
    const pfAdminCharges = toNum(record.pf_admin_charges, 2);
    const esiEmployee = toNum(record.esi_employee != null ? record.esi_employee : record.esiDeduction, 2);
    const esiEmployer = toNum(record.esi_employer != null ? record.esi_employer : record.employerESI, 2);
    const ptDeduction = toNum(record.pt_deduction != null ? record.pt_deduction : record.ptDeduction, 2);
    const advanceDeduction = toNum(record.advance_deduction != null ? record.advance_deduction : record.advance, 2);
    const otherDeductions = toNum(record.other_deductions, 2);
    const totalDeductions = toNum(record.total_deductions != null ? record.total_deductions : record.totalDeductions, 2);
    const netSalary = toNum(record.net_salary != null ? record.net_salary : record.netSalary, 2);

    let paymentDate = record.payment_date || null;
    if (!paymentDate && record.paidOn && dbStatus === 'Paid') {
        try {
            const pd = new Date(record.paidOn);
            if (!isNaN(pd.getTime())) paymentDate = pd.toISOString().split('T')[0];
        } catch (_) {}
    }
    if (!paymentDate && dbStatus === 'Paid') {
        paymentDate = new Date().toISOString().split('T')[0];
    }

    let remarks = record.remarks || '';
    if (Array.isArray(record.exceptions) && record.exceptions.length > 0 && !remarks) {
        remarks = record.exceptions.join('; ');
    }

    const currentUser = mockState.currentUser?.email || mockState.currentUser?.name || 'system';

    return {
        emp_id: empId,
        business_id: businessId,
        plant_id: authPlant.id,
        companyId: authPlant.id,
        month: m,
        year: y,
        payable_days: payableDays,
        present_days: presentDays,
        paid_leaves: paidLeaves,
        unpaid_leaves: unpaidLeaves,
        weekly_offs: weeklyOffs,
        holidays: holidays,
        ot_hours: otHours,
        basic_earned: basicEarned,
        hra_earned: hraEarned,
        allowances_earned: allowancesEarned,
        ot_amount: otAmount,
        gross_salary: grossSalary,
        pf_employee: pfEmployee,
        pf_employer_epf: pfEmployerEpf,
        pf_employer_eps: pfEmployerEps,
        pf_admin_charges: pfAdminCharges,
        esi_employee: esiEmployee,
        esi_employer: esiEmployer,
        pt_deduction: ptDeduction,
        advance_deduction: advanceDeduction,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        status: dbStatus,
        payment_mode: record.payment_mode || null,
        payment_date: paymentDate,
        transaction_ref: record.transaction_ref || null,
        remarks: remarks || null,
        created_by: currentUser
    };
}

// === TESTS ===
console.log('Running test 1: Valid attendance payload...');
const attPayload = buildLiveAttendancePayload({
    empId: 'EMP-1',
    date: '2026-10-06',
    punchTime: '09:05',
    punchOutTime: '18:15',
    totalHours: '9.17',
    status: 'Late'
});
assert.strictEqual(attPayload.emp_id, 'EMP-1');
assert.strictEqual(attPayload.plant_id, 'COMP-1');
assert.strictEqual(attPayload.status, 'Present'); // 'Late' mapped to 'Present'
assert(attPayload.remarks.includes('Late punch-in'));
assert.strictEqual(attPayload.work_hours, 9.17);
console.log('-> Passed!');

console.log('Running test 2: Cross-plant employee rejection in attendance...');
assert.throws(() => {
    buildLiveAttendancePayload({
        empId: 'EMP-2', // Belong to COMP-2 while active is COMP-1
        date: '2026-10-06'
    });
}, /Cross-plant attendance is prohibited/);
console.log('-> Passed!');

console.log('Running test 3: Cross-plant shift rejection in attendance...');
assert.throws(() => {
    buildLiveAttendancePayload({
        empId: 'EMP-1',
        date: '2026-10-06',
        shiftId: 'SH-2' // Belongs to COMP-2 while active is COMP-1
    });
}, /Cross-plant|belongs to plant "COMP-2"/);
console.log('-> Passed!');

console.log('Running test 4: Half-Day status mapping in attendance...');
const attHalf = buildLiveAttendancePayload({
    empId: 'EMP-1',
    date: '2026-10-06',
    status: 'Half-Day'
});
assert.strictEqual(attHalf.status, 'Half Day'); // Converted to DB CHECK value
console.log('-> Passed!');

console.log('Running test 5: Valid payroll payload...');
const payrollPayload = buildLivePayrollLedgerPayload({
    empId: 'EMP-1',
    month: 10,
    year: 2026,
    payableDays: 26,
    grossEarned: 22000,
    pfDeduction: 1800,
    esiDeduction: 165,
    totalDeductions: 1965,
    netSalary: 20035,
    status: 'Reviewed'
});
assert.strictEqual(payrollPayload.emp_id, 'EMP-1');
assert.strictEqual(payrollPayload.status, 'Processed'); // 'Reviewed' mapped to 'Processed'
assert.strictEqual(payrollPayload.gross_salary, 22000);
assert.strictEqual(payrollPayload.net_salary, 20035);
console.log('-> Passed!');

console.log('Running test 6: Cross-plant employee rejection in payroll...');
assert.throws(() => {
    buildLivePayrollLedgerPayload({
        empId: 'EMP-2', // Belong to COMP-2 while active is COMP-1
        month: 10,
        year: 2026
    });
}, /Cross-plant payroll is prohibited/);
console.log('-> Passed!');

console.log('ALL TESTS PASSED SUCCESSFULLY!');

// === SIMULATING MULTI-ROW PAYROLL PERSISTENCE ===
console.log('Running test 7: Multi-row payroll generation with partial-write handling...');
async function simulateMultiRowPayroll(emps) {
    let created = 0;
    const failedErrors = [];
    const client = {
        from: (table) => ({
            insert: (payload) => ({
                select: () => ({
                    single: async () => {
                        if (payload.emp_id === 'EMP-FAIL') {
                            return { data: null, error: { message: 'Database constraint violation on EMP-FAIL' } };
                        }
                        return { data: { id: 'uuid-' + payload.emp_id, ...payload }, error: null };
                    }
                })
            })
        })
    };

    for (const emp of emps) {
        try {
            const raw = {
                empId: emp.id,
                month: 10,
                year: 2026,
                payableDays: 26,
                grossEarned: 20000,
                netSalary: 18000
            };
            const payload = buildLivePayrollLedgerPayload(raw);
            const { data, error } = await client.from('payroll_ledger').insert(payload).select().single();
            if (error) {
                failedErrors.push(emp.name + ': ' + error.message);
            } else {
                mockState.liveMasters.payrollLedger.unshift(data);
                created++;
            }
        } catch (err) {
            failedErrors.push(emp.name + ': ' + err.message);
        }
    }

    return { created, failedErrors };
}

(async () => {
    mockEmployees.push({ id: 'EMP-FAIL', name: 'Failure Worker', companyId: 'COMP-1' });
    const result = await simulateMultiRowPayroll([mockEmployees[0], mockEmployees[2]]);
    assert.strictEqual(result.created, 1);
    assert.strictEqual(result.failedErrors.length, 1);
    assert(result.failedErrors[0].includes('Database constraint violation'));
    assert.strictEqual(mockState.liveMasters.payrollLedger.length, 1);
    assert.strictEqual(mockState.liveMasters.payrollLedger[0].emp_id, 'EMP-1');
    console.log('-> Passed! Partial write handled cleanly without false success reporting.');
    console.log('ALL EXTENDED TESTS PASSED!');
})();
