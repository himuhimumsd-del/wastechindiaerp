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

const canonicalTables = new Set();
const tableDetails = {};

canonicalFiles.forEach(file => {
  const content = fs.readFileSync(path + '/' + file, 'utf8');
  const matches = [...content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  matches.forEach(m => {
    const t = m[1];
    canonicalTables.add(t);
    tableDetails[t] = { file };
  });
});

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

// Match .from('...') or .from("...")
const fromMatches = [...appContent.matchAll(/\.from\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
const appFromTables = new Set(fromMatches.map(m => m[1]));

// Also check tables referenced in MASTER_PERSISTENCE_MAP (which uses fetchLiveMaster(table) and processMasterSave/Delete)
const mapMatch = appContent.match(/MASTER_PERSISTENCE_MAP\s*=\s*\{([\s\S]*?)\n\s*\};/);
const masterMapTables = new Set();
if (mapMatch) {
  const tableMatches = [...mapMatch[1].matchAll(/table:\s*['"]([^'"]+)['"]/g)];
  tableMatches.forEach(m => masterMapTables.add(m[1]));
}

// All directly referenced tables by frontend persistence
const allFrontendTables = new Set([...appFromTables, ...masterMapTables]);

console.log('=== CANONICAL TABLES COUNT:', canonicalTables.size);
console.log('=== APP .from() DIRECT STRING REFERENCES COUNT:', appFromTables.size);
console.log('=== MASTER_PERSISTENCE_MAP TABLES COUNT:', masterMapTables.size);
console.log('=== TOTAL FRONTEND DIRECT PERSISTENCE TABLES COUNT:', allFrontendTables.size);

const setA_from = [...appFromTables].filter(t => canonicalTables.has(t)).sort();
const setB_from = [...appFromTables].filter(t => !canonicalTables.has(t)).sort();
const setC = [...canonicalTables].filter(t => !allFrontendTables.has(t)).sort();
const setInMasterMapOnly = [...masterMapTables].filter(t => !appFromTables.has(t)).sort();

console.log('\n--- Set A: .from() references that exist in canonical schema (' + setA_from.length + ') ---');
setA_from.forEach(t => console.log('  ' + t));

console.log('\n--- Set B: .from() references NOT found in canonical schema (' + setB_from.length + ') ---');
if (setB_from.length === 0) console.log('  (NONE)');
else setB_from.forEach(t => console.log('  ' + t));

console.log('\n--- Master Map Tables that use fetchLiveMaster(meta.table) (' + masterMapTables.size + ') ---');
masterMapTables.forEach(t => console.log('  ' + t + (appFromTables.has(t) ? ' [also in .from]' : ' [accessed via fetchLiveMaster / meta.table]')));

console.log('\n--- Set C: Canonical tables NOT directly referenced by frontend persistence (' + setC.length + ') ---');
setC.forEach(t => console.log('  ' + t + ' (' + tableDetails[t].file + ')'));
