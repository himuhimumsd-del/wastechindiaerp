const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

for (const tbl of ['orders', 'grn', 'grn_items', 'payroll_settings', 'system_settings', 'signatures', 'document_templates', 'audit_logs', 'roles', 'profiles']) {
    let pos = 0;
    const occurrences = [];
    while ((pos = content.indexOf(`'${tbl}'`, pos)) !== -1) {
        occurrences.push(pos);
        pos += tbl.length + 2;
    }
    console.log(`Table '${tbl}' occurrences count:`, occurrences.length);
    occurrences.forEach((idx, i) => {
        const snippet = content.slice(Math.max(0, idx - 80), Math.min(content.length, idx + 80)).replace(/\r?\n/g, ' ');
        console.log(`  [${i+1}] ${snippet}`);
    });
}
