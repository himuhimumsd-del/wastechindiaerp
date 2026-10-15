const fs = require('fs');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');
const lines = appContent.split('\n');

const occurrences = [];
lines.forEach((line, idx) => {
    if (line.includes('state.data.employees') || line.includes("dataSource.module === 'employees'") || line.includes("dataSource && field.dataSource.module === 'employees'")) {
        occurrences.push({ line: idx + 1, text: line.trim() });
    }
});

console.log(`Found ${occurrences.length} occurrences:`);
occurrences.forEach(o => console.log(`Line ${o.line}: ${o.text}`));
