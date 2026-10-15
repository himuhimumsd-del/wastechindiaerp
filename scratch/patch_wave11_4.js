const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

// =========================================================================
// 1. SECONDARY CHECK: FIX Wave 11.3 Machine Log UPDATE maintenance & breakdown
// =========================================================================
const oldMachineUpdatePayload = `                // Strict update payload: mutable fields only
                const updatePayload = {
                    machine_id: matchingMachine.id,
                    operator_emp_id: operatorEmpId,
                    log_date: dateVal,
                    hours_run: Number(hoursRun.toFixed(2)),
                    fuel_consumed_litres: Number(fuelConsumed.toFixed(2)),
                    units_consumed_kwh: Number(unitsConsumed.toFixed(2)),
                    remarks: remarksVal.trim() || null
                };`.replace(/\n/g, eol);

const fixedMachineUpdatePayload = `                const breakdownHours = parseFloat(document.getElementById('field_breakdownHours')?.value != null ? document.getElementById('field_breakdownHours')?.value : existingRecord?.breakdown_hours) || 0;
                const maintenance = (document.getElementById('field_maintenance_performed')?.value || existingRecord?.maintenance_performed || '').trim() || null;

                // Strict update payload: mutable fields only
                const updatePayload = {
                    machine_id: matchingMachine.id,
                    operator_emp_id: operatorEmpId,
                    log_date: dateVal,
                    hours_run: Number(hoursRun.toFixed(2)),
                    fuel_consumed_litres: Number(fuelConsumed.toFixed(2)),
                    units_consumed_kwh: Number(unitsConsumed.toFixed(2)),
                    maintenance_performed: maintenance,
                    breakdown_hours: Number(breakdownHours.toFixed(2)),
                    remarks: remarksVal.trim() || null
                };`.replace(/\n/g, eol);

if (!content.includes(oldMachineUpdatePayload)) {
    console.error('Old Machine Log Update Payload not found!');
    process.exit(1);
}
content = content.replace(oldMachineUpdatePayload, fixedMachineUpdatePayload);
console.log('✓ Wave 11.3 Machine Log UPDATE defect corrected (maintenance_performed & breakdown_hours).');

// =========================================================================
// 2. ADD buildLiveTripPayload()
// =========================================================================
const targetPayloadLocation = `            return {
                movement_number: movementNumber,
                consumable_id: consumableId,
                business_id: businessId,
                plant_id: plantId,
                "companyId": plantId,
                movement_type: movementType,
                movement_date: movementDate,
                qty: Number(qty.toFixed(2)),
                unit_price: Number(unitPrice.toFixed(2)),
                total_cost: totalCost,
                machine_id: machineId,
                issued_to: issuedTo,
                remarks: remarks,
                created_by: createdBy
            };
        }`.replace(/\n/g, eol);

