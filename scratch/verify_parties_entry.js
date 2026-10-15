const fs = require('fs');

const appJs = fs.readFileSync('frontend/app.js', 'utf8');
const html = fs.readFileSync('index (29).html', 'utf8');
const sql = fs.readFileSync('supabase/seed_parties.sql', 'utf8');

// 1. Verify app.js
const appMatches = [...appJs.matchAll(/id:\s*['"](PAR-[0-9]+)['"]/g)].map(m => m[1]);
console.log('app.js party IDs count:', appMatches.length);
console.log('app.js party IDs:', appMatches);

// 2. Verify index (29).html
const htmlMatches = [...html.matchAll(/id:\s*['"](PAR-[0-9]+)['"]/g)].map(m => m[1]);
console.log('\nindex (29).html party IDs count:', htmlMatches.length);
console.log('index (29).html party IDs:', htmlMatches);

// 3. Verify SQL
const sqlInserts = [...sql.matchAll(/INSERT INTO public\.parties/g)];
console.log('\nseed_parties.sql inserts count:', sqlInserts.length);

// 4. Check syntax of app.js using node vm
const vm = require('vm');
const domMock = {
    window: {},
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { onLine: true },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    console: console,
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval
};
const sandbox = vm.createContext({ ...domMock, window: domMock, document: domMock.document, localStorage: domMock.localStorage, navigator: domMock.navigator });

try {
    vm.runInContext(appJs, sandbox);
    console.log('\n✔ app.js successfully evaluated with ZERO syntax errors!');
    const parties = sandbox.state.data.partiesMaster;
    console.log(`✔ sandbox.state.data.partiesMaster contains ${parties.length} parties!`);
    console.log('First 5 parties in state:', parties.slice(0, 5).map(p => ({ id: p.id, name: p.name, type: p.type })));
    console.log('Last 5 parties in state:', parties.slice(-5).map(p => ({ id: p.id, name: p.name, type: p.type })));
} catch (e) {
    console.error('✘ Syntax error in app.js:', e);
}
