const fs = require('fs');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

// Full modulesConfig.employees
const mStart = appContent.indexOf("employees: {");
const mEnd = appContent.indexOf("};\n", mStart);
console.log('--- modulesConfig.employees full ---');
console.log(appContent.substring(mStart, mEnd > -1 ? mEnd + 2 : mStart + 2000));

// Find renderTableModule implementation
const rtmDef = appContent.indexOf("function renderTableModule(");
console.log('\n--- function renderTableModule definition ---');
console.log(appContent.substring(rtmDef, rtmDef + 1500));