const tripPayloadFn = `${eol}${eol}        function buildLiveTripPayload(record) {
            if (!record) throw new Error('No record data provided');

            // 1. Trip Type (required, checked against DB CHECK constraint)
            const rawType = (record.tripType || record.trip_type || '').trim();
            const validTypes = ['Outward (Sales)', 'Inward (Purchase)'];
            if (!rawType || !validTypes.includes(rawType)) {
                throw new Error(\`Invalid trip type: \${rawType}\`);
            }

            // 2. Trip Date (required)
            const tripDate = (record.date || record.trip_date || '').split('T')[0].trim();
            if (!tripDate) {
                throw new Error('Trip date is required');
            }

            // 3. Resolve plant and business UUID from trusted existing context
            const requestedPlant = record.plantId || record.plant_id || record.companyId || state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') {
                authPlant = assertAuthorizedPlant(requestedPlant);
            }
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') {
                authPlant = getCurrentAuthorizedPlant();
            }
            if (!authPlant && Array.isArray(state.authorizedPlants)) {
                authPlant = state.authorizedPlants.find(p => p.id === requestedPlant) || state.authorizedPlants[0] || null;
            }

            const plantId = authPlant ? authPlant.id : requestedPlant;
            const businessId = authPlant ? authPlant.business_id : (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);

            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) {
                throw new Error(\`Invalid business UUID: \${businessId}\`);
            }
            if (!plantId) {
                throw new Error('Plant ID is required');
            }

            // 4. Resolve Party against live parties master
            const rawParty = (record.client || record.party_id || record.party || '').trim();
            if (!rawParty) {
                throw new Error('Client / Party is required');
            }
            const liveParties = (typeof getLiveParties === 'function') ? getLiveParties() : (state.data?.partiesMaster || []);
            const matchingParty = liveParties.find(p => p.id === rawParty || p.name === rawParty);
            if (!matchingParty) {
                throw new Error(\`Selected party "\${rawParty}" not found in live parties\`);
            }
            const partyId = matchingParty.id;

            // 5. Resolve Vehicle against live vehicles & verify plant dedication
            const rawVehicle = (record.vehicle || record.vehicleNo || record.vehicle_id || '').trim();
            if (!rawVehicle) {
                throw new Error('Vehicle is required');
            }
            const liveVehicles = (typeof getLiveVehicles === 'function') ? getLiveVehicles() : (state.data?.vehicleMaster || []);
            const matchingVehicle = liveVehicles.find(v => v.id === rawVehicle || v.vehicleNo === rawVehicle);
            if (!matchingVehicle) {
                throw new Error(\`Selected vehicle "\${rawVehicle}" not found in live vehicles\`);
            }
            const vehPlant = matchingVehicle.plant_id || matchingVehicle.plantId || matchingVehicle.companyId;
            if (vehPlant && vehPlant !== plantId) {
                throw new Error(\`Vehicle \${rawVehicle} is dedicated to plant \${vehPlant} and cannot be used on trip for plant \${plantId}\`);
            }
            const vehicleId = matchingVehicle.id;

            // 6. Resolve Order ID if valid UUID; preserve PO reference strings
            let liveOrderId = null;
            const rawOrderId = record.orderId || record.order_id;
            if (rawOrderId && isUUID(rawOrderId)) {
                liveOrderId = rawOrderId;
            }

            const poReceivedNumber = (record.poReceived || record.po_received_number || '').trim() || null;
            const transportPOReceivedNumber = (record.transportPOReceived || record.transport_po_received_number || '').trim() || null;
            const poIssuedNumber = (record.poIssued || record.po_issued_number || '').trim() || null;
            const linkedTransportPOIssuedNumber = (record.linkedTransportPOIssued || record.linked_transport_po_issued_number || '').trim() || null;

            // 7. Transport mode, freight payer, bill type
            const transportMode = (record.transportBy || record.transport_mode || 'By Road').trim();
            const freightPaidBy = (record.freightPaidBy || record.freight_paid_by || 'Consignor').trim();
            const billType = (record.billType || record.bill_type || 'To Bill').trim();

            // 8. Insurance
            const isInsured = Boolean(record.insurance === 'Yes' || record.is_insured === true || record.is_insured === 'true');
            const insuranceDetails = (record.insurancePolicyDetails || record.insurance_policy_details || '').trim() || null;

            // 9. Origin and Destination (required)
            const originCity = (record.originCity || record.origin_city || '').trim();
            const originState = (record.originState || record.origin_state || '').trim();
            const destinationCity = (record.destinationCity || record.destination_city || '').trim();
            const destinationState = (record.destinationState || record.destination_state || '').trim();

            if (!originCity) throw new Error('Origin City is required');
            if (!originState) throw new Error('Origin State is required');
            if (!destinationCity) throw new Error('Destination City is required');
            if (!destinationState) throw new Error('Destination State is required');

            // 10. Weights
            const grossWeight = parseFloat(record.grossWeight != null ? record.grossWeight : record.gross_weight) || 0;
            const tareWeight = parseFloat(record.tareWeight != null ? record.tareWeight : record.tare_weight) || 0;
            let netWeight = parseFloat(record.netWeight != null ? record.netWeight : record.net_weight) || 0;
            if (netWeight === 0 && grossWeight > 0 && tareWeight > 0) {
                netWeight = Number((grossWeight - tareWeight).toFixed(2));
            }

            // 11. Driver, EWB, status, financial year
            const driverName = (record.driverName || record.driver_name || '').trim() || null;
            const driverPhone = (record.driverPhone || record.driver_phone || '').trim() || null;
            const ewbNumber = (record.ewbNumber || record.eway_bill_no || '').trim() || null;
            const status = (record.status || 'Draft').trim();

            let financialYear = record.financialYear || record.financial_year || null;
            if (!financialYear && typeof getFinancialYear === 'function') {
                financialYear = getFinancialYear(tripDate, plantId);
            }

            // 12. Trip number
            const tripNumber = (record.tripNumber || record.trip_number || record.id || (typeof generateId === 'function' ? generateId('TRP') : \`TRP-\${Date.now()}\`)).trim();

            // 13. Created by / Updated by (authenticated user UUID convention)
            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const actor = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || record.createdBy || record.created_by || 'Logistics Coordinator';

            // 14. Return exact write payload for public.trips (strictly no id, created_at, updated_at)
            return {
                trip_number: tripNumber,
                trip_type: rawType,
                trip_date: tripDate,
                business_id: businessId,
                plant_id: plantId,
                "companyId": plantId,
                party_id: partyId,
                order_id: liveOrderId,
                po_received_number: poReceivedNumber,
                transport_po_received_number: transportPOReceivedNumber,
                po_issued_number: poIssuedNumber,
                linked_transport_po_issued_number: linkedTransportPOIssuedNumber,
                vehicle_id: vehicleId,
                transport_mode: transportMode,
                freight_paid_by: freightPaidBy,
                bill_type: billType,
                is_insured: isInsured,
                insurance_policy_details: insuranceDetails,
                origin_city: originCity,
                origin_state: originState,
                destination_city: destinationCity,
                destination_state: destinationState,
                gross_weight: Number(grossWeight.toFixed(2)),
                tare_weight: Number(tareWeight.toFixed(2)),
                net_weight: Number(netWeight.toFixed(2)),
                driver_name: driverName,
                driver_phone: driverPhone,
                eway_bill_no: ewbNumber,
                status: status,
                financial_year: financialYear || null,
                created_by: actor,
                updated_by: actor
            };
        }`.replace(/\n/g, eol);

