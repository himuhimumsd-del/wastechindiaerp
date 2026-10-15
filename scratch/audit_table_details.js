const fs = require('fs');

const f7 = fs.readFileSync('supabase/migrations/20260912000007_wave7_operational_logistics_receiving.sql', 'utf8');
const f8 = fs.readFileSync('supabase/migrations/20260912000008_wave8_financial_invoicing_hr_logs.sql', 'utf8');
const fGrants = fs.readFileSync('supabase/migrations/20260915000001_wave9_3_authenticated_table_grants.sql', 'utf8');

function extractTableSQL(sql, tableName) {
  const regex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${tableName} \\(([\\s\\S]*?)\\n\\);`, 'g');
  const m = regex.exec(sql);
  return m ? m[0] : 'NOT FOUND';
}

function extractTriggers(sql, tableName) {
  const regex = new RegExp(`CREATE TRIGGER [a-zA-Z0-9_]+\\s+(?:BEFORE|AFTER)\\s+(?:INSERT|UPDATE|DELETE)[^;]+ON public\\.${tableName}[^;]+;`, 'g');
  const matches = sql.match(regex);
  return matches || [];
}

console.log('=== TRIPS (from migration 7) ===');
console.log(extractTableSQL(f7, 'trips'));

console.log('\n=== MACHINE_LOGS (from migration 8) ===');
console.log(extractTableSQL(f8, 'machine_logs'));

console.log('\n=== CONSUMABLE_MOVEMENTS (from migration 8) ===');
console.log(extractTableSQL(f8, 'consumable_movements'));

console.log('\n=== ATTENDANCE (from migration 8) ===');
console.log(extractTableSQL(f8, 'attendance'));

console.log('\n=== PAYROLL_LEDGER (from migration 8) ===');
console.log(extractTableSQL(f8, 'payroll_ledger'));

console.log('\n=== GRANTS in wave9_3 ===');
['trips', 'machine_logs', 'consumable_movements', 'attendance', 'payroll_ledger', 'sales_invoices', 'vendor_invoices', 'grn', 'orders'].forEach(t => {
  const lines = fGrants.split('\n').filter(l => l.includes(`public.${t}`));
  console.log(`- ${t}: ${lines.map(l => l.trim()).join(' | ') || 'NO GRANT'}`);
});
