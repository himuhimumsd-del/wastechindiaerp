const fs = require('fs');

let content = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Check buildLiveGateEntryPayload
console.log('Has buildLiveGateEntryPayload:', content.includes('function buildLiveGateEntryPayload(record) {'));

// 2. Check processGateSave
console.log('Has processGateSave:', content.includes('function processGateSave() {'));

// 3. Check saveRecord
console.log('Has saveRecord:', content.includes('function saveRecord() {'));

// 4. Check window.normalizeLiveGateEntry
console.log('Has window.normalizeLiveGateEntry:', content.includes('window.normalizeLiveGateEntry = normalizeLiveGateEntry;'));
