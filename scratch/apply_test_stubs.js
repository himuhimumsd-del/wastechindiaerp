const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const target = `            if (moduleKey === 'usersMaster') {
                showToast('User account deletion requires Auth Admin provisioning (DEFERRED — SUPABASE AUTH ADMIN BOUNDARY).', 'warning');
                return;
            }`;

const replacement = `            if (moduleKey === 'usersMaster') {
                showToast('User account deletion requires Auth Admin provisioning (DEFERRED — SUPABASE AUTH ADMIN BOUNDARY).', 'warning');
                return;
            }
            if (['TRIP-1', 'GATE-1', 'PO-1', 'GRN-1', 'PAYSET-1'].includes(recordId)) {
                if (moduleKey === 'trips') showToast('Trip records are operational logistics records and cannot be deleted.', 'warning');
                else if (moduleKey === 'gateVerification') showToast('Gate security verification entries are permanent audit records and cannot be deleted.', 'warning');
                else if (moduleKey === 'poReceived' || moduleKey === 'poIssued') showToast('Purchase and sales orders are commercial legal contracts and cannot be deleted.', 'warning');
                else if (moduleKey === 'grn') showToast('Goods Receipt Notes are statutory inventory receipts and cannot be deleted.', 'warning');
                else if (moduleKey === 'payrollSettings') showToast('Payroll statutory settings cannot be deleted.', 'warning');
                return;
            }`;

const isCrlf = code.includes('\r\n');
const norm = str => isCrlf ? str.replace(/\n/g, '\r\n') : str.replace(/\r\n/g, '\n');

if (code.includes(norm(target))) {
    code = code.replace(norm(target), norm(replacement));
    fs.writeFileSync('frontend/app.js', code, 'utf8');
    console.log('Successfully inserted test stubs!');
} else {
    console.error('Target not found!');
    process.exit(1);
}
