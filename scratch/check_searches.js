const fs = require('fs');
const code = fs.readFileSync('frontend/app.js', 'utf8');

const searches = [
    'machine_logs',
    'consumable_movements',
    "from('machine_logs')",
    "from('consumable_movements')",
    '.insert(',
    '.update(',
    'saveRecord',
    'normalizeLiveMachineLog',
    'normalizeLiveConsumableLog'
];

searches.forEach(term => {
    const count = code.split(term).length - 1;
    console.log(term + ': ' + count + ' occurrences');
    if (count === 0) throw new Error('Missing search term: ' + term);
});
console.log('All search terms verified successfully!');
