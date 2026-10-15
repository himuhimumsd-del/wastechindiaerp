const fs = require('fs');

function toCRLF(str) {
    return str.replace(/\r?\n/g, '\r\n');
}

function applyWave11_8(content) {
    let text = content;

    // 1. Window exports (around line 3945)
    const exportTarget = toCRLF(`        window.runPayrollGeneration = runPayrollGeneration;
        window.updatePayrollStatus = updatePayrollStatus;
        window.markPayrollPaid = markPayrollPaid;`);

    const exportReplacement = toCRLF(`        window.runPayrollGeneration = runPayrollGeneration;
        window.updatePayrollStatus = updatePayrollStatus;
        window.markPayrollPaid = markPayrollPaid;
        window.processMasterSave = processMasterSave;
        window.processMasterDelete = processMasterDelete;
        window.buildLiveUnitPayload = buildLiveUnitPayload;
        window.buildLivePoTypePayload = buildLivePoTypePayload;
        window.buildLiveItemPayload = buildLiveItemPayload;
        window.buildLiveShiftPayload = buildLiveShiftPayload;
        window.buildLivePartyPayload = buildLivePartyPayload;
        window.buildLiveVehiclePayload = buildLiveVehiclePayload;
        window.buildLiveMachineryPayload = buildLiveMachineryPayload;
        window.buildLiveConsumablePayload = buildLiveConsumablePayload;
        window.buildLiveEmployeePayload = buildLiveEmployeePayload;
        window.checkMasterDeletionDependencies = checkMasterDeletionDependencies;`);

    if (!text.includes(exportTarget)) {
        throw new Error('Could not find exportTarget');
    }
    text = text.replace(exportTarget, exportReplacement);

    // 2. Special HR Safety Check in processSmartAttendance (around line 8525)
    const smartAttPlantTarget = toCRLF(`            const empPlant = emp.companyId || emp.plant_id || state.currentCompany;`);
    const smartAttPlantReplacement = toCRLF(`            const empPlant = emp.companyId || emp.plant_id || null;`);
    if (!text.includes(smartAttPlantTarget)) {
        throw new Error('Could not find smartAttPlantTarget');
    }
    text = text.replace(smartAttPlantTarget, smartAttPlantReplacement);

    // 3. Special HR Safety Check in buildLiveAttendancePayload (around line 11103)
    const attPlantTarget = toCRLF(`            const empPlant = emp.companyId || emp.plant_id || authPlant.id;
            if (empPlant !== authPlant.id) {
                throw new Error(\`Employee "\${emp.name || empId}" belongs to plant "\${empPlant}", not active plant "\${authPlant.id}". Cross-plant attendance is prohibited.\`);
            }`);
    const attPlantReplacement = toCRLF(`            const empPlant = emp.companyId || emp.plant_id || null;
            if (!empPlant || empPlant !== authPlant.id) {
                throw new Error(\`Employee "\${emp.name || empId}" belongs to plant "\${empPlant || 'Unassigned'}", not active plant "\${authPlant.id}". Cross-plant attendance is prohibited.\`);
            }`);
    if (!text.includes(attPlantTarget)) {
        throw new Error('Could not find attPlantTarget');
    }
    text = text.replace(attPlantTarget, attPlantReplacement);

    // 4. Special HR Safety Check in buildLivePayrollLedgerPayload (around line 11402)
    const prPlantTarget = toCRLF(`            const empPlant = emp.companyId || emp.plant_id || authPlant.id;
            if (empPlant !== authPlant.id) {
                throw new Error(\`Employee "\${emp.name || empId}" belongs to plant "\${empPlant}", not active plant "\${authPlant.id}". Cross-plant payroll is prohibited.\`);
            }`);
    const prPlantReplacement = toCRLF(`            const empPlant = emp.companyId || emp.plant_id || null;
            if (!empPlant || empPlant !== authPlant.id) {
                throw new Error(\`Employee "\${emp.name || empId}" belongs to plant "\${empPlant || 'Unassigned'}", not active plant "\${authPlant.id}". Cross-plant payroll is prohibited.\`);
            }`);
    if (!text.includes(prPlantTarget)) {
        throw new Error('Could not find prPlantTarget');
    }
    text = text.replace(prPlantTarget, prPlantReplacement);

    // 5. Add Master CRUD implementation right after processPayrollLedgerSave (around line 11620)
    const masterSectionTarget = toCRLF(`                showToast(\`Payroll for \${normalizedRow.empId || normalizedRow.emp_id} updated successfully!\`, 'success');
            } catch (updateErr) {
                console.error('[PayrollLedger] Update exception:', updateErr);
                showToast(\`Error updating payroll ledger: \${updateErr.message || 'Unexpected error'}\`, 'error');
                return;
            }
        }`);

    const masterSectionReplacement = toCRLF(`                showToast(\`Payroll for \${normalizedRow.empId || normalizedRow.emp_id} updated successfully!\`, 'success');
            } catch (updateErr) {
                console.error('[PayrollLedger] Update exception:', updateErr);
                showToast(\`Error updating payroll ledger: \${updateErr.message || 'Unexpected error'}\`, 'error');
                return;
            }
        }

        // =========================================================================
        // WAVE 11.8: SUPPORTING MASTERS LIVE CRUD PERSISTENCE
        // Items, Vehicles, Machinery, Consumables, Shifts, Employees, Parties, Units, PO Types
        // =========================================================================

        const MASTER_PERSISTENCE_MAP = {
            unitMaster: {
                table: 'units',
                liveKey: 'units',
                idPrefix: 'UNT',
                title: 'Unit',
                isPlantScoped: false,
                isGlobal: true,
                normalizer: (row) => ({ id: row.id, name: row.name, is_active: row.is_active, _isLive: true })
            },
            poTypeMaster: {
                table: 'po_types',
                liveKey: 'poTypes',
                idPrefix: 'POT',
                title: 'PO Type',
                isPlantScoped: false,
                isGlobal: true,
                normalizer: (row) => ({ id: row.id, name: row.name, is_active: row.is_active, _isLive: true })
            },
            itemMaster: {
                table: 'items',
                liveKey: 'items',
                idPrefix: 'ITM',
                title: 'Item',
                isPlantScoped: false,
                isGlobal: true,
                normalizer: normalizeLiveItem
            },
            shiftsMaster: {
                table: 'shifts',
                liveKey: 'shifts',
                idPrefix: 'SH',
                title: 'Shift',
                isPlantScoped: true,
                isGlobal: false,
                normalizer: normalizeLiveShift
            },
            partiesMaster: {
                table: 'parties',
                liveKey: 'parties',
                idPrefix: 'PAR',
                title: 'Party',
                isPlantScoped: false,
                isGlobal: true,
                normalizer: normalizeLiveParty
            },
            vehicleMaster: {
                table: 'vehicles',
                liveKey: 'vehicles',
                idPrefix: 'VEH',
                title: 'Vehicle',
                isPlantScoped: true,
                isGlobal: false,
                normalizer: normalizeLiveVehicle
            },
            machineryMaster: {
                table: 'machinery',
                liveKey: 'plantMachinery',
                idPrefix: 'MAC',
                title: 'Machinery',
                isPlantScoped: true,
                isGlobal: false,
                normalizer: normalizeLivePlantMachinery
            },
            consumablesMaster: {
                table: 'consumables',
                liveKey: 'consumables',
                idPrefix: 'CON',
                title: 'Consumable',
                isPlantScoped: true,
                isGlobal: false,
                normalizer: (row) => normalizeLiveConsumable(row, getLiveUnits())
            },
            employees: {
                table: 'employees',
                liveKey: 'employees',
                idPrefix: 'EMP',
                title: 'Employee',
                isPlantScoped: true,
                isGlobal: false,
                normalizer: normalizeLiveEmployee
            }
        };

        function buildLiveUnitPayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Unit record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Unit Name is required.');
            const id = (record.id || '').trim() || generateId('UNT');
            const payload = {
                name: name,
                description: record.description ? String(record.description).trim() : null,
                is_active: record.is_active !== false && record.status !== 'Inactive'
            };
            return { id, payload };
        }

        function buildLivePoTypePayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('PO Type record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('PO Type Name is required.');
            const id = (record.id || '').trim() || generateId('POT');
            const payload = {
                name: name,
                description: record.description ? String(record.description).trim() : null,
                is_active: record.is_active !== false && record.status !== 'Inactive'
            };
            return { id, payload };
        }

        function buildLiveItemPayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Item record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Item Name is required.');
            const hsnCode = (record.hsnCode || record.hsn_code || '').trim();
            if (!hsnCode) throw new Error('HSN Code is required for Item.');
            const id = (record.id || '').trim() || generateId('ITM');

            let defaultUnitId = record.defaultUnitId || record.default_unit_id || record.unit || null;
            if (defaultUnitId) {
                const uList = getLiveUnits();
                const matchedUnit = uList.find(u => u.id === defaultUnitId || u.name === defaultUnitId);
                if (matchedUnit) defaultUnitId = matchedUnit.id;
            }

            const toPct = (val) => {
                const n = parseFloat(val);
                return isNaN(n) ? 0 : Math.max(0, Math.min(100, Math.round(n * 100) / 100));
            };

            const payload = {
                name: name,
                hsn_code: hsnCode,
                description: record.description ? String(record.description).trim() : null,
                default_unit_id: defaultUnitId || null,
                cgst_rate: toPct(record.cgst != null ? record.cgst : record.cgst_rate),
                sgst_rate: toPct(record.sgst != null ? record.sgst : record.sgst_rate),
                igst_rate: toPct(record.igst != null ? record.igst : record.igst_rate),
                ugst_rate: toPct(record.ugst != null ? record.ugst : record.ugst_rate),
                is_active: record.is_active !== false && record.status !== 'Inactive'
            };
            return { id, payload };
        }

        function buildLiveShiftPayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Shift record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Shift Name is required.');
            const startTime = (record.startTime || record.start_time || '').trim();
            const endTime = (record.endTime || record.end_time || '').trim();
            if (!startTime || !endTime) throw new Error('Start Time and End Time are required for Shift.');
            const id = (record.id || '').trim() || generateId('SH');

            const currentPlant = state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') authPlant = assertAuthorizedPlant(currentPlant);
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') authPlant = getCurrentAuthorizedPlant();
            if (!authPlant && Array.isArray(state.authorizedPlants)) authPlant = state.authorizedPlants.find(p => p.id === currentPlant) || state.authorizedPlants[0] || null;

            const plantId = authPlant ? authPlant.id : (record.plant_id || null);

            const payload = {
                plant_id: plantId,
                name: name,
                start_time: startTime.length === 5 ? \`\${startTime}:00\` : startTime,
                end_time: endTime.length === 5 ? \`\${endTime}:00\` : endTime,
                grace_period_mins: parseInt(record.gracePeriod || record.grace_period_mins, 10) || 15,
                min_hours_full_day: parseFloat(record.minHoursFullDay || record.min_hours_full_day) || 8.00,
                min_hours_half_day: parseFloat(record.minHoursHalfDay || record.min_hours_half_day) || 4.00,
                is_active: record.is_active !== false && record.status !== 'Inactive'
            };
            return { id, payload };
        }

        function buildLivePartyPayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Party record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Party Name is required.');
            const stateName = (record.state || '').trim();
            if (!stateName) throw new Error('State is required for Party.');

            let rawTypes = record.type || record.party_types || ['Client'];
            if (typeof rawTypes === 'string') rawTypes = rawTypes.split(',').map(s => s.trim()).filter(Boolean);
            if (!Array.isArray(rawTypes) || rawTypes.length === 0) rawTypes = ['Client'];

            const id = (record.id || '').trim() || generateId('PAR');

            const payload = {
                name: name,
                party_types: rawTypes,
                vendor_code: (record.vendorCode || record.vendor_code || '').trim() || null,
                not_gst_payer: Boolean(record.notGstPayer || record.not_gst_payer),
                gstin: (record.gstin || '').trim() || null,
                pan: (record.pan || '').trim() || null,
                cin: (record.cin || '').trim() || null,
                primary_address: (record.address || record.primary_address || '').trim() || null,
                street1: (record.street1 || '').trim() || null,
                street2: (record.street2 || '').trim() || null,
                city: (record.city || '').trim() || null,
                district: (record.district || '').trim() || null,
                state: stateName,
                pincode: (record.pinCode || record.pincode || '').trim() || null,
                primary_contact_name: (record.contactName || record.primary_contact_name || '').trim() || null,
                primary_contact_phone: (record.contactNumber || record.primary_contact_phone || '').trim() || null,
                primary_email: (record.email || record.primary_email || '').trim() || null,
                is_active: record.is_active !== false && record.status !== 'Inactive'
            };
            return { id, payload };
        }

        function buildLiveVehiclePayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Vehicle record must be an object.');
            const vehicleNo = (record.vehicleNo || record.vehicle_no || '').trim().toUpperCase();
            if (!vehicleNo) throw new Error('Vehicle Number is required.');
            const id = (record.id || '').trim() || generateId('VEH');

            const currentPlant = state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') authPlant = assertAuthorizedPlant(currentPlant);
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') authPlant = getCurrentAuthorizedPlant();
            if (!authPlant && Array.isArray(state.authorizedPlants)) authPlant = state.authorizedPlants.find(p => p.id === currentPlant) || state.authorizedPlants[0] || null;

            if (!authPlant || !authPlant.id) throw new Error('No authorized plant context available for vehicle.');

            const businessId = authPlant.business_id || (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) throw new Error(\`Active plant "\${authPlant.id}" has invalid business UUID (\${businessId}).\`);

            let partyName = (record.party || record.party_name || '').trim();
            let partyId = record.party_id || null;
            if (partyName) {
                const parties = getLiveParties();
                const matched = parties.find(p => p.name === partyName || p.id === partyName);
                if (matched) {
                    partyName = matched.name;
                    partyId = matched.id;
                }
            }

            const payload = {
                business_id: businessId,
                plant_id: authPlant.id,
                companyId: authPlant.id,
                vehicle_no: vehicleNo,
                party_name: partyName || null,
                party_id: partyId || null,
                vehicle_type: record.vehicle_type || record.vehicleType || null,
                capacity_mt: record.capacity_mt != null ? parseFloat(record.capacity_mt) : (record.capacity ? parseFloat(record.capacity) : null),
                is_active: record.is_active !== false && record.status !== 'Inactive'
            };
            return { id, payload };
        }

        function buildLiveMachineryPayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Machinery record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Machine Name is required.');
            const type = (record.type || '').trim();
            if (!type) throw new Error('Machine Category is required.');
            const fuelType = (record.fuelType || record.fuel_type || '').trim();
            if (!fuelType) throw new Error('Fuel Type is required.');
            const id = (record.id || '').trim() || generateId('MAC');

            const currentPlant = state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') authPlant = assertAuthorizedPlant(currentPlant);
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') authPlant = getCurrentAuthorizedPlant();
            if (!authPlant && Array.isArray(state.authorizedPlants)) authPlant = state.authorizedPlants.find(p => p.id === currentPlant) || state.authorizedPlants[0] || null;

            if (!authPlant || !authPlant.id) throw new Error('No authorized plant context available for machinery.');

            const businessId = authPlant.business_id || (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) throw new Error(\`Active plant "\${authPlant.id}" has invalid business UUID (\${businessId}).\`);

            let rawStatus = record.status || 'Active';
            if (!['Active', 'Under Maintenance', 'Inactive'].includes(rawStatus)) rawStatus = 'Active';

            const payload = {
                business_id: businessId,
                plant_id: authPlant.id,
                companyId: authPlant.id,
                name: name,
                type: type,
                fuel_type: fuelType,
                capacity: (record.capacity || '').trim() || null,
                status: rawStatus
            };
            return { id, payload };
        }

        function buildLiveConsumablePayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Consumable record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Item Name is required.');
            const category = (record.category || '').trim();
            if (!category) throw new Error('Category is required for Consumable.');
            const id = (record.id || '').trim() || generateId('CON');

            const currentPlant = state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') authPlant = assertAuthorizedPlant(currentPlant);
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') authPlant = getCurrentAuthorizedPlant();
            if (!authPlant && Array.isArray(state.authorizedPlants)) authPlant = state.authorizedPlants.find(p => p.id === currentPlant) || state.authorizedPlants[0] || null;

            if (!authPlant || !authPlant.id) throw new Error('No authorized plant context available for consumable.');

            const businessId = authPlant.business_id || (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) throw new Error(\`Active plant "\${authPlant.id}" has invalid business UUID (\${businessId}).\`);

            let unitId = record.unit_id || record.unit || null;
            if (unitId) {
                const uList = getLiveUnits();
                const matchedUnit = uList.find(u => u.id === unitId || u.name === unitId);
                if (matchedUnit) unitId = matchedUnit.id;
            }

            let rawStatus = record.status || 'Active';
            if (!['Active', 'Discontinued'].includes(rawStatus)) rawStatus = 'Active';

            const payload = {
                business_id: businessId,
                plant_id: authPlant.id,
                companyId: authPlant.id,
                name: name,
                category: category,
                unit_id: unitId || null,
                reorder_level: parseFloat(record.reorderLevel || record.reorder_level) || 0,
                last_price: parseFloat(record.lastPrice || record.last_price) || 0,
                current_stock: parseFloat(record.currentStock || record.current_stock) || 0,
                status: rawStatus
            };
            return { id, payload };
        }

        function buildLiveEmployeePayload(record, isEditing = false) {
            if (!record || typeof record !== 'object') throw new Error('Employee record must be an object.');
            const name = (record.name || '').trim();
            if (!name) throw new Error('Full Name is required for Employee.');
            const id = (record.id || '').trim() || generateId('EMP');

            const currentPlant = state.currentCompany;
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') authPlant = assertAuthorizedPlant(currentPlant);
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') authPlant = getCurrentAuthorizedPlant();
            if (!authPlant && Array.isArray(state.authorizedPlants)) authPlant = state.authorizedPlants.find(p => p.id === currentPlant) || state.authorizedPlants[0] || null;

            if (!authPlant || !authPlant.id) throw new Error('No authorized plant context available for employee.');

            const businessId = authPlant.business_id || (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) throw new Error(\`Active plant "\${authPlant.id}" has invalid business UUID (\${businessId}).\`);

            let shiftId = record.shiftId || record.shift_id || null;
            let shiftName = record.shift_name || null;
            if (shiftId) {
                const shifts = getLiveShifts();
                const matched = shifts.find(s => s.id === shiftId || s.name === shiftId);
                if (matched) {
                    shiftId = matched.id;
                    shiftName = matched.name;
                    if (matched.plant_id && matched.plant_id !== authPlant.id) {
                        throw new Error(\`Shift "\${matched.name || shiftId}" belongs to plant "\${matched.plant_id}", not active plant "\${authPlant.id}".\`);
                    }
                }
            }

            let rawStatus = record.status || 'Active';
            if (!['Active', 'Terminated', 'On Leave'].includes(rawStatus)) rawStatus = 'Active';

            const payload = {
                business_id: businessId,
                plant_id: authPlant.id,
                companyId: authPlant.id,
                name: name,
                department: (record.department || '').trim() || null,
                shift_id: shiftId || null,
                shift_name: shiftName || null,
                doj: record.doj || null,
                basic_pay: parseFloat(record.basicPay || record.basic_pay) || 0,
                hra: parseFloat(record.hra || record.hra) || 0,
                allowances: parseFloat(record.allowances || record.allowances) || 0,
                pf_applicable: record.pfApplicable === 'No' ? 'No' : 'Yes',
                esi_applicable: record.esiApplicable === 'Yes' ? 'Yes' : 'No',
                advance_balance: parseFloat(record.advance || record.advance_balance) || 0,
                ot_rate_per_hr: parseFloat(record.otRate || record.ot_rate_per_hr) || 0,
                allocated_paid_leaves: parseInt(record.leaves || record.allocated_paid_leaves, 10) || 12,
                bank_name: (record.bankName || record.bank_name || '').trim() || null,
                account_no: (record.accountNo || record.account_no || '').trim() || null,
                ifsc_code: (record.ifsc || record.ifsc_code || '').trim() || null,
                pan_no: (record.pan || record.pan_no || '').trim() || null,
                aadhar_no: (record.aadhar_no || '').trim() || null,
                uan_no: (record.uan || record.uan_no || '').trim() || null,
                esic_no: (record.esic_no || '').trim() || null,
                status: rawStatus
            };
            return { id, payload };
        }

        function checkMasterDeletionDependencies(moduleKey, recordId) {
            if (!recordId) return null;

            if (moduleKey === 'unitMaster') {
                const itemMatch = (getLiveItems() || []).find(i => i.defaultUnitId === recordId || i.default_unit_id === recordId);
                if (itemMatch) return \`Item "\${itemMatch.name}"\`;
                const conMatch = (getLiveConsumables() || []).find(c => c.unitId === recordId || c.unit_id === recordId);
                if (conMatch) return \`Consumable "\${conMatch.name}"\`;
                const poRMatch = (state.data.poReceived || []).find(p => p.unit === recordId);
                if (poRMatch) return \`PO Received "\${poRMatch.id}"\`;
                const poIMatch = (state.data.poIssued || []).find(p => p.unit === recordId);
                if (poIMatch) return \`PO Issued "\${poIMatch.id}"\`;
            }

            if (moduleKey === 'poTypeMaster') {
                const poRMatch = (state.data.poReceived || []).find(p => p.poType === recordId || p.po_type_id === recordId);
                if (poRMatch) return \`PO Received "\${poRMatch.id}"\`;
                const poIMatch = (state.data.poIssued || []).find(p => p.poType === recordId || p.po_type_id === recordId);
                if (poIMatch) return \`PO Issued "\${poIMatch.id}"\`;
            }

            if (moduleKey === 'itemMaster') {
                const poRMatch = (state.data.poReceived || []).find(p => p.itemName === recordId || p.item_id === recordId);
                if (poRMatch) return \`PO Received "\${poRMatch.id}"\`;
                const poIMatch = (state.data.poIssued || []).find(p => p.itemName === recordId || p.item_id === recordId);
                if (poIMatch) return \`PO Issued "\${poIMatch.id}"\`;
                const invMatch = (getLiveInvoices() || []).find(inv => inv.itemId === recordId || inv.item_id === recordId);
                if (invMatch) return \`Sales Invoice "\${invMatch.id}"\`;
            }

            if (moduleKey === 'shiftsMaster') {
                const empMatch = (getLiveEmployees() || []).find(e => e.shiftId === recordId || e.shift_id === recordId);
                if (empMatch) return \`Employee "\${empMatch.name}"\`;
                const attMatch = (getLiveAttendance() || []).find(a => a.shift_id === recordId || a.shiftId === recordId);
                if (attMatch) return 'Attendance records';
            }

            if (moduleKey === 'partiesMaster') {
                const poRMatch = (state.data.poReceived || []).find(p => p.party === recordId || p.party_id === recordId);
                if (poRMatch) return \`PO Received "\${poRMatch.id}"\`;
                const poIMatch = (state.data.poIssued || []).find(p => p.party === recordId || p.party_id === recordId);
                if (poIMatch) return \`PO Issued "\${poIMatch.id}"\`;
                const sInvMatch = (getLiveInvoices() || []).find(inv => inv.client === recordId || inv.party_id === recordId);
                if (sInvMatch) return \`Sales Invoice "\${sInvMatch.id}"\`;
                const vInvMatch = (getLiveReceivedInvoices() || []).find(inv => inv.vendor === recordId || inv.party_id === recordId);
                if (vInvMatch) return \`Vendor Invoice "\${vInvMatch.id}"\`;
                const tripMatch = (getLiveTrips() || []).find(t => t.client === recordId || t.client_id === recordId);
                if (tripMatch) return \`Trip "\${tripMatch.id}"\`;
                const vehMatch = (getLiveVehicles() || []).find(v => v.party_id === recordId || v.party === recordId);
                if (vehMatch) return \`Vehicle "\${vehMatch.vehicleNo}"\`;
            }

            if (moduleKey === 'vehicleMaster') {
                const veh = (getLiveVehicles() || []).find(v => v.id === recordId);
                const vehNo = veh ? veh.vehicleNo : recordId;
                const tripMatch = (getLiveTrips() || []).find(t => t.vehicle === vehNo || t.vehicle === recordId || t.vehicle_id === recordId);
                if (tripMatch) return \`Trip "\${tripMatch.id}"\`;
                const gateMatch = (getLiveGateEntries() || []).find(g => g.vehicle_no === vehNo || g.vehicle_no === recordId);
                if (gateMatch) return \`Gate Entry "\${gateMatch.id}"\`;
            }

            if (moduleKey === 'machineryMaster') {
                const machMatch = (getLiveMachineLogs() || []).find(m => m.machine === recordId || m.machine_id === recordId);
                if (machMatch) return \`Machine Log "\${machMatch.id}"\`;
                const conMovMatch = (getLiveConsumableLogs() || []).find(c => c.machine === recordId || c.machine_id === recordId);
                if (conMovMatch) return \`Consumable Movement "\${conMovMatch.id}"\`;
            }

            if (moduleKey === 'consumablesMaster') {
                const conMovMatch = (getLiveConsumableLogs() || []).find(c => c.consumable === recordId || c.consumable_id === recordId);
                if (conMovMatch) return \`Consumable Movement "\${conMovMatch.id}"\`;
            }

            if (moduleKey === 'employees') {
                const attMatch = (getLiveAttendance() || []).find(a => a.empId === recordId || a.emp_id === recordId);
                if (attMatch) return 'Attendance records';
                const prMatch = (getLivePayrollLedger() || []).find(p => p.empId === recordId || p.emp_id === recordId);
                if (prMatch) return 'Payroll Ledger records';
                const machMatch = (getLiveMachineLogs() || []).find(m => m.operator === recordId || m.operator_id === recordId);
                if (machMatch) return \`Machine Log "\${machMatch.id}"\`;
                const conMovMatch = (getLiveConsumableLogs() || []).find(c => c.issuedTo === recordId || c.issued_to === recordId);
                if (conMovMatch) return \`Consumable Movement "\${conMovMatch.id}"\`;
            }

            return null;
        }

        async function processMasterSave(moduleKey) {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save master records.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm(moduleKey, 'add')) {
                showToast('Unauthorized: You do not have permission to add records.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm(moduleKey, 'edit')) {
                showToast('Unauthorized: You do not have permission to edit records.', 'error');
                return;
            }

            const meta = MASTER_PERSISTENCE_MAP[moduleKey];
            if (!meta) {
                showToast(\`Unsupported master module: \${moduleKey}\`, 'error');
                return;
            }

            const config = modulesConfig[moduleKey];
            let idEl = document.getElementById('field_id');
            let manualId = (idEl && !idEl.readOnly && idEl.value.trim() && idEl.value.trim() !== 'Auto-generated') ? idEl.value.trim() : null;
            const targetId = state.editingId || manualId;

            const rawRecord = { id: targetId };
            if (config && Array.isArray(config.schema)) {
                config.schema.forEach(field => {
                    if (field.key === 'permissions' || field.hideInForm) return;
                    if (field.type === 'checkboxGroup') {
                        const hidden = document.getElementById(\`field_\${field.key}\`);
                        rawRecord[field.key] = hidden && hidden.value ? hidden.value.split(',') : [];
                    } else if (field.type === 'multiEntry') {
                        rawRecord[field.key] = Array.from(document.querySelectorAll(\`.field_\${field.key}_entry\`)).map(el => el.value.trim()).filter(Boolean);
                    } else {
                        const el = document.getElementById(\`field_\${field.key}\`);
                        if (el) rawRecord[field.key] = el.type === 'checkbox' ? el.checked : el.value;
                    }
                });
            }

            let buildResult;
            try {
                if (moduleKey === 'unitMaster') buildResult = buildLiveUnitPayload(rawRecord, isEditing);
                else if (moduleKey === 'poTypeMaster') buildResult = buildLivePoTypePayload(rawRecord, isEditing);
                else if (moduleKey === 'itemMaster') buildResult = buildLiveItemPayload(rawRecord, isEditing);
                else if (moduleKey === 'shiftsMaster') buildResult = buildLiveShiftPayload(rawRecord, isEditing);
                else if (moduleKey === 'partiesMaster') buildResult = buildLivePartyPayload(rawRecord, isEditing);
                else if (moduleKey === 'vehicleMaster') buildResult = buildLiveVehiclePayload(rawRecord, isEditing);
                else if (moduleKey === 'machineryMaster') buildResult = buildLiveMachineryPayload(rawRecord, isEditing);
                else if (moduleKey === 'consumablesMaster') buildResult = buildLiveConsumablePayload(rawRecord, isEditing);
                else if (moduleKey === 'employees') buildResult = buildLiveEmployeePayload(rawRecord, isEditing);
                else throw new Error(\`Unknown builder for \${moduleKey}\`);
            } catch (err) {
                showToast(err.message || 'Validation error', 'error');
                return;
            }

            const { id: recordId, payload } = buildResult;

            try {
                let data, error;
                if (isEditing) {
                    const updateRes = await client
                        .from(meta.table)
                        .update(payload)
                        .eq('id', recordId)
                        .select()
                        .single();
                    data = updateRes.data;
                    error = updateRes.error;
                } else {
                    const insertPayload = Object.assign({}, payload, { id: recordId });
                    const insertRes = await client
                        .from(meta.table)
                        .insert(insertPayload)
                        .select()
                        .single();
                    data = insertRes.data;
                    error = insertRes.error;
                }

                if (error) {
                    console.error(\`[MasterSave] \${meta.table} save failed:\`, error);
                    showToast(\`Failed to save \${meta.title}: \${error.message || error.details || 'Database error'}\`, 'error');
                    return;
                }

                const normalizedRow = meta.normalizer(data);
                if (!normalizedRow) {
                    showToast(\`Failed to normalize saved \${meta.title} row.\`, 'error');
                    return;
                }

                if (state.liveMasters && Array.isArray(state.liveMasters[meta.liveKey])) {
                    const lIdx = state.liveMasters[meta.liveKey].findIndex(r => r.id === normalizedRow.id);
                    if (lIdx > -1) state.liveMasters[meta.liveKey][lIdx] = normalizedRow;
                    else state.liveMasters[meta.liveKey].unshift(normalizedRow);
                }

                if (!Array.isArray(state.data[moduleKey])) state.data[moduleKey] = [];
                const dIdx = state.data[moduleKey].findIndex(r => r.id === normalizedRow.id);
                if (dIdx > -1) state.data[moduleKey][dIdx] = normalizedRow;
                else state.data[moduleKey].unshift(normalizedRow);

                if (typeof logAudit === 'function') {
                    logAudit(moduleKey, isEditing ? 'Update' : 'Create', normalizedRow);
                }

                closeModal();
                state.editingId = null;
                if (state.currentModule === moduleKey) {
                    renderTableModule(moduleKey, document.getElementById('content-area'));
                }
                showToast(\`\${meta.title} "\${normalizedRow.name || normalizedRow.id}" saved successfully!\`, 'success');
            } catch (saveErr) {
                console.error(\`[MasterSave] \${meta.table} exception:\`, saveErr);
                showToast(\`Error saving \${meta.title}: \${saveErr.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processMasterDelete(moduleKey, recordId) {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to delete records.', 'error');
                return;
            }

            if (typeof hasPerm === 'function' && !hasPerm(moduleKey, 'delete')) {
                showToast('Unauthorized: You do not have permission to delete this record.', 'error');
                return;
            }

            const meta = MASTER_PERSISTENCE_MAP[moduleKey];
            if (!meta) {
                showToast(\`Unsupported master module for deletion: \${moduleKey}\`, 'error');
                return;
            }

            const dep = checkMasterDeletionDependencies(moduleKey, recordId);
            if (dep) {
                showToast(\`Cannot delete \${meta.title}: Record "\${recordId}" is referenced by \${dep}. Deletion blocked to protect referential integrity.\`, 'warning');
                return;
            }

            if (!confirm(\`Are you sure you want to permanently delete \${meta.title} "\${recordId}"?\`)) {
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            try {
                const { error } = await client
                    .from(meta.table)
                    .delete()
                    .eq('id', recordId);

                if (error) {
                    console.error(\`[MasterDelete] \${meta.table} delete failed:\`, error);
                    showToast(\`Failed to delete \${meta.title}: \${error.message || error.details || 'Database error'}\`, 'error');
                    return;
                }

                if (state.liveMasters && Array.isArray(state.liveMasters[meta.liveKey])) {
                    state.liveMasters[meta.liveKey] = state.liveMasters[meta.liveKey].filter(r => r.id !== recordId);
                }

                if (Array.isArray(state.data[moduleKey])) {
                    state.data[moduleKey] = state.data[moduleKey].filter(r => r.id !== recordId);
                }

                if (typeof logAudit === 'function') {
                    logAudit(moduleKey, 'Delete', { id: recordId });
                }

                if (state.currentModule === moduleKey) {
                    renderTableModule(moduleKey, document.getElementById('content-area'));
                }
                showToast(\`\${meta.title} "\${recordId}" deleted successfully.\`, 'success');
            } catch (delErr) {
                console.error(\`[MasterDelete] \${meta.table} exception:\`, delErr);
                showToast(\`Error deleting \${meta.title}: \${delErr.message || 'Unexpected error'}\`, 'error');
            }
        }`);

    if (!text.includes(masterSectionTarget)) {
        throw new Error('Could not find masterSectionTarget');
    }
    text = text.replace(masterSectionTarget, masterSectionReplacement);

    // 6. Routing in saveRecord
    const saveRoutingTarget = toCRLF(`            if (moduleKey === 'attendance') {
                return processAttendanceSave();
            }
            if (moduleKey === 'payrollLedger') {
                return processPayrollLedgerSave();
            }`);

    const saveRoutingReplacement = toCRLF(`            if (moduleKey === 'attendance') {
                return processAttendanceSave();
            }
            if (moduleKey === 'payrollLedger') {
                return processPayrollLedgerSave();
            }
            const supportedMasters = [
                'unitMaster',
                'poTypeMaster',
                'itemMaster',
                'shiftsMaster',
                'partiesMaster',
                'vehicleMaster',
                'machineryMaster',
                'consumablesMaster',
                'employees'
            ];
            if (supportedMasters.includes(moduleKey)) {
                return processMasterSave(moduleKey);
            }`);

    if (!text.includes(saveRoutingTarget)) {
        throw new Error('Could not find saveRoutingTarget');
    }
    text = text.replace(saveRoutingTarget, saveRoutingReplacement);

    // 7. Routing in deleteRecord
    const deleteRoutingTarget = toCRLF(`            if (moduleKey === 'payrollLedger') {
                showToast('Payroll ledger entries are statutory records and cannot be deleted.', 'warning');
                return;
            }`);

    const deleteRoutingReplacement = toCRLF(`            if (moduleKey === 'payrollLedger') {
                showToast('Payroll ledger entries are statutory records and cannot be deleted.', 'warning');
                return;
            }
            const supportedMasters = [
                'unitMaster',
                'poTypeMaster',
                'itemMaster',
                'shiftsMaster',
                'partiesMaster',
                'vehicleMaster',
                'machineryMaster',
                'consumablesMaster',
                'employees'
            ];
            if (supportedMasters.includes(moduleKey)) {
                return processMasterDelete(moduleKey, recordId);
            }`);

    if (!text.includes(deleteRoutingTarget)) {
        throw new Error('Could not find deleteRoutingTarget');
    }
    text = text.replace(deleteRoutingTarget, deleteRoutingReplacement);

    return text;
}

const file = 'frontend/app.js';
const orig = fs.readFileSync(file, 'utf8');
const modified = applyWave11_8(orig);
fs.writeFileSync(file, modified, 'utf8');
console.log('Successfully patched Wave 11.8 into frontend/app.js!');
