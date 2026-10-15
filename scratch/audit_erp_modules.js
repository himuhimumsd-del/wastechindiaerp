const fs = require('fs');
const path = require('path');

const appContent = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Find all modules in modulesConfig
const configMatch = appContent.match(/const modulesConfig = \{([\s\S]*?)\n\s*\};\s*\n/);
let moduleKeys = [];
if (configMatch) {
  const cfgBlock = configMatch[1];
  const keys = cfgBlock.matchAll(/^\s*([a-zA-Z0-9_]+):/gm);
  for (const k of keys) {
    moduleKeys.push(k[1]);
  }
}
console.log('Total modules in modulesConfig:', moduleKeys.length);
console.log('Modules:', moduleKeys);

// 2. Check which modules have live read hydration in hydrateLiveMasterData
console.log('\n--- Checking Hydration in hydrateLiveMasterData ---');
const hydMatch = appContent.match(/async function hydrateLiveMasterData\(\) \{([\s\S]*?)\n\s*console\.info\('\[LiveMaster\] Master data hydration/);
if (hydMatch) {
  const hydBlock = hydMatch[1];
  moduleKeys.forEach(m => {
    const hasFetch = hydBlock.includes(`state.liveMasters.${m}`) || hydBlock.includes(`'${m}'`);
    console.log(`- ${m}: ${hasFetch ? 'Hydrated in liveMasters' : 'Not hydrated / purely local'}`);
  });
}

// 3. Check save paths in app.js
console.log('\n--- Checking Save Paths in app.js ---');
// Search for functions that save data (saveRecord, processGateSave, punchIn, punchOut, etc.)
moduleKeys.forEach(m => {
  const inSaveRecord = appContent.includes(`moduleKey === '${m}'`);
  const hasDedicatedFunc = appContent.includes(`process${m.charAt(0).toUpperCase() + m.slice(1)}Save`) ||
                          appContent.includes(`save${m.charAt(0).toUpperCase() + m.slice(1)}`);
  console.log(`- ${m}: inSaveRecord=${inSaveRecord}, dedicatedSave=${hasDedicatedFunc}`);
});
