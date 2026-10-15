const fs = require('fs');

const content = fs.readFileSync('supabase/seed_demo_month.sql', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);
console.log('Total chars:', content.length);

// 1. Check end of file
console.log('--- Last 5 lines ---');
lines.slice(-5).forEach((l, idx) => console.log(lines.length - 5 + idx + 1 + ': ' + l));

// 2. Count quotes
let openQuote = false;
let openQuoteLine = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // skip comment lines
    if (line.trim().startsWith('--')) continue;

    for (let c = 0; c < line.length; c++) {
        if (line[c] === "'") {
            // Check if escaped ''
            if (openQuote && line[c + 1] === "'") {
                c++; // skip next quote
                continue;
            }
            openQuote = !openQuote;
            if (openQuote) openQuoteLine = i + 1;
        }
    }
}

if (openQuote) {
    console.error('ERROR: Unclosed quote starting at line', openQuoteLine);
} else {
    console.log('SUCCESS: All single quotes are properly balanced!');
}

// 3. Count parentheses
let parenDepth = 0;
let parenLine = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('--')) continue;
    let inStr = false;
    for (let c = 0; c < line.length; c++) {
        if (line[c] === "'") {
            if (inStr && line[c + 1] === "'") { c++; continue; }
            inStr = !inStr;
        }
        if (!inStr) {
            if (line[c] === '(') { parenDepth++; parenLine = i + 1; }
            if (line[c] === ')') parenDepth--;
        }
    }
}

if (parenDepth !== 0) {
    console.error('ERROR: Unbalanced parentheses! Depth:', parenDepth, 'Last open at line', parenLine);
} else {
    console.log('SUCCESS: All parentheses are properly balanced!');
}

// 4. Check semicolons at end of statements
let stmts = content.split(';').map(s => s.trim()).filter(Boolean);
console.log('Total executable statements:', stmts.length);
