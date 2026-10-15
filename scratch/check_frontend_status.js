const fs = require('fs');
const vm = require('vm');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Check syntax
try {
    new vm.Script(appJs);
    console.log('[OK] frontend/app.js has 100% VALID syntax!');
} catch (e) {
    console.error('[ERROR] Syntax error in frontend/app.js:', e);
}

// 2. Count parties and items
const appPartyMatches = [...appJs.matchAll(/id:\s*['"](PAR-[0-9]+)['"]/g)].map(m => m[1]);
console.log('frontend/app.js total parties:', appPartyMatches.length);
console.log('frontend/app.js party IDs:', appPartyMatches.join(', '));

const appItemMatches = [...appJs.matchAll(/id:\s*['"](ITM-[0-9]+)['"]/g)].map(m => m[1]);
console.log('frontend/app.js total items:', appItemMatches.length);
console.log('frontend/app.js item IDs:', appItemMatches.join(', '));
