const fs = require('fs');
const assert = require('assert');

const code = fs.readFileSync('frontend/app.js', 'utf8');

const keyFunctions = [
    // Wave 10.7 Trips
    'normalizeLiveTrip',
    'getLiveTrips',
    'openTripView',
    'initTripPOCalculators',

    // Wave 11.1 Gate read hydration
    'normalizeLiveGateEntry',
    'getLiveGateEntries',

    // Wave 11.2 Gate live persistence
    'buildLiveGateEntryPayload',
    'processGateSave',
    ".from('gate_entries')",

    // Wave 11.3 Machine & Consumable Logs
    'buildLiveMachineLogPayload',
    'buildLiveConsumableLogPayload',
    'processMachineLogSave',
    'processConsumableLogSave',
    ".from('machine_logs')",
    ".from('consumable_movements')",
    'recomputeConsumableStock',

    // Wave 11.4 Trips Live Persistence
    'buildLiveTripPayload',
    'processTripSave',
    ".from('trips')"
];

keyFunctions.forEach(fn => {
    assert(code.includes(fn), `Regression check failed: missing ${fn}`);
    console.log(`✓ ${fn} intact`);
});

console.log('All regression checks passed cleanly!');
