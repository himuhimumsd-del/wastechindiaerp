const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');

// 1. Read current app.js
const appPath = 'frontend/app.js';
const original = fs.readFileSync(appPath, 'utf8');

const t1_find = `            // 5. Resolve Trip UUID safely (only when UUID and matching plant)
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

const t1_replace = `            // 5. Resolve Trip UUID safely (only when UUID and matching plant)
            let liveTripId = null;
            const rawTripRef = record.tripId || record.trip_id || record.tripDbId;
            if (rawTripRef && rawTripRef !== 'Unplanned') {
                const liveTrips = (typeof getLiveTrips === 'function') ? getLiveTrips() : (state.data?.trips || []);
                const matchingTrip = liveTrips.find(t => t.id === rawTripRef || t.dbId === rawTripRef);
                if (!matchingTrip) {
                    throw new Error(\`Selected trip "\${rawTripRef}" not found in live trips\`);
                }
                const tripPlant = matchingTrip.plantId || matchingTrip.plant_id || matchingTrip.companyId;
                if (tripPlant && tripPlant !== plantId) {
                    throw new Error(\`Selected trip belongs to plant "\${tripPlant}", not active plant "\${plantId}"\`);
                }
                if (!isUUID(matchingTrip.dbId)) {
                    throw new Error('Selected trip does not have a valid live database UUID');
                }
                liveTripId = matchingTrip.dbId;
            }

            // 6. Entry number
            const entryNumber = (record.entry_number || record.id || (typeof generateId === 'function' ? generateId('GAT') : \`GAT-\${Date.now()}\`)).trim();

            // 7. Created by from authenticated user context (uses authenticated user UUID)
            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const createdBy = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || record.createdBy || record.created_by || 'Gate Guard';`;

const t2_find = `        window.normalizeLiveTrip = normalizeLiveTrip;
        window.normalizeLiveGateEntry = normalizeLiveGateEntry;`;

const t2_replace = `        window.normalizeLiveTrip = normalizeLiveTrip;
        window.normalizeLiveGateEntry = normalizeLiveGateEntry;
        window.buildLiveGateEntryPayload = buildLiveGateEntryPayload;
        window.processGateSave = processGateSave;`;

const t3_find = `        function processGateSave() {
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

const t3_replace = `        async function processGateSave() {
            // 1. Require authenticated session using existing pattern
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save Gate Verification.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement (Admin edit / Guard add)
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('gateVerification', 'add')) {
                showToast('Unauthorized: You do not have permission to add gate verification records.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('gateVerification', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit gate verification records.', 'error');
                return;
            }

            // 3. Extract and validate form values (supports both camera modal and edit form)
            const vehicle = (
                document.getElementById('gate-vehicle')?.value ||
                document.getElementById('field_vehicleNo')?.value ||
                ''
            ).trim().toUpperCase();

            if (!vehicle) {
                showToast('Vehicle Number required!', 'error');
                return;
            }

            const movementType = (
                document.getElementById('gate-type')?.value ||
                document.getElementById('field_type')?.value ||
                ''
            ).trim();

            const validMovements = ['Inward (Entering Plant)', 'Outward (Leaving Plant)'];
            if (!movementType || !validMovements.includes(movementType)) {
                showToast(\`Valid movement type required (\${movementType || 'none'})!\`, 'error');
                return;
            }

            const status = (
                document.getElementById('gate-status')?.value ||
                document.getElementById('field_status')?.value ||
                'Verified - Allowed Entry'
            ).trim();

            const validStatuses = ['Verified - Allowed Entry', 'Verified - Allowed Exit', 'Hold/Rejected'];
            if (!status || !validStatuses.includes(status)) {
                showToast(\`Valid status required (\${status || 'none'})!\`, 'error');
                return;
            }

            const selectedTripId = (
                document.getElementById('gate-trip')?.value ||
                document.getElementById('field_tripId')?.value ||
                ''
            ).trim();

            const driverName = (
                document.getElementById('gate-driverName')?.value ||
                document.getElementById('field_driverName')?.value ||
                ''
            ).trim();

            const driverPhone = (
                document.getElementById('gate-driverPhone')?.value ||
                document.getElementById('field_driverPhone')?.value ||
                ''
            ).trim();

            const photoFront = document.getElementById('field_photoFront')?.value || '';
            const photoBack = document.getElementById('field_photoBack')?.value || '';

            const remarks = (
                document.getElementById('gate-remarks')?.value ||
                document.getElementById('field_remarks')?.value ||
                ''
            ).trim();

            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            if (!isEditing) {
                // --- INSERT PATH ---
                const rawRecord = {
                    vehicleNo: vehicle,
                    type: movementType,
                    status: status,
                    tripId: selectedTripId,
                    driverName: driverName,
                    driverPhone: driverPhone,
                    photoFront: photoFront,
                    photoBack: photoBack,
                    remarks: remarks,
                    companyId: state.currentCompany,
                    plantId: state.currentCompany
                };

                let insertPayload;
                try {
                    insertPayload = buildLiveGateEntryPayload(rawRecord);
                } catch (payloadErr) {
                    showToast(payloadErr.message || 'Failed to construct gate entry payload', 'error');
                    return;
                }

                try {
                    const { data, error } = await client
                        .from('gate_entries')
                        .insert(insertPayload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[GateVerification] Insert failed:', error);
                        showToast(\`Failed to save Gate Verification: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveGateEntry(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved gate verification row.', 'error');
                        return;
                    }

                    // Synchronize live masters & UI data
                    if (state.liveMasters && Array.isArray(state.liveMasters.gateVerification)) {
                        state.liveMasters.gateVerification.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.gateVerification)) {
                        state.data.gateVerification = [];
                    }
                    state.data.gateVerification.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('gateVerification', 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'gateVerification') {
                        renderTableModule('gateVerification', document.getElementById('content-area'));
                    }
                    showToast(\`Vehicle verified & entry saved successfully (\${normalizedRow.entry_number || normalizedRow.id}).\`, 'success');
                } catch (insertErr) {
                    console.error('[GateVerification] Insert exception:', insertErr);
                    showToast(\`Error saving Gate Verification: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // --- UPDATE PATH ---
                const liveEntries = (typeof getLiveGateEntries === 'function') ? getLiveGateEntries() : (state.data?.gateVerification || []);
                const existingRecord = liveEntries.find(r => r.id === state.editingId || r.dbId === state.editingId || r.entry_number === state.editingId)
                    || (state.data?.gateVerification || []).find(r => r.id === state.editingId || r.dbId === state.editingId || r.entry_number === state.editingId);

                const liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update gate entry: No valid live database UUID found.', 'error');
                    return;
                }

                const entryPlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || state.currentCompany;

                let liveTripId = null;
                if (selectedTripId && selectedTripId !== 'Unplanned') {
                    const liveTrips = (typeof getLiveTrips === 'function') ? getLiveTrips() : (state.data?.trips || []);
                    const matchingTrip = liveTrips.find(t => t.id === selectedTripId || t.dbId === selectedTripId);
                    if (!matchingTrip) {
                        showToast(\`Selected trip "\${selectedTripId}" not found in live trips\`, 'error');
                        return;
                    }
                    const tripPlant = matchingTrip.plantId || matchingTrip.plant_id || matchingTrip.companyId;
                    if (tripPlant && tripPlant !== entryPlant) {
                        showToast(\`Selected trip belongs to plant "\${tripPlant}", not entry plant "\${entryPlant}"\`, 'error');
                        return;
                    }
                    if (!isUUID(matchingTrip.dbId)) {
                        showToast('Selected trip does not have a valid live database UUID', 'error');
                        return;
                    }
                    liveTripId = matchingTrip.dbId;
                }

                // Strict update payload: do not overwrite id, entry_number, created_at, created_by, updated_at
                const updatePayload = {
                    trip_id: liveTripId,
                    movement_type: movementType,
                    vehicle_no: vehicle,
                    driver_name: driverName || null,
                    driver_phone: driverPhone || null,
                    status: status,
                    photo_front_url: photoFront || null,
                    photo_back_url: photoBack || null,
                    guard_remarks: remarks || null
                };

                try {
                    const { data, error } = await client
                        .from('gate_entries')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[GateVerification] Update failed:', error);
                        showToast(\`Failed to update Gate Verification: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveGateEntry(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated gate verification row.', 'error');
                        return;
                    }

                    // Update live masters
                    if (state.liveMasters && Array.isArray(state.liveMasters.gateVerification)) {
                        const idx = state.liveMasters.gateVerification.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) {
                            state.liveMasters.gateVerification[idx] = normalizedRow;
                        } else {
                            state.liveMasters.gateVerification.unshift(normalizedRow);
                        }
                    }
                    // Update state.data
                    if (Array.isArray(state.data.gateVerification)) {
                        const idx = state.data.gateVerification.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) {
                            state.data.gateVerification[idx] = normalizedRow;
                        } else {
                            state.data.gateVerification.unshift(normalizedRow);
                        }
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('gateVerification', 'Update', normalizedRow);
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === 'gateVerification') {
                        renderTableModule('gateVerification', document.getElementById('content-area'));
                    }
                    showToast(\`Gate verification updated successfully (\${normalizedRow.entry_number || normalizedRow.id}).\`, 'success');
                } catch (updateErr) {
                    console.error('[GateVerification] Update exception:', updateErr);
                    showToast(\`Error updating Gate Verification: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }`;

const t4_find = `        // --- CORE SAVE RECORD ---
        function saveRecord() {
            const moduleKey = state.currentModule;
            const config = modulesConfig[moduleKey];`;

const t4_replace = `        // --- CORE SAVE RECORD ---
        function saveRecord() {
            const moduleKey = state.currentModule;
            if (moduleKey === 'gateVerification') {
                return processGateSave();
            }
            const config = modulesConfig[moduleKey];`;

function applyReplace(str, find, replace) {
  const normStr = str.replace(/\r\n/g, '\n');
  const normFind = find.replace(/\r\n/g, '\n');
  const normReplace = replace.replace(/\r\n/g, '\n');
  if (!normStr.includes(normFind)) {
    throw new Error('Pattern not found');
  }
  return normStr.replace(normFind, normReplace);
}

let patched = applyReplace(original, t1_find, t1_replace);
patched = applyReplace(patched, t2_find, t2_replace);
patched = applyReplace(patched, t3_find, t3_replace);
patched = applyReplace(patched, t4_find, t4_replace);

// Preserve CRLF
patched = patched.replace(/\n/g, '\r\n');

fs.writeFileSync(appPath, patched, 'utf8');
console.log('Patch written to frontend/app.js successfully!');

// Run syntax check
execSync('node -c frontend/app.js', { stdio: 'inherit' });
console.log('node -c frontend/app.js passed!');

// Compute SHA-256
const newHash = crypto.createHash('sha256').update(fs.readFileSync(appPath)).digest('hex').toUpperCase();
console.log('New SHA-256 of frontend/app.js:', newHash);
