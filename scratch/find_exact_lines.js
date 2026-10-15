const fs = require('fs');

const lines = fs.readFileSync('frontend/app.js', 'utf8').split('\n');

function findLine(snippet) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(snippet)) {
      return i + 1;
    }
  }
  return -1;
}

console.log('buildLiveGateEntryPayload:', findLine('function buildLiveGateEntryPayload(record) {'));
console.log('normalizeLiveGateEntry export:', findLine('window.normalizeLiveGateEntry = normalizeLiveGateEntry;'));
console.log('processGateSave:', findLine('function processGateSave() {'));
console.log('saveRecord:', findLine('function saveRecord() {'));
