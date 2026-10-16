const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock browser environment
global.window = global;
global.document = {
    getElementById: (id) => {
        if (!global._elements[id]) {
            global._elements[id] = {
                id,
                value: '',
                innerHTML: '',
                innerText: '',
                style: {},
                classList: { add: () => {}, remove: () => {} },
                addEventListener: () => {},
                dispatchEvent: () => {},
                appendChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => []
            };
        }
        return global._elements[id];
    },
    createElement: (tag) => ({
        tagName: tag,
        className: '',
        style: {},
        innerHTML: '',
        children: [],
        appendChild: function(c) { this.children.push(c); },
        setAttribute: () => {},
        getAttribute: () => null
    }),
    body: {
        appendChild: () => {},
        innerHTML: ''
    },
    querySelectorAll: () => []
};
global._elements = {};

// Load app.js
const appJsPath = path.join(__dirname, '../frontend/app.js');
const appContent = fs.readFileSync(appJsPath, 'utf8');

// Check that functions exist in content
assert(appContent.includes('function renderTripModal('), 'renderTripModal must exist');
assert(appContent.includes('function quickAddPO('), 'quickAddPO must exist');
assert(appContent.includes('function quickAddTemplate('), 'quickAddTemplate must exist');
assert(appContent.includes("if (moduleKey === 'trips') return renderTripModal(bodyEl, recordData, recordId);"), 'trips interceptor in openModal must exist');

// Test HTML output of renderTripModal
// Extract renderTripModal function
const extractFn = (name) => {
    const start = appContent.indexOf(`function ${name}(`);
    let braceCount = 0;
    let started = false;
    let end = start;
    for (let i = start; i < appContent.length; i++) {
        if (appContent[i] === '{') {
            braceCount++;
            started = true;
        } else if (appContent[i] === '}') {
            braceCount--;
            if (started && braceCount === 0) {
                end = i + 1;
                break;
            }
        }
    }
    return appContent.substring(start, end);
};

// Set up mock state
global.state = {
    currentCompany: 'COMP-1',
    data: {
        partiesMaster: [
            { id: 'PAR-1', name: 'ACC Limited', type: ['Client'] },
            { id: 'PAR-2', name: 'Sharma Transporters', type: ['Transporter'] }
        ],
        vehicleMaster: [
            { id: 'VEH-1', vehicleNo: 'CG04MS9722', party: 'Sharma Transporters' }
        ],
        poReceived: [
            { id: 'PO-REC-1', party: 'ACC Limited', itemName: 'RDF', status: 'Open' }
        ],
        poIssued: [
            { id: 'PO-ISS-1', party: 'Vendor 1', itemName: 'Coal', status: 'Open' }
        ],
        templatesMaster: [
            { id: 'TMPL-1', name: 'Standard Logistics Terms', content: 'Terms apply.' }
        ],
        itemMaster: [
            { id: 'ITEM-1', name: 'RDF' }
        ]
    },
    liveMasters: {}
};
global.indianStates = ['Chhattisgarh', 'Maharashtra', 'Madhya Pradesh'];
global.getDefaultDateForActivePeriod = () => '2026-10-16';
global.showModalWindow = () => {};
global.initTripPOCalculators = () => {};
global.initConsignorConsigneeSearch = () => {};
global.toggleConsignorConsigneeFields = () => {};
global.filterPOsByClient = () => {};
global.autoFillDestinationFromClient = () => {};
global.autoFillDriverFromVehicle = () => {};

// Evaluate renderTripModal
eval(extractFn('renderTripModal'));

const mockBody = { innerHTML: '', querySelector: () => ({ style: {} }) };
renderTripModal(mockBody, {}, null);

const html = mockBody.innerHTML;

// Verifications against Target Wireframe
console.log('Verifying Target Wireframe fields in rendered HTML...');

// Left Column:
assert(html.includes('id="field_client"'), 'field_client must exist');
assert(html.includes("quickAddParty('field_client')"), 'quickAddParty for client must exist');
assert(html.includes('id="field_poReceived"'), 'field_poReceived must exist');
assert(html.includes("quickAddPO('poReceived', 'field_poReceived')"), 'quickAddPO for poReceived must exist');
assert(html.includes('id="field_transportPOReceived"'), 'field_transportPOReceived must exist');
assert(html.includes("quickAddPO('poReceived', 'field_transportPOReceived')"), 'quickAddPO for transportPOReceived must exist');
assert(html.includes('id="field_poIssued"'), 'field_poIssued must exist');
assert(html.includes("quickAddPO('poIssued', 'field_poIssued')"), 'quickAddPO for poIssued must exist');
assert(html.includes('id="field_linkedTransportPOIssued"'), 'field_linkedTransportPOIssued must exist');
assert(html.includes("quickAddPO('poIssued', 'field_linkedTransportPOIssued')"), 'quickAddPO for linkedTransportPOIssued must exist');
assert(html.includes('id="field_vehicle"'), 'field_vehicle must exist');
assert(html.includes("quickAddVehicle('field_vehicle')"), 'quickAddVehicle must exist');
assert(html.includes('id="field_transportBy"'), 'field_transportBy must exist');
assert(html.includes('id="field_taxInvoiceNumber"'), 'field_taxInvoiceNumber must exist');

// Right Column:
assert(html.includes('id="field_date"'), 'field_date must exist');
assert(html.includes('id="field_freightPaidBy"'), 'field_freightPaidBy must exist');
assert(html.includes('id="field_billType"'), 'field_billType must exist');
assert(html.includes('id="field_insurance"'), 'field_insurance must exist');
assert(html.includes('id="field_insurancePolicyDetails"'), 'field_insurancePolicyDetails must exist');
assert(html.includes('id="field_originCity"'), 'field_originCity must exist');
assert(html.includes('id="field_originState"'), 'field_originState must exist');
assert(html.includes('id="field_destinationCity"'), 'field_destinationCity must exist');
assert(html.includes('id="field_destinationState"'), 'field_destinationState must exist');
assert(html.includes('id="field_ewbNumber"'), 'field_ewbNumber must exist');

// Full Width:
assert(html.includes('id="field_separateConsignorConsignee"'), 'field_separateConsignorConsignee must exist');
assert(html.includes('id="consignor-consignee-container"'), 'consignor-consignee-container must exist');
assert(html.includes('id="trip-items-wrap"'), 'trip-items-wrap must exist');
assert(html.includes('onclick="addTripItemRow()"'), 'addTripItemRow must exist');

// Transportation Charge:
assert(html.includes('id="field_clientTransportationCharge"'), 'field_clientTransportationCharge must exist');
assert(html.includes('id="field_transporterTransportationCharge"'), 'field_transporterTransportationCharge must exist');

// Bottom row:
assert(html.includes('id="trip-attachments-wrap"'), 'trip-attachments-wrap must exist');
assert(html.includes('onclick="addTripAttachmentRow()"'), 'addTripAttachmentRow must exist');
assert(html.includes('id="field_tcTemplate"'), 'field_tcTemplate must exist');
assert(html.includes("quickAddTemplate('field_tcTemplate')"), 'quickAddTemplate must exist');
assert(html.includes('id="field_termsConditions"'), 'field_termsConditions must exist');
assert(html.includes('id="field_remarks"'), 'field_remarks must exist');

console.log('All Target Wireframe layout verifications PASSED successfully!');
