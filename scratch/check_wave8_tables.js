const fs = require('fs');

const sql = fs.readFileSync('supabase/migrations/20260912000008_wave8_financial_invoicing_hr_logs.sql', 'utf8');

function printTableDef(tableName) {
  const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
  if (start !== -1) {
    const end = sql.indexOf(');', start);
    console.log(`\n=== TABLE public.${tableName} ===`);
    console.log(sql.slice(start, end + 2));
  } else {
    console.log(`Table ${tableName} not found in migration`);
  }
}

printTableDef('sales_invoices');
printTableDef('vendor_invoices');
printTableDef('attendance');
printTableDef('payroll_ledger');