if (!content.includes(targetPayloadLocation)) {
    console.error('Target for buildLiveTripPayload not found!');
    process.exit(1);
}
content = content.replace(targetPayloadLocation, targetPayloadLocation + tripPayloadFn);
console.log('✓ buildLiveTripPayload added successfully.');

// =========================================================================
// 3. ADD WINDOW EXPORTS
// =========================================================================
const targetExports = `        window.processConsumableLogSave = processConsumableLogSave;`.replace(/\n/g, eol);
const tripExports = `${eol}        window.buildLiveTripPayload = buildLiveTripPayload;${eol}        window.processTripSave = processTripSave;`.replace(/\n/g, eol);

if (!content.includes(targetExports)) {
    console.error('Target for window exports not found!');
    process.exit(1);
}
content = content.replace(targetExports, targetExports + tripExports);
console.log('✓ window exports updated for Trips.');

// =========================================================================
// 4. ADD processTripSave() HANDLER
// =========================================================================
const targetHandlerLocation = `        function applySmartGST(moduleKey) {`.replace(/\n/g, eol);

const processTripSaveFn = `        async function processTripSave() {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save Trips.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('trips', 'add')) {
                showToast('Unauthorized: You do not have permission to add trips.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('trips', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit trips.', 'error');
                return;
            }

            // 3. Plant & Business authorization check
            const currentPlant = state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') {
                authPlant = assertAuthorizedPlant(currentPlant);
            }
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') {
                authPlant = getCurrentAuthorizedPlant();
            }
            if (!authPlant && Array.isArray(state.authorizedPlants)) {
                authPlant = state.authorizedPlants.find(p => p.id === currentPlant) || state.authorizedPlants[0] || null;
            }

            const businessId = authPlant ? authPlant.business_id : (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) {
                showToast(\`Cannot persist Trip: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist Trip: no authorized plant found.', 'error');
                return;
            }

            // 4. Gather form values
            const tripTypeVal = document.getElementById('field_tripType')?.value || '';
            const dateVal = document.getElementById('field_date')?.value || '';
            const clientVal = document.getElementById('field_client')?.value || '';
            const poReceivedVal = document.getElementById('field_poReceived')?.value || '';
            const transportPOReceivedVal = document.getElementById('field_transportPOReceived')?.value || '';
            const poIssuedVal = document.getElementById('field_poIssued')?.value || '';
            const linkedTransportPOIssuedVal = document.getElementById('field_linkedTransportPOIssued')?.value || '';
            const vehicleVal = document.getElementById('field_vehicle')?.value || '';
            const transportByVal = document.getElementById('field_transportBy')?.value || 'By Road';
            const freightPaidByVal = document.getElementById('field_freightPaidBy')?.value || 'Consignor';
            const billTypeVal = document.getElementById('field_billType')?.value || 'To Bill';
            const insuranceVal = document.getElementById('field_insurance')?.value || 'No';
            const insurancePolicyDetailsVal = document.getElementById('field_insurancePolicyDetails')?.value || '';
            const originCityVal = document.getElementById('field_originCity')?.value || '';
            const originStateVal = document.getElementById('field_originState')?.value || '';
            const destinationCityVal = document.getElementById('field_destinationCity')?.value || '';
            const destinationStateVal = document.getElementById('field_destinationState')?.value || '';
            const grossWeightVal = document.getElementById('field_grossWeight')?.value || '';
            const tareWeightVal = document.getElementById('field_tareWeight')?.value || '';
            const netWeightVal = document.getElementById('field_netWeight')?.value || '';
            const receivedWeightVal = document.getElementById('field_receivedWeight')?.value || '';
            const driverNameVal = document.getElementById('field_driverName')?.value || '';
            const driverPhoneVal = document.getElementById('field_driverPhone')?.value || '';
            const ewbNumberVal = document.getElementById('field_ewbNumber')?.value || '';
            const statusVal = document.getElementById('field_status')?.value || 'Draft';
            const remarksVal = document.getElementById('field_remarks')?.value || '';
            const acceptanceStatusVal = document.getElementById('field_acceptanceStatus')?.value || 'Pending Acceptance';

            // Gather structured items & attachments from DOM
            const items = Array.from(document.querySelectorAll('.trip-item-row')).map(row => ({
                itemName: row.querySelector('.trip-item-name')?.value || '',
                description: row.querySelector('.trip-item-desc')?.value || '',
                weight: row.querySelector('.trip-item-weight')?.value || ''
            })).filter(it => it.itemName || it.description || it.weight);

            const attachments = Array.from(document.querySelectorAll('.trip-attachment-row')).map(row => ({
                type: row.querySelector('.trip-attachment-type')?.value || '',
                file: row.querySelector('.trip-attachment-file-value')?.value || ''
            })).filter(a => a.file);

            // Consignor / Consignee address
            const readAddr = (prefix) => ({
                name: document.getElementById(\`field_\${prefix}_name\`)?.value || '',
                gstin: document.getElementById(\`field_\${prefix}_gstin\`)?.value || '',
                street1: document.getElementById(\`field_\${prefix}_street1\`)?.value || '',
                street2: document.getElementById(\`field_\${prefix}_street2\`)?.value || '',
                city: document.getElementById(\`field_\${prefix}_city\`)?.value || '',
                district: document.getElementById(\`field_\${prefix}_district\`)?.value || '',
                state: document.getElementById(\`field_\${prefix}_state\`)?.value || '',
                pin: document.getElementById(\`field_\${prefix}_pin\`)?.value || ''
            });
            const consignor = document.getElementById('field_consignor_name') ? readAddr('consignor') : null;
            const consignee = document.getElementById('field_consignee_name') ? readAddr('consignee') : null;

            // Derive net weight from items if not provided
            let effectiveNetWeight = netWeightVal;
            if (!effectiveNetWeight && items.length > 0) {
                const totalItemWeight = items.reduce((sum, it) => sum + (parseFloat(it.weight) || 0), 0);
                if (totalItemWeight > 0) {
                    effectiveNetWeight = totalItemWeight.toFixed(2);
                }
            }

            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const actor = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || 'Logistics Coordinator';

            if (!isEditing) {
                // --- INSERT PATH ---
                const rawRecord = {
                    tripType: tripTypeVal,
                    date: dateVal,
                    client: clientVal,
                    poReceived: poReceivedVal,
                    transportPOReceived: transportPOReceivedVal,
                    poIssued: poIssuedVal,
                    linkedTransportPOIssued: linkedTransportPOIssuedVal,
                    vehicle: vehicleVal,
                    transportBy: transportByVal,
                    freightPaidBy: freightPaidByVal,
                    billType: billTypeVal,
                    insurance: insuranceVal,
                    insurancePolicyDetails: insurancePolicyDetailsVal,
                    originCity: originCityVal,
                    originState: originStateVal,
                    destinationCity: destinationCityVal,
                    destinationState: destinationStateVal,
                    grossWeight: grossWeightVal,
                    tareWeight: tareWeightVal,
                    netWeight: effectiveNetWeight,
                    driverName: driverNameVal,
                    driverPhone: driverPhoneVal,
                    ewbNumber: ewbNumberVal,
                    status: statusVal,
                    plantId: authPlant.id,
                    companyId: authPlant.id
                };

                let insertPayload;
                try {
                    insertPayload = buildLiveTripPayload(rawRecord);
                } catch (payloadErr) {
                    showToast(payloadErr.message || 'Failed to construct trip payload', 'error');
                    return;
                }

                try {
                    const { data, error } = await client
                        .from('trips')
                        .insert(insertPayload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[Trips] Insert failed:', error);
                        showToast(\`Failed to save Trip: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveTrip(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved trip row.', 'error');
                        return;
                    }

                    // Carry over rich UI collections to the local record
                    normalizedRow.items = items;
                    normalizedRow.attachments = attachments;
                    if (consignor) normalizedRow.consignor = consignor;
                    if (consignee) normalizedRow.consignee = consignee;
                    if (remarksVal) normalizedRow.remarks = remarksVal;
                    if (receivedWeightVal) normalizedRow.receivedWeight = receivedWeightVal;
                    normalizedRow.acceptanceStatus = acceptanceStatusVal || 'Pending Acceptance';

                    // Synchronize live masters & UI data
                    if (state.liveMasters && Array.isArray(state.liveMasters.trips)) {
                        state.liveMasters.trips.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.trips)) {
                        state.data.trips = [];
                    }
                    state.data.trips.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('trips', 'Create', normalizedRow);
                    }

                    // Trigger PO consumption recalculation
                    if (typeof recomputePoConsumption === 'function') {
                        [normalizedRow.poReceived, normalizedRow.poIssued].filter(Boolean).forEach(poId => recomputePoConsumption(poId));
                    }

                    closeModal();
                    if (state.currentModule === 'trips') {
                        renderTableModule('trips', document.getElementById('content-area'));
                    }
                    showToast(\`Trip saved successfully (\${normalizedRow.tripNumber || normalizedRow.id}).\`, 'success');
                } catch (insertErr) {
                    console.error('[Trips] Insert exception:', insertErr);
                    showToast(\`Error saving Trip: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // --- UPDATE PATH ---
                const liveTrips = (typeof getLiveTrips === 'function') ? getLiveTrips() : (state.data?.trips || []);
                const existingRecord = liveTrips.find(r => r.id === state.editingId || r.dbId === state.editingId || r.tripNumber === state.editingId)
                    || (state.data?.trips || []).find(r => r.id === state.editingId || r.dbId === state.editingId || r.tripNumber === state.editingId);

                const liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update trip: No valid live database UUID found.', 'error');
                    return;
                }

                const tripPlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || authPlant.id;

                // Validate Party
                const liveParties = (typeof getLiveParties === 'function') ? getLiveParties() : (state.data?.partiesMaster || []);
                const matchingParty = liveParties.find(p => p.id === clientVal || p.name === clientVal);
                if (!matchingParty) {
                    showToast(\`Selected party "\${clientVal}" not found in live parties\`, 'error');
                    return;
                }

                // Validate Vehicle
                const liveVehicles = (typeof getLiveVehicles === 'function') ? getLiveVehicles() : (state.data?.vehicleMaster || []);
                const matchingVehicle = liveVehicles.find(v => v.id === vehicleVal || v.vehicleNo === vehicleVal);
                if (!matchingVehicle) {
                    showToast(\`Selected vehicle "\${vehicleVal}" not found in live vehicles\`, 'error');
                    return;
                }
                const vehPlant = matchingVehicle.plant_id || matchingVehicle.plantId || matchingVehicle.companyId;
                if (vehPlant && vehPlant !== tripPlant) {
                    showToast(\`Vehicle \${vehicleVal} is dedicated to plant \${vehPlant} and cannot be used on trip for plant \${tripPlant}\`, 'error');
                    return;
                }

                // Numeric weights
                const grossWeight = parseFloat(grossWeightVal) || 0;
                const tareWeight = parseFloat(tareWeightVal) || 0;
                let netWeight = parseFloat(effectiveNetWeight) || 0;
                if (netWeight === 0 && grossWeight > 0 && tareWeight > 0) {
                    netWeight = Number((grossWeight - tareWeight).toFixed(2));
                }

                let liveOrderId = null;
                if (existingRecord?.order_id && isUUID(existingRecord.order_id)) {
                    liveOrderId = existingRecord.order_id;
                }

                // Strict update payload: mutable fields only
                const updatePayload = {
                    trip_type: tripTypeVal,
                    trip_date: dateVal,
                    party_id: matchingParty.id,
                    order_id: liveOrderId,
                    po_received_number: poReceivedVal.trim() || null,
                    transport_po_received_number: transportPOReceivedVal.trim() || null,
                    po_issued_number: poIssuedVal.trim() || null,
                    linked_transport_po_issued_number: linkedTransportPOIssuedVal.trim() || null,
                    vehicle_id: matchingVehicle.id,
                    transport_mode: transportByVal.trim() || 'By Road',
                    freight_paid_by: freightPaidByVal.trim() || 'Consignor',
                    bill_type: billTypeVal.trim() || 'To Bill',
                    is_insured: Boolean(insuranceVal === 'Yes'),
                    insurance_policy_details: insurancePolicyDetailsVal.trim() || null,
                    origin_city: originCityVal.trim(),
                    origin_state: originStateVal.trim(),
                    destination_city: destinationCityVal.trim(),
                    destination_state: destinationStateVal.trim(),
                    gross_weight: Number(grossWeight.toFixed(2)),
                    tare_weight: Number(tareWeight.toFixed(2)),
                    net_weight: Number(netWeight.toFixed(2)),
                    driver_name: driverNameVal.trim() || null,
                    driver_phone: driverPhoneVal.trim() || null,
                    eway_bill_no: ewbNumberVal.trim() || null,
                    status: statusVal.trim() || 'Draft',
                    updated_by: actor
                };

                try {
                    const { data, error } = await client
                        .from('trips')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[Trips] Update failed:', error);
                        showToast(\`Failed to update Trip: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveTrip(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated trip row.', 'error');
                        return;
                    }

                    // Carry over rich UI collections to the local record
                    normalizedRow.items = items;
                    normalizedRow.attachments = attachments;
                    if (consignor) normalizedRow.consignor = consignor;
                    if (consignee) normalizedRow.consignee = consignee;
                    if (remarksVal) normalizedRow.remarks = remarksVal;
                    if (receivedWeightVal) normalizedRow.receivedWeight = receivedWeightVal;
                    normalizedRow.acceptanceStatus = acceptanceStatusVal || existingRecord?.acceptanceStatus || 'Pending Acceptance';

                    // Update live masters
                    if (state.liveMasters && Array.isArray(state.liveMasters.trips)) {
                        const idx = state.liveMasters.trips.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) {
                            state.liveMasters.trips[idx] = normalizedRow;
                        } else {
                            state.liveMasters.trips.unshift(normalizedRow);
                        }
                    }
                    // Update state.data
                    if (Array.isArray(state.data.trips)) {
                        const idx = state.data.trips.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) {
                            state.data.trips[idx] = normalizedRow;
                        } else {
                            state.data.trips.unshift(normalizedRow);
                        }
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('trips', 'Update', normalizedRow);
                    }

                    // Trigger PO consumption recalculation for both new and previously linked POs
                    if (typeof recomputePoConsumption === 'function') {
                        [normalizedRow.poReceived, normalizedRow.poIssued, existingRecord?.poReceived, existingRecord?.poIssued]
                            .filter(Boolean).forEach(poId => recomputePoConsumption(poId));
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === 'trips') {
                        renderTableModule('trips', document.getElementById('content-area'));
                    }
                    showToast(\`Trip updated successfully (\${normalizedRow.tripNumber || normalizedRow.id}).\`, 'success');
                } catch (updateErr) {
                    console.error('[Trips] Update exception:', updateErr);
                    showToast(\`Error updating Trip: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }${eol}${eol}        function applySmartGST(moduleKey) {`.replace(/\n/g, eol);

if (!content.includes(targetHandlerLocation)) {
    console.error('Target for processTripSave not found!');
    process.exit(1);
}
content = content.replace(targetHandlerLocation, processTripSaveFn);
console.log('✓ processTripSave added successfully.');

// =========================================================================
// 5. WIRE saveRecord()
// =========================================================================
const oldSaveRoute = `            if (moduleKey === 'consumableLogs') {
                return processConsumableLogSave();
            }`.replace(/\n/g, eol);

const newSaveRoute = `            if (moduleKey === 'consumableLogs') {
                return processConsumableLogSave();
            }
            if (moduleKey === 'trips') {
                return processTripSave();
            }`.replace(/\n/g, eol);

if (!content.includes(oldSaveRoute)) {
    console.error('Target for saveRecord routing not found!');
    process.exit(1);
}
content = content.replace(oldSaveRoute, newSaveRoute);
console.log('✓ saveRecord() routed for trips.');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched frontend/app.js for Wave 11.4!');
