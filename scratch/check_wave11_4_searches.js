const fs = require('fs');
const code = fs.readFileSync('frontend/app.js', 'utf8');

const searches = [
    'normalizeLiveTrip',
    'getLiveTrips',
    "from('trips')",
    '.insert(',
    '.update(',
    '.delete(',
    'saveRecord',
    'vehicle_id',
    'party_id',
    'order_id'
];

searches.forEach(term => {
    const count = code.split(term).length - 1;
    console.log(term + ': ' + count + ' occurrences');
    if (count === 0 && term !== '.delete(') throw new Error('Missing search term: ' + term);
});
console.log('Search verification complete.');
