const fs = require('fs');
const content = fs.readFileSync('frontend/app.js', 'utf8');

const queries = [
  'poReceived',
  'poIssued',
  'grn',
  'orders',
  'order_items',
  "from('orders')",
  "from('order_items')",
  "from('grn')",
  "from('grn_items')",
  '.insert(',
  '.update(',
  '.delete(',
  'saveRecord'
];

queries.forEach(q => {
  let count = 0;
  let pos = content.indexOf(q);
  while (pos !== -1) {
    count++;
    pos = content.indexOf(q, pos + 1);
  }
  console.log(`${q} : ${count}`);
});
