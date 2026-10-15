const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

// ==========================================
// 1. ADD PAYLOAD BUILDERS
// ==========================================
const target1 = `            // 8. Build exact 14 write fields (strictly no id, created_at, updated_at)
            return {
                entry_number: entryNumber,
                trip_id: liveTripId,
                business_id: businessId,
                plant_id: plantId,
                "companyId": plantId,
                movement_type: movementType,
                vehicle_no: rawVehicle,
                driver_name: (record.driverName || record.driver_name || '').trim() || null,
                driver_phone: (record.driverPhone || record.driver_phone || '').trim() || null,
                status: status,
                photo_front_url: record.photoFront || record.photo_front_url || null,
                photo_back_url: record.photoBack || record.photo_back_url || null,
                guard_remarks: (record.remarks || record.guard_remarks || '').trim() || null,
                created_by: createdBy
            };
        }`.replace(/\n/g, eol);

const addition1 = `${eol}${eol}        function buildLiveMachineLogPayload(record) {
            if (!record) throw new Error('No record data provided');

            // 1. Date (required)
            const logDate = (record.date || record.log_date || '').trim();
            if (!logDate) {
                throw new Error('Log date is required');
            }

            // 2. Machine resolution & cross-plant check
            const rawMachine = (record.machine || record.machine_id || '').trim();
            if (!rawMachine) {
                throw new Error('Machine is required');
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

            const liveMachinery = (typeof getLivePlantMachinery === 'function') ? getLivePlantMachinery() : (state.data?.machineryMaster || []);
            const matchingMachine = liveMachinery.find(m => m.id === rawMachine || m.name === rawMachine);
            if (!matchingMachine) {
                throw new Error(\`Selected machine "\${rawMachine}" not found in live machinery\`);
            }
            const machinePlant = matchingMachine.plant_id || matchingMachine.plantId || matchingMachine.companyId;
            if (machinePlant && machinePlant !== plantId) {
                throw new Error(\`Selected machine belongs to plant "\${machinePlant}", not active plant "\${plantId}"\`);
            }
            const machineId = matchingMachine.id;

            // 4. Operator resolution & cross-plant check (optional in DB, validated against plant if present)
            let operatorEmpId = null;
            const rawOperator = (record.operator || record.operator_emp_id || '').trim();
            if (rawOperator) {
                const liveEmployees = (typeof getLiveEmployees === 'function') ? getLiveEmployees() : (state.data?.employees || []);
                const matchingOperator = liveEmployees.find(e => e.id === rawOperator || e.name === rawOperator);
                if (!matchingOperator) {
                    throw new Error(\`Selected operator "\${rawOperator}" not found in live employees\`);
                }
                const operatorPlant = matchingOperator.plant_id || matchingOperator.plantId || matchingOperator.companyId;
                if (operatorPlant && operatorPlant !== plantId) {
                    throw new Error(\`Selected operator belongs to plant "\${operatorPlant}", not active plant "\${plantId}"\`);
                }
                operatorEmpId = matchingOperator.id;
            }

            // 5. Numerical metrics
            const hoursRun = record.runningHours != null ? parseFloat(record.runningHours) : (record.hours_run != null ? parseFloat(record.hours_run) : 0);
            const fuelConsumed = record.dieselConsumed != null ? parseFloat(record.dieselConsumed) : (record.fuel_consumed_litres != null ? parseFloat(record.fuel_consumed_litres) : 0);
            const unitsConsumed = record.elecUsed != null ? parseFloat(record.elecUsed) : (record.units_consumed_kwh != null ? parseFloat(record.units_consumed_kwh) : 0);
            const breakdownHours = record.breakdownHours != null ? parseFloat(record.breakdownHours) : (record.breakdown_hours != null ? parseFloat(record.breakdown_hours) : 0);

            const maintenance = (record.maintenance_performed || '').trim() || null;
            const remarks = (record.remarks || '').trim() || null;

            // 6. Created by (authenticated user UUID convention)
            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const createdBy = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || record.createdBy || record.created_by || 'Plant Operator';

            // 7. Return exact insert payload (strictly no id, created_at, updated_at)
            return {
                machine_id: machineId,
                business_id: businessId,
                plant_id: plantId,
                "companyId": plantId,
                log_date: logDate,
                hours_run: isNaN(hoursRun) ? 0 : Number(hoursRun.toFixed(2)),
                fuel_consumed_litres: isNaN(fuelConsumed) ? 0 : Number(fuelConsumed.toFixed(2)),
                units_consumed_kwh: isNaN(unitsConsumed) ? 0 : Number(unitsConsumed.toFixed(2)),
                maintenance_performed: maintenance,
                breakdown_hours: isNaN(breakdownHours) ? 0 : Number(breakdownHours.toFixed(2)),
                operator_emp_id: operatorEmpId,
                remarks: remarks,
                created_by: createdBy
            };
        }

        function buildLiveConsumableLogPayload(record) {
            if (!record) throw new Error('No record data provided');

            // 1. Date (required)
            const movementDate = (record.date || record.movement_date || '').trim();
            if (!movementDate) {
                throw new Error('Movement date is required');
            }

            // 2. Resolve plant and business UUID from trusted existing context
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

            // 3. Consumable resolution & cross-plant check
            const rawConsumable = (record.consumable || record.consumable_id || '').trim();
            if (!rawConsumable) {
                throw new Error('Consumable is required');
            }
            const liveConsumables = (typeof getLiveConsumables === 'function') ? getLiveConsumables() : (state.data?.consumablesMaster || []);
            const matchingConsumable = liveConsumables.find(c => c.id === rawConsumable || c.name === rawConsumable);
            if (!matchingConsumable) {
                throw new Error(\`Selected consumable "\${rawConsumable}" not found in live consumables\`);
            }
            const consumablePlant = matchingConsumable.plant_id || matchingConsumable.plantId || matchingConsumable.companyId;
            if (consumablePlant && consumablePlant !== plantId) {
                throw new Error(\`Selected consumable belongs to plant "\${consumablePlant}", not active plant "\${plantId}"\`);
            }
            const consumableId = matchingConsumable.id;

            // 4. Machine resolution & cross-plant check (optional)
            let machineId = null;
            const rawMachine = (record.machine || record.machine_id || '').trim();
            if (rawMachine) {
                const liveMachinery = (typeof getLivePlantMachinery === 'function') ? getLivePlantMachinery() : (state.data?.machineryMaster || []);
                const matchingMachine = liveMachinery.find(m => m.id === rawMachine || m.name === rawMachine);
                if (!matchingMachine) {
                    throw new Error(\`Selected machine "\${rawMachine}" not found in live machinery\`);
                }
                const machinePlant = matchingMachine.plant_id || matchingMachine.plantId || matchingMachine.companyId;
                if (machinePlant && machinePlant !== plantId) {
                    throw new Error(\`Selected machine belongs to plant "\${machinePlant}", not active plant "\${plantId}"\`);
                }
                machineId = matchingMachine.id;
            }

            // 5. Strict Enum Mapping for movement_type
            // Supported: 'Stock In (Purchase)', 'Issue to Machine', 'Issue to Plant', 'Adjustment', 'Return'
            const rawType = (record.movementType || record.movement_type || '').trim();
            let movementType = null;
            if (rawType === 'Purchased (In)' || rawType === 'Stock In (Purchase)') {
                movementType = 'Stock In (Purchase)';
            } else if (rawType === 'Issued (Out)') {
                movementType = machineId ? 'Issue to Machine' : 'Issue to Plant';
            } else if (rawType === 'Issue to Machine') {
                movementType = 'Issue to Machine';
            } else if (rawType === 'Issue to Plant') {
                movementType = 'Issue to Plant';
            } else if (rawType === 'Adjustment') {
                movementType = 'Adjustment';
            } else if (rawType === 'Return') {
                movementType = 'Return';
            } else {
                throw new Error(\`Invalid consumable movement type: \${rawType}\`);
            }

            // 6. Quantity, price, total cost
            const rawQty = record.quantity != null ? record.quantity : record.qty;
            const qty = parseFloat(rawQty);
            if (isNaN(qty) || qty <= 0) {
                throw new Error('Quantity must be greater than 0');
            }

            const rawPrice = record.pricePerUnit != null ? record.pricePerUnit : record.unit_price;
            const unitPrice = parseFloat(rawPrice);
            if (isNaN(unitPrice) || unitPrice < 0) {
                throw new Error('Price per unit cannot be negative');
            }

            let totalCost = parseFloat(record.totalAmount != null ? record.totalAmount : record.total_cost);
            if (isNaN(totalCost) || totalCost <= 0) {
                totalCost = Number((qty * unitPrice).toFixed(2));
            } else {
                totalCost = Number(totalCost.toFixed(2));
            }

            // 7. Movement number
            const movementNumber = (record.movement_number || record.movementNumber || record.id || (typeof generateId === 'function' ? generateId('CON') : \`CON-\${Date.now()}\`)).trim();

            // 8. Issued to & remarks
            const issuedTo = (record.issuedTo || record.issued_to || '').trim() || null;
            const remarks = (record.remarks || '').trim() || null;

            // 9. Created by (authenticated user UUID convention)
            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const createdBy = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || record.createdBy || record.created_by || 'Plant Operations';

            // 10. Return exact insert payload (strictly no id, created_at, updated_at)
            return {
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

if (!content.includes(target1)) {
    console.error('Target 1 not found!');
    process.exit(1);
}
content = content.replace(target1, target1 + addition1);

// ==========================================
// 2. ADD WINDOW EXPORTS
// ==========================================
const target2 = `        window.processGateSave = processGateSave;`.replace(/\n/g, eol);
const addition2 = `${eol}        window.buildLiveMachineLogPayload = buildLiveMachineLogPayload;${eol}        window.buildLiveConsumableLogPayload = buildLiveConsumableLogPayload;${eol}        window.processMachineLogSave = processMachineLogSave;${eol}        window.processConsumableLogSave = processConsumableLogSave;`.replace(/\n/g, eol);

if (!content.includes(target2)) {
    console.error('Target 2 not found!');
    process.exit(1);
}
content = content.replace(target2, target2 + addition2);

// ==========================================
// 3. ADD MODULE SAVE HANDLERS
// ==========================================
const target3 = `        function applySmartGST(moduleKey) {`.replace(/\n/g, eol);

const addition3 = `        async function processMachineLogSave() {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save Machine Logs.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('machineLogs', 'add')) {
                showToast('Unauthorized: You do not have permission to add machine logs.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('machineLogs', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit machine logs.', 'error');
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
                showToast(\`Cannot persist Machine Log: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist Machine Log: no authorized plant found.', 'error');
                return;
            }

            // 4. Gather form values
            const dateVal = document.getElementById('field_date')?.value || '';
            const machineVal = document.getElementById('field_machine')?.value || '';
            const shiftVal = document.getElementById('field_shift')?.value || 'Day';
            const operatorVal = document.getElementById('field_operator')?.value || '';
            const runningHoursVal = document.getElementById('field_runningHours')?.value || '';
            const dieselConsumedVal = document.getElementById('field_dieselConsumed')?.value || '';
            const elecUsedVal = document.getElementById('field_elecUsed')?.value || '';
            const remarksVal = document.getElementById('field_remarks')?.value || '';

            // Telemetry readings to preserve in local state object
            const openingReadingVal = document.getElementById('field_openingReading')?.value || '';
            const openingTimeVal = document.getElementById('field_openingTime')?.value || '';
            const openingDieselReadingVal = document.getElementById('field_openingDieselReading')?.value || '';
            const closingReadingVal = document.getElementById('field_closingReading')?.value || '';
            const closingTimeVal = document.getElementById('field_closingTime')?.value || '';
            const closingDieselReadingVal = document.getElementById('field_closingDieselReading')?.value || '';
            const dieselFilledVal = document.getElementById('field_dieselFilled')?.value || '';
            const dieselFillingTimeVal = document.getElementById('field_dieselFillingTime')?.value || '';
            const dieselFillingTimeReadingVal = document.getElementById('field_dieselFillingTimeReading')?.value || '';
            const dieselShowAfterFillingVal = document.getElementById('field_dieselShowAfterFilling')?.value || '';
            const hourReadingAtFillingVal = document.getElementById('field_hourReadingAtFilling')?.value || '';

            if (!isEditing) {
                // --- INSERT PATH ---
                const rawRecord = {
                    date: dateVal,
                    machine: machineVal,
                    shift: shiftVal,
                    operator: operatorVal,
                    runningHours: runningHoursVal,
                    dieselConsumed: dieselConsumedVal,
                    elecUsed: elecUsedVal,
                    remarks: remarksVal,
                    plantId: authPlant.id,
                    companyId: authPlant.id
                };

                let insertPayload;
                try {
                    insertPayload = buildLiveMachineLogPayload(rawRecord);
                } catch (payloadErr) {
                    showToast(payloadErr.message || 'Failed to construct machine log payload', 'error');
                    return;
                }

                try {
                    const { data, error } = await client
                        .from('machine_logs')
                        .insert(insertPayload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[MachineLogs] Insert failed:', error);
                        showToast(\`Failed to save Machine Log: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveMachineLog(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved machine log row.', 'error');
                        return;
                    }

                    // Carry over UI-only form telemetry fields into local state object
                    if (shiftVal) normalizedRow.shift = shiftVal;
                    if (openingReadingVal) normalizedRow.openingReading = openingReadingVal;
                    if (openingTimeVal) normalizedRow.openingTime = openingTimeVal;
                    if (openingDieselReadingVal) normalizedRow.openingDieselReading = openingDieselReadingVal;
                    if (closingReadingVal) normalizedRow.closingReading = closingReadingVal;
                    if (closingTimeVal) normalizedRow.closingTime = closingTimeVal;
                    if (closingDieselReadingVal) normalizedRow.closingDieselReading = closingDieselReadingVal;
                    if (dieselFilledVal) normalizedRow.dieselFilled = dieselFilledVal;
                    if (dieselFillingTimeVal) normalizedRow.dieselFillingTime = dieselFillingTimeVal;
                    if (dieselFillingTimeReadingVal) normalizedRow.dieselFillingTimeReading = dieselFillingTimeReadingVal;
                    if (dieselShowAfterFillingVal) normalizedRow.dieselShowAfterFilling = dieselShowAfterFillingVal;
                    if (hourReadingAtFillingVal) normalizedRow.hourReadingAtFilling = hourReadingAtFillingVal;

                    // Synchronize live masters & UI data
                    if (state.liveMasters && Array.isArray(state.liveMasters.machineLogs)) {
                        state.liveMasters.machineLogs.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.machineLogs)) {
                        state.data.machineLogs = [];
                    }
                    state.data.machineLogs.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('machineLogs', 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'machineLogs') {
                        renderTableModule('machineLogs', document.getElementById('content-area'));
                    }
                    showToast(\`Machine log saved successfully (\${normalizedRow.machine || normalizedRow.id}).\`, 'success');
                } catch (insertErr) {
                    console.error('[MachineLogs] Insert exception:', insertErr);
                    showToast(\`Error saving Machine Log: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // --- UPDATE PATH ---
                const liveLogs = (typeof getLiveMachineLogs === 'function') ? getLiveMachineLogs() : (state.data?.machineLogs || []);
                const existingRecord = liveLogs.find(r => r.id === state.editingId || r.dbId === state.editingId)
                    || (state.data?.machineLogs || []).find(r => r.id === state.editingId || r.dbId === state.editingId);

                const liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update machine log: No valid live database UUID found.', 'error');
                    return;
                }

                const logPlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || authPlant.id;

                // Verify machine
                const liveMachinery = (typeof getLivePlantMachinery === 'function') ? getLivePlantMachinery() : (state.data?.machineryMaster || []);
                const matchingMachine = liveMachinery.find(m => m.id === machineVal || m.name === machineVal);
                if (!matchingMachine) {
                    showToast(\`Selected machine "\${machineVal}" not found in live machinery\`, 'error');
                    return;
                }
                const machinePlant = matchingMachine.plant_id || matchingMachine.plantId || matchingMachine.companyId;
                if (machinePlant && machinePlant !== logPlant) {
                    showToast(\`Selected machine belongs to plant "\${machinePlant}", not log plant "\${logPlant}"\`, 'error');
                    return;
                }

                // Verify operator
                let operatorEmpId = null;
                if (operatorVal) {
                    const liveEmployees = (typeof getLiveEmployees === 'function') ? getLiveEmployees() : (state.data?.employees || []);
                    const matchingOperator = liveEmployees.find(e => e.id === operatorVal || e.name === operatorVal);
                    if (!matchingOperator) {
                        showToast(\`Selected operator "\${operatorVal}" not found in live employees\`, 'error');
                        return;
                    }
                    const operatorPlant = matchingOperator.plant_id || matchingOperator.plantId || matchingOperator.companyId;
                    if (operatorPlant && operatorPlant !== logPlant) {
                        showToast(\`Selected operator belongs to plant "\${operatorPlant}", not log plant "\${logPlant}"\`, 'error');
                        return;
                    }
                    operatorEmpId = matchingOperator.id;
                }

                const hoursRun = parseFloat(runningHoursVal) || 0;
                const fuelConsumed = parseFloat(dieselConsumedVal) || 0;
                const unitsConsumed = parseFloat(elecUsedVal) || 0;

                // Strict update payload: mutable fields only
                const updatePayload = {
                    machine_id: matchingMachine.id,
                    operator_emp_id: operatorEmpId,
                    log_date: dateVal,
                    hours_run: Number(hoursRun.toFixed(2)),
                    fuel_consumed_litres: Number(fuelConsumed.toFixed(2)),
                    units_consumed_kwh: Number(unitsConsumed.toFixed(2)),
                    remarks: remarksVal.trim() || null
                };

                try {
                    const { data, error } = await client
                        .from('machine_logs')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[MachineLogs] Update failed:', error);
                        showToast(\`Failed to update Machine Log: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveMachineLog(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated machine log row.', 'error');
                        return;
                    }

                    // Carry over UI-only form telemetry fields into local state object
                    if (shiftVal) normalizedRow.shift = shiftVal;
                    if (openingReadingVal) normalizedRow.openingReading = openingReadingVal;
                    if (openingTimeVal) normalizedRow.openingTime = openingTimeVal;
                    if (openingDieselReadingVal) normalizedRow.openingDieselReading = openingDieselReadingVal;
                    if (closingReadingVal) normalizedRow.closingReading = closingReadingVal;
                    if (closingTimeVal) normalizedRow.closingTime = closingTimeVal;
                    if (closingDieselReadingVal) normalizedRow.closingDieselReading = closingDieselReadingVal;
                    if (dieselFilledVal) normalizedRow.dieselFilled = dieselFilledVal;
                    if (dieselFillingTimeVal) normalizedRow.dieselFillingTime = dieselFillingTimeVal;
                    if (dieselFillingTimeReadingVal) normalizedRow.dieselFillingTimeReading = dieselFillingTimeReadingVal;
                    if (dieselShowAfterFillingVal) normalizedRow.dieselShowAfterFilling = dieselShowAfterFillingVal;
                    if (hourReadingAtFillingVal) normalizedRow.hourReadingAtFilling = hourReadingAtFillingVal;

                    // Update live masters
                    if (state.liveMasters && Array.isArray(state.liveMasters.machineLogs)) {
                        const idx = state.liveMasters.machineLogs.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) {
                            state.liveMasters.machineLogs[idx] = normalizedRow;
                        } else {
                            state.liveMasters.machineLogs.unshift(normalizedRow);
                        }
                    }
                    // Update state.data
                    if (Array.isArray(state.data.machineLogs)) {
                        const idx = state.data.machineLogs.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) {
                            state.data.machineLogs[idx] = normalizedRow;
                        } else {
                            state.data.machineLogs.unshift(normalizedRow);
                        }
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('machineLogs', 'Update', normalizedRow);
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === 'machineLogs') {
                        renderTableModule('machineLogs', document.getElementById('content-area'));
                    }
                    showToast(\`Machine log updated successfully (\${normalizedRow.machine || normalizedRow.id}).\`, 'success');
                } catch (updateErr) {
                    console.error('[MachineLogs] Update exception:', updateErr);
                    showToast(\`Error updating Machine Log: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }

        async function processConsumableLogSave() {
            // 1. Immutable audit record guard — APPEND-ONLY
            if (state.editingId) {
                showToast('Consumable movement logs are immutable audit records and cannot be edited. To adjust stock, please add a new adjustment movement.', 'warning');
                return;
            }

            // 2. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save Consumable Movement Logs.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            // 3. Permission check
            if (typeof hasPerm === 'function' && !hasPerm('consumableLogs', 'add')) {
                showToast('Unauthorized: You do not have permission to add consumable logs.', 'error');
                return;
            }

            // 4. Plant & Business authorization check
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
                showToast(\`Cannot persist Consumable Movement: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist Consumable Movement: no authorized plant found.', 'error');
                return;
            }

            // 5. Gather form values
            const dateVal = document.getElementById('field_date')?.value || '';
            const consumableVal = document.getElementById('field_consumable')?.value || '';
            const movementTypeVal = document.getElementById('field_movementType')?.value || '';
            const quantityVal = document.getElementById('field_quantity')?.value || '';
            const pricePerUnitVal = document.getElementById('field_pricePerUnit')?.value || '';
            const totalAmountVal = document.getElementById('field_totalAmount')?.value || '';
            const issuedToVal = document.getElementById('field_issuedTo')?.value || '';
            const machineVal = document.getElementById('field_machine')?.value || '';
            const remarksVal = document.getElementById('field_remarks')?.value || '';

            const rawRecord = {
                date: dateVal,
                consumable: consumableVal,
                movementType: movementTypeVal,
                quantity: quantityVal,
                pricePerUnit: pricePerUnitVal,
                totalAmount: totalAmountVal,
                issuedTo: issuedToVal,
                machine: machineVal,
                remarks: remarksVal,
                plantId: authPlant.id,
                companyId: authPlant.id
            };

            let insertPayload;
            try {
                insertPayload = buildLiveConsumableLogPayload(rawRecord);
            } catch (payloadErr) {
                showToast(payloadErr.message || 'Failed to construct consumable movement payload', 'error');
                return;
            }

            try {
                const { data, error } = await client
                    .from('consumable_movements')
                    .insert(insertPayload)
                    .select()
                    .single();

                if (error) {
                    console.error('[ConsumableLogs] Insert failed:', error);
                    showToast(\`Failed to save Consumable Movement: \${error.message || error.details || 'Database error'}\`, 'error');
                    return;
                }

                const normalizedRow = normalizeLiveConsumableLog(data);
                if (!normalizedRow) {
                    showToast('Failed to normalize saved consumable movement row.', 'error');
                    return;
                }

                // Synchronize live masters & UI data
                if (state.liveMasters && Array.isArray(state.liveMasters.consumableLogs)) {
                    state.liveMasters.consumableLogs.unshift(normalizedRow);
                }
                if (!Array.isArray(state.data.consumableLogs)) {
                    state.data.consumableLogs = [];
                }
                state.data.consumableLogs.unshift(normalizedRow);

                if (typeof logAudit === 'function') {
                    logAudit('consumableLogs', 'Create', normalizedRow);
                }

                // Recompute consumable stock
                if (typeof recomputeConsumableStock === 'function') {
                    recomputeConsumableStock(normalizedRow.consumable || normalizedRow.consumable_id);
                }

                closeModal();
                if (state.currentModule === 'consumableLogs') {
                    renderTableModule('consumableLogs', document.getElementById('content-area'));
                }
                showToast(\`Consumable movement logged successfully (\${normalizedRow.movement_number || normalizedRow.id}).\`, 'success');
            } catch (insertErr) {
                console.error('[ConsumableLogs] Insert exception:', insertErr);
                showToast(\`Error saving Consumable Movement: \${insertErr.message || 'Unexpected error'}\`, 'error');
                return;
            }
        }${eol}${eol}        function applySmartGST(moduleKey) {`.replace(/\n/g, eol);

if (!content.includes(target3)) {
    console.error('Target 3 not found!');
    process.exit(1);
}
content = content.replace(target3, addition3);

// ==========================================
// 4. ROUTE IN SAVERECORD()
// ==========================================
const target4 = `            if (moduleKey === 'gateVerification') {
                return processGateSave();
            }`.replace(/\n/g, eol);

const addition4 = `            if (moduleKey === 'gateVerification') {
                return processGateSave();
            }
            if (moduleKey === 'machineLogs') {
                return processMachineLogSave();
            }
            if (moduleKey === 'consumableLogs') {
                return processConsumableLogSave();
            }`.replace(/\n/g, eol);

if (!content.includes(target4)) {
    console.error('Target 4 not found!');
    process.exit(1);
}
content = content.replace(target4, addition4);

// ==========================================
// 5. GUARD IN DELETERECORD()
// ==========================================
const target5 = `        function deleteRecord(moduleKey, recordId) {
            if(confirm(\`Are you sure you want to delete \${recordId}?\`)) {`.replace(/\n/g, eol);

const addition5 = `        function deleteRecord(moduleKey, recordId) {
            if (moduleKey === 'consumableLogs') {
                showToast('Consumable movement logs are immutable audit records and cannot be deleted.', 'warning');
                return;
            }
            if(confirm(\`Are you sure you want to delete \${recordId}?\`)) {`.replace(/\n/g, eol);

if (!content.includes(target5)) {
    console.error('Target 5 not found!');
    process.exit(1);
}
content = content.replace(target5, addition5);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched frontend/app.js for Wave 11.3!');
