// Add mock Supabase client and test persistence flow in scratch/test_wave11_7_sandbox.js
const fs = require('fs');
let code = fs.readFileSync('scratch/test_wave11_7_sandbox.js', 'utf8');

const additionalTests = `
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
`;

fs.writeFileSync('scratch/test_wave11_7_sandbox.js', code + additionalTests);
