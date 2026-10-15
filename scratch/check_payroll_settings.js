const fs = require('fs');

const sql = fs.readFileSync('supabase/migrations/20260912000005_wave5_personnel_hr_masters.sql', 'utf8');

const start = sql.indexOf('CREATE TABLE IF NOT EXISTS public.payroll_settings');
if (start !== -1) {
  const end = sql.indexOf(');', start);
  console.log(sql.slice(start, end + 2));
} else {
  console.log('payroll_settings not found');
}
