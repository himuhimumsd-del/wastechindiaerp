const fs = require('fs');

const path = 'supabase/migrations';
const canonicalFiles = [
  '20260912000001_wave1_system_access_foundation.sql',
  '20260912000002_wave2_core_master_catalogs.sql',
  '20260912000003_wave3_parties_fleet_masters.sql',
  '20260912000004_wave4_machinery_consumables.sql',
  '20260912000005_wave5_personnel_hr_masters.sql',
  '20260912000006_wave6_commercial_orders.sql',
  '20260912000007_wave7_operational_logistics_receiving.sql',
  '20260912000008_wave8_financial_invoicing_hr_logs.sql',
  '20260915000001_wave9_3_authenticated_table_grants.sql',
  '20260915000002_wave9_3_anon_privilege_hardening.sql',
  '20260915000003_wave9_3_authenticated_privilege_hardening.sql'
];

console.log('=== CANONICAL TABLES INVENTORY (11 CANONICAL FILES) ===\n');

const tableList = [];

canonicalFiles.forEach(file => {
  const content = fs.readFileSync(path + '/' + file, 'utf8');
  const matches = [...content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  if (matches.length > 0) {
    console.log(`File: ${file} (${matches.length} tables)`);
    matches.forEach(m => {
      console.log(`  - ${m[1]}`);
      tableList.push({ table: m[1], file });
    });
  }
});

console.log(`\nTotal canonical tables created: ${tableList.length}`);
