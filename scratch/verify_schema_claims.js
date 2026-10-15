const fs = require('fs');

const path = 'supabase/migrations';
const files = fs.readdirSync(path).filter(f => f.endsWith('.sql'));

let allSql = '';
files.forEach(f => {
  allSql += fs.readFileSync(path + '/' + f, 'utf8') + '\n';
});

const expectedTables = [
  'items',
  'consumables',
  'machinery',
  'employees',
  'payroll_settings',
  'orders',
  'trips',
  'gate_entries',
  'grn',
  'grn_items',
  'sales_invoices',
  'vendor_invoices',
  'attendance',
  'payroll_ledger',
  'consumable_movements',
  'machine_logs',
  'audit_logs',
  'businesses',
  'plants',
  'roles',
  'role_permissions',
  'profiles',
  'user_business_access',
  'user_plant_access',
  'document_templates',
  'signatures',
  'system_settings'
];

console.log('=== VERIFYING 27 EXPECTED TABLES ===');
expectedTables.forEach(t => {
  const re = new RegExp(`CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+(?:public\\.)?${t}\\b`, 'i');
  const found = re.test(allSql);
  console.log(`Table public.${t}: ${found ? 'EXISTS' : 'MISSING'}`);
});

const nonExistent = [
  'invoices',
  'invoice_items',
  'attendance_logs',
  'payroll_items',
  'master_items',
  'consumables_master',
  'purchase_orders',
  'goods_receipt_notes',
  'machinery_logs'
];

console.log('\n=== VERIFYING 9 NON-EXISTENT TABLES ===');
nonExistent.forEach(t => {
  const re = new RegExp(`CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+(?:public\\.)?${t}\\b`, 'i');
  const found = re.test(allSql);
  console.log(`Table public.${t}: ${found ? 'UNEXPECTEDLY EXISTS' : 'DOES NOT EXIST (CONFIRMED)'}`);
});
