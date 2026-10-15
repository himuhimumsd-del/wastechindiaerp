const fs = require('fs');
const path = require('path');

const migDir = 'supabase/migrations';
const files = fs.readdirSync(migDir).sort();

const tableInfo = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(migDir, file), 'utf8');
  
  // Find CREATE TABLE
  const tableMatches = content.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/g);
  for (const m of tableMatches) {
    const tbl = m[1];
    if (!tableInfo[tbl]) {
      tableInfo[tbl] = { file, columns: [], rls: false, policies: [], grants: [] };
    }
    // Parse columns
    const colsBlock = m[2];
    colsBlock.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('PRIMARY KEY') && !trimmed.startsWith('UNIQUE') && !trimmed.startsWith('CHECK')) {
        const colName = trimmed.split(/\s+/)[0].replace(/"/g, '');
        tableInfo[tbl].columns.push(colName);
      }
    });
  }

  // Find RLS
  const rlsMatches = content.matchAll(/ALTER\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/g);
  for (const m of rlsMatches) {
    if (tableInfo[m[1]]) tableInfo[m[1]].rls = true;
  }

  // Find policies
  const polMatches = content.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.([a-zA-Z0-9_]+)\s+FOR\s+([A-Z]+)/g);
  for (const m of polMatches) {
    const polName = m[1];
    const tbl = m[2];
    const action = m[3];
    if (tableInfo[tbl]) {
      tableInfo[tbl].policies.push({ name: polName, action });
    }
  }

  // Find grants
  const grantMatches = content.matchAll(/GRANT\s+([A-Z,\s]+)\s+ON\s+(?:TABLE\s+)?public\.([a-zA-Z0-9_]+)\s+TO\s+authenticated/g);
  for (const m of grantMatches) {
    const privs = m[1].replace(/\s+/g, ' ').trim();
    const tbl = m[2];
    if (tableInfo[tbl]) {
      tableInfo[tbl].grants.push(privs);
    }
  }
});

console.log('Total Tables in Migrations:', Object.keys(tableInfo).length);
for (const [tbl, info] of Object.entries(tableInfo)) {
  console.log(`\nTable: public.${tbl} (created in ${info.file})`);
  console.log(`  Columns (${info.columns.length}): ${info.columns.join(', ')}`);
  console.log(`  RLS: ${info.rls ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Policies (${info.policies.length}): ${info.policies.map(p => `${p.name} [${p.action}]`).join(', ') || 'NONE'}`);
  console.log(`  Authenticated Grants: ${info.grants.join(' | ') || 'NONE'}`);
}
