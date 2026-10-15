const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

// Find sales_invoices and vendor_invoices occurrences
const matches = [...content.matchAll(/from\(['"](sales_invoices|vendor_invoices)['"]\)/g)];
console.log('Matches for sales_invoices/vendor_invoices:', matches.length);

function printContext(str, max = 500) {
  let pos = 0;
  while ((pos = content.indexOf(str, pos)) !== -1) {
    console.log(`\n--- Match at ${pos} ---`);
    console.log(content.slice(pos - 100, pos + max));
    pos += str.length;
  }
}

printContext('.from(\'sales_invoices\')', 600);
printContext('.from(\'vendor_invoices\')', 600);
