const fs = require('fs');
const vm = require('vm');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');
const html = fs.readFileSync('index (29).html', 'utf8');
const sql = fs.readFileSync('supabase/seed_items.sql', 'utf8');

// 1. Verify app.js items
const appItems = [...appJs.matchAll(/id:\s*['"](ITM-[0-9]+)['"]/g)].map(m => m[1]);
console.log('app.js item IDs count:', appItems.length);
console.log('app.js item IDs:', appItems);

// 2. Verify index (29).html items
const htmlItems = [...html.matchAll(/id:\s*['"](ITM-[0-9]+)['"]/g)].map(m => m[1]);
console.log('\nindex (29).html item IDs count:', htmlItems.length);
console.log('index (29).html item IDs:', htmlItems);

// 3. Verify SQL
const sqlInserts = [...sql.matchAll(/INSERT INTO public\.items/g)];
console.log('\nseed_items.sql inserts count:', sqlInserts.length);

// 4. Check syntax of app.js using vm.Script
try {
    new vm.Script(appJs);
    console.log('\n✔ app.js syntax is 100% VALID!');
} catch (e) {
    console.error('✘ app.js syntax error:', e.message);
}

// 5. Check syntax of scripts in index (29).html
const regex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 1;
let allValid = true;
while ((match = regex.exec(html)) !== null) {
    const code = match[1].trim();
    if (code) {
        try {
            new vm.Script(code);
        } catch (e) {
            allValid = false;
            console.error('✘ Script #' + idx + ' error:', e.message);
        }
    }
    idx++;
}
if (allValid) {
    console.log('✔ index (29).html embedded scripts syntax is 100% VALID!');
}
