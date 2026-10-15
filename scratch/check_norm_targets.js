const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

function checkNormalized(target) {
  const normCode = code.replace(/\r\n/g, '\n');
  const normTarget = target.replace(/\r\n/g, '\n');
  return normCode.includes(normTarget);
}

const t1 = `            // 5. Resolve Trip UUID safely (only when UUID and matching plant)
            let liveTripId = null;
            const rawTripRef = record.tripId || record.trip_id || record.tripDbId;
            if (rawTripRef && rawTripRef !== 'Unplanned') {
                const liveTrips = (typeof getLiveTrips === 'function') ? getLiveTrips() : (state.data?.trips || []);
                const matchingTrip = liveTrips.find(t => t.id === rawTripRef || t.dbId === rawTripRef);
                if (matchingTrip && isUUID(matchingTrip.dbId)) {
                    const tripPlant = matchingTrip.plantId || matchingTrip.plant_id || matchingTrip.companyId;
                    if (!tripPlant || tripPlant === plantId) {
                        liveTripId = matchingTrip.dbId;
                    }
                }
            }

            // 6. Entry number
            const entryNumber = (record.entry_number || record.id || (typeof generateId === 'function' ? generateId('GAT') : \`GAT-\${Date.now()}\`)).trim();

            // 7. Created by from authenticated user context
            const createdBy = state.currentUser ? (state.currentUser.username || state.currentUser.name || 'Gate Guard') : (record.createdBy || record.created_by || 'Gate Guard');`;

console.log('T1 normalized:', checkNormalized(t1));

const t2 = `        window.normalizeLiveTrip = normalizeLiveTrip;
        window.normalizeLiveGateEntry = normalizeLiveGateEntry;`;
console.log('T2 normalized:', checkNormalized(t2));

const t3 = `        function processGateSave() {
            const vehicle = document.getElementById('gate-vehicle').value;
            if(!vehicle) return showToast('Vehicle Number required!', 'error');

            const selectedTripId = document.getElementById('gate-trip').value;
            const selectedTrip = selectedTripId ? getLiveTrips().find(t => t.id === selectedTripId) : null;

            const record = {
                id: generateId('GAT'),
                tripId: selectedTripId || 'Unplanned',
                type: document.getElementById('gate-type').value,
                vehicleNo: vehicle,
                driverName: document.getElementById('gate-driverName')?.value || '',
                driverPhone: document.getElementById('gate-driverPhone')?.value || '',
                status: document.getElementById('gate-status')?.value || 'Verified - Allowed Entry',
                photoFront: document.getElementById('field_photoFront')?.value || '',
                photoBack: document.getElementById('field_photoBack')?.value || '',
                remarks: document.getElementById('gate-remarks')?.value || '',
                // If a trip belongs to another plant, keep that context; else use current.
                companyId: (selectedTrip && selectedTrip.companyId) ? selectedTrip.companyId : state.currentCompany
            };
            if (state.liveMasters && Array.isArray(state.liveMasters.gateVerification)) {
                state.liveMasters.gateVerification.unshift(record);
            }
            state.data.gateVerification.unshift(record); logAudit('gateVerification', 'Create', record);
            closeModal(); if(state.currentModule === 'gateVerification') renderTableModule('gateVerification', document.getElementById('content-area'));
            showToast(\`Vehicle verified successfully.\`, 'success');
        }`;
console.log('T3 normalized:', checkNormalized(t3));

const t4 = `        // --- CORE SAVE RECORD ---
        function saveRecord() {
            const moduleKey = state.currentModule;
            const config = modulesConfig[moduleKey];`;
console.log('T4 normalized:', checkNormalized(t4));
