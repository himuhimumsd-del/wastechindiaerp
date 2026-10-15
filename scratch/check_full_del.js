const fs = require('fs');

const content = fs.readFileSync('frontend/app.js', 'utf8');

const delIdx = content.indexOf('function deleteRecord');
if (delIdx !== -1) {
  console.log(content.slice(delIdx, delIdx + 2500));
}
