const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getNewGenerateDummyDataCode } = require('./generate_and_apply_one_month_demo.js');

const newFnCode = getNewGenerateDummyDataCode();

// 1. Update frontend/app.js
console.log('--- Updating frontend/app.js ---');
const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const startMarker = 'function generateDummyData() {';
const endMarker = 'state.data = generateDummyData();';

const startIdx = appJs.indexOf(startMarker);
const endIdx = appJs.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
    throw new Error('Markers not found in frontend/app.js');
}

const updatedAppJs = appJs.substring(0, startIdx) + newFnCode + '\n\n        ' + appJs.substring(endIdx);
new vm.Script(updatedAppJs); // Syntax check
fs.writeFileSync(appJsPath, updatedAppJs, 'utf8');
console.log('Successfully updated frontend/app.js!');

// 2. Update index (29).html
console.log('--- Updating index (29).html ---');
const indexHtmlPath = path.join(__dirname, '..', 'index (29).html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const startIdxHtml = indexHtml.indexOf(startMarker);
const endIdxHtml = indexHtml.indexOf(endMarker, startIdxHtml);

if (startIdxHtml === -1 || endIdxHtml === -1) {
    throw new Error('Markers not found in index (29).html');
}

const updatedIndexHtml = indexHtml.substring(0, startIdxHtml) + newFnCode + '\n\n        ' + indexHtml.substring(endIdxHtml);
fs.writeFileSync(indexHtmlPath, updatedIndexHtml, 'utf8');
console.log('Successfully updated index (29).html!');
