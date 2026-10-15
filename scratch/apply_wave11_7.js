const fs = require('fs');

function toCRLF(str) {
    return str.replace(/\r?\n/g, '\r\n');
}

function applyChanges(content) {
    let text = content;

    // 1. Update window exports (around line 3943)
    const exportTarget = toCRLF(`        window.processSalesInvoiceSave = processSalesInvoiceSave;
        window.processVendorInvoiceSave = processVendorInvoiceSave;`);
    const exportReplacement = toCRLF(`        window.processSalesInvoiceSave = processSalesInvoiceSave;
        window.processVendorInvoiceSave = processVendorInvoiceSave;
        window.buildLiveAttendancePayload = buildLiveAttendancePayload;
        window.buildLivePayrollLedgerPayload = buildLivePayrollLedgerPayload;
        window.processAttendanceSave = processAttendanceSave;
        window.processPayrollLedgerSave = processPayrollLedgerSave;
        window.processSmartAttendance = processSmartAttendance;
        window.runPayrollGeneration = runPayrollGeneration;
        window.updatePayrollStatus = updatePayrollStatus;
        window.markPayrollPaid = markPayrollPaid;`);
    
    if (!text.includes(exportTarget)) {
        throw new Error('Could not find exportTarget');
    }
    text = text.replace(exportTarget, exportReplacement);

    // 2. Update updatePayrollStatus and markPayrollPaid (lines 6062-6080)
    const statusFuncsTarget = toCRLF(`        function updatePayrollStatus(payrollId, newStatus) {
            const pr = state.data.payrollLedger.find(p => p.id === payrollId);
            if (!pr) return;
            pr.status = newStatus;
            logAudit('payrollLedger', 'Update', pr);
            renderPayrollEmployeeDetail(pr.companyId, pr.empId, pr.monthKey);
            showToast(\`Payroll marked as \${newStatus}.\`, 'success');
        }

        function markPayrollPaid(payrollId) {
            const pr = state.data.payrollLedger.find(p => p.id === payrollId);
            if (!pr) return;
            pr.status = 'Paid';
            pr.paidOn = new Date().toLocaleDateString('en-IN');
            logAudit('payrollLedger', 'Update', pr);
            renderPayrollEmployeeDetail(pr.companyId, pr.empId, pr.monthKey);
            showToast('Payroll marked as Paid.', 'success');
        }`);

    const statusFuncsReplacement = toCRLF(`        async function updatePayrollStatus(payrollId, newStatus) {
            const prList = getLivePayrollLedger();
            const pr = prList.find(p => p.id === payrollId || p.db_id === payrollId || p.uuid === payrollId) || (state.data.payrollLedger || []).find(p => p.id === payrollId);
            if (!pr) {
                showToast('Payroll record not found.', 'error');
                return;
            }

            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const liveDbId = pr.db_id || pr.uuid || (isUUID(pr.id) ? pr.id : null);

            if (liveDbId) {
                if (!state.authAuthorized || !state.currentUser) {
                    showToast('Authentication required to update payroll status.', 'error');
                    return;
                }
                if (typeof hasPerm === 'function' && !hasPerm('payrollLedger', 'edit')) {
                    showToast('Unauthorized: You do not have permission to update payroll status.', 'error');
                    return;
                }

                const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                if (!client) {
                    showToast('Database connection unavailable.', 'error');
                    return;
                }

                // Map UI status 'Reviewed' to DB CHECK status 'Processed'
                const dbStatus = (newStatus === 'Reviewed' || newStatus === 'Processed') ? 'Processed' : newStatus;

                try {
                    const { data, error } = await client
                        .from('payroll_ledger')
                        .update({ status: dbStatus })
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[PayrollLedger] Status update failed:', error);
                        showToast(\`Failed to update payroll status: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLivePayrollLedger(data);
                    if (normalizedRow) {
                        if (state.liveMasters && Array.isArray(state.liveMasters.payrollLedger)) {
                            const idx = state.liveMasters.payrollLedger.findIndex(p => p.id === liveDbId || p.db_id === liveDbId);
                            if (idx > -1) state.liveMasters.payrollLedger[idx] = normalizedRow;
                            else state.liveMasters.payrollLedger.unshift(normalizedRow);
                        }
                        if (Array.isArray(state.data.payrollLedger)) {
                            const idx = state.data.payrollLedger.findIndex(p => p.id === payrollId || p.id === liveDbId);
                            if (idx > -1) state.data.payrollLedger[idx] = normalizedRow;
                            else state.data.payrollLedger.unshift(normalizedRow);
                        }
                    }
                } catch (updateErr) {
                    console.error('[PayrollLedger] Status update exception:', updateErr);
                    showToast(\`Error updating payroll status: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                pr.status = newStatus;
            }

            if (typeof logAudit === 'function') {
                logAudit('payrollLedger', 'Update', pr);
            }
            renderPayrollEmployeeDetail(pr.companyId || pr.plant_id, pr.empId || pr.emp_id, pr.monthKey);
            showToast(\`Payroll marked as \${newStatus}.\`, 'success');
        }

        async function markPayrollPaid(payrollId) {
            const prList = getLivePayrollLedger();
            const pr = prList.find(p => p.id === payrollId || p.db_id === payrollId || p.uuid === payrollId) || (state.data.payrollLedger || []).find(p => p.id === payrollId);
            if (!pr) {
                showToast('Payroll record not found.', 'error');
                return;
            }

            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const liveDbId = pr.db_id || pr.uuid || (isUUID(pr.id) ? pr.id : null);
            const todayIso = new Date().toISOString().split('T')[0];

            if (liveDbId) {
                if (!state.authAuthorized || !state.currentUser) {
                    showToast('Authentication required to mark payroll as paid.', 'error');
                    return;
                }
                if (typeof hasPerm === 'function' && !hasPerm('payrollLedger', 'edit')) {
                    showToast('Unauthorized: You do not have permission to mark payroll as paid.', 'error');
                    return;
                }

                const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                if (!client) {
                    showToast('Database connection unavailable.', 'error');
                    return;
                }

                try {
                    const { data, error } = await client
                        .from('payroll_ledger')
                        .update({ status: 'Paid', payment_date: todayIso })
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[PayrollLedger] Mark Paid failed:', error);
                        showToast(\`Failed to mark payroll as Paid: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLivePayrollLedger(data);
                    if (normalizedRow) {
                        if (state.liveMasters && Array.isArray(state.liveMasters.payrollLedger)) {
                            const idx = state.liveMasters.payrollLedger.findIndex(p => p.id === liveDbId || p.db_id === liveDbId);
                            if (idx > -1) state.liveMasters.payrollLedger[idx] = normalizedRow;
                            else state.liveMasters.payrollLedger.unshift(normalizedRow);
                        }
                        if (Array.isArray(state.data.payrollLedger)) {
                            const idx = state.data.payrollLedger.findIndex(p => p.id === payrollId || p.id === liveDbId);
                            if (idx > -1) state.data.payrollLedger[idx] = normalizedRow;
                            else state.data.payrollLedger.unshift(normalizedRow);
                        }
                    }
                } catch (updateErr) {
                    console.error('[PayrollLedger] Mark Paid exception:', updateErr);
                    showToast(\`Error marking payroll Paid: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                pr.status = 'Paid';
                pr.paidOn = new Date().toLocaleDateString('en-IN');
            }

            if (typeof logAudit === 'function') {
                logAudit('payrollLedger', 'Update', pr);
            }
            renderPayrollEmployeeDetail(pr.companyId || pr.plant_id, pr.empId || pr.emp_id, pr.monthKey);
            showToast('Payroll marked as Paid.', 'success');
        }`);

    if (!text.includes(statusFuncsTarget)) {
        throw new Error('Could not find statusFuncsTarget');
    }
    text = text.replace(statusFuncsTarget, statusFuncsReplacement);

    // 3. Update processSmartAttendance (lines 8369-8436)
    const smartAttTarget = toCRLF(`        function processSmartAttendance(mode) {
            const empId = document.getElementById('att-emp-select').value;
            if (!empId) return showToast('Please select an employee first!', 'error');
            const emp = getLiveEmployees().find(e => e.id === empId);
            if (!emp) return showToast('Employee not found.', 'error');
            const empPlant = emp.companyId || state.currentCompany;

            const plantSettings = state.data.companyMaster.find(c => c.id === empPlant) || {};
            const photoField = document.getElementById('field_attPhoto');
            const photo = photoField ? photoField.value : '';
            if (plantSettings.attendanceSelfieRequired !== false && !photo) return showToast('Please take a photo first.', 'error');
            const lat = document.getElementById('att-lat').value, lng = document.getElementById('att-lng').value;
            if (!lat || !lng) return showToast('Please check your location first.', 'error');
            const geofence = document.getElementById('att-geofence').value || 'Not Checked';
            if (plantSettings.geofenceEnabled && geofence === 'Outside Radius') {
                return showToast('You are outside the plant geofence — punch blocked. Contact HR if this is an error.', 'error');
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const nowTime = new Date().toTimeString().substring(0, 5);

            if (mode === 'in') {
                const shift = getLiveShifts().find(s => s.id === emp.shiftId || s.name === emp.shiftId);
                let status = 'Present';
                if (shift && shift.startTime) {
                    const grace = parseInt(shift.gracePeriod) || 0;
                    const [sh, sm] = shift.startTime.split(':').map(Number);
                    const shiftStartMins = sh * 60 + sm + grace;
                    const [nh, nm] = nowTime.split(':').map(Number);
                    if (nh * 60 + nm > shiftStartMins) status = 'Late';
                }
                const record = { id: generateId('ATT'), date: todayStr, empId: empId, punchTime: nowTime, punchPhoto: photo, punchLat: lat, punchLng: lng, punchGeofence: geofence, status: status, companyId: empPlant };
                state.data.attendance.unshift(record); logAudit('attendance', 'Create', record);
                closeModal(); if (state.currentModule === 'attendance' || state.currentModule === 'dashboard') switchModule(state.currentModule);
                showToast(\`\${emp.name} punched in successfully! (\${status})\`, 'success');
            } else {
                const record = state.data.attendance.find(a => a.empId === empId && a.date === todayStr && a.companyId === empPlant);
                if (!record) return showToast('No punch-in record found for today.', 'error');
                record.punchOutTime = nowTime;
                record.punchOutPhoto = photo;
                record.punchOutLat = lat;
                record.punchOutLng = lng;
                record.punchOutGeofence = geofence;
                // Total hours worked = Punch-Out − Punch-In
                const [inH, inM] = record.punchTime.split(':').map(Number);
                const [outH, outM] = nowTime.split(':').map(Number);
                let mins = (outH * 60 + outM) - (inH * 60 + inM);
                if (mins < 0) mins += 1440;
                record.totalHours = (mins / 60).toFixed(2);

                // Day classification is driven by ACTUAL hours worked vs the shift's configured thresholds —
                // salary is paid by DAYS (Present/Half-Day/Absent), hours only decide which day-type this was.
                const shift = getLiveShifts().find(s => s.id === emp.shiftId || s.name === emp.shiftId);
                const minFullDay = shift && shift.minHoursFullDay ? parseFloat(shift.minHoursFullDay) : 8;
                const minHalfDay = shift && shift.minHoursHalfDay ? parseFloat(shift.minHoursHalfDay) : 4;
                const workedHours = parseFloat(record.totalHours);
                if (workedHours < minHalfDay) {
                    record.status = 'Absent'; // punched in but left too early to even count as half-day
                } else if (workedHours < minFullDay) {
                    record.status = 'Half-Day';
                } else if (record.status !== 'Late') {
                    record.status = 'Present';
                }
                logAudit('attendance', 'Update', record);
                closeModal(); if (state.currentModule === 'attendance' || state.currentModule === 'dashboard') switchModule(state.currentModule);
                showToast(\`\${emp.name} punched out successfully! (\${record.totalHours} hrs, \${record.status})\`, 'success');
            }
        }`);

    const smartAttReplacement = toCRLF(`        async function processSmartAttendance(mode) {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required for attendance operations.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            if (typeof hasPerm === 'function' && !hasPerm('attendance', mode === 'in' ? 'add' : 'edit')) {
                showToast(\`Unauthorized: You do not have permission to \${mode === 'in' ? 'punch in' : 'punch out'}.\`, 'error');
                return;
            }

            const empId = document.getElementById('att-emp-select')?.value;
            if (!empId) return showToast('Please select an employee first!', 'error');
            const emp = getLiveEmployees().find(e => e.id === empId || e.emp_id === empId);
            if (!emp) return showToast('Employee not found.', 'error');
            const empPlant = emp.companyId || emp.plant_id || state.currentCompany;

            // Enforce active plant scoping
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

            if (!authPlant || !authPlant.id) {
                showToast('Cannot record attendance: no authorized plant found.', 'error');
                return;
            }

            if (empPlant !== authPlant.id) {
                showToast(\`Cannot record attendance: Employee "\${emp.name || empId}" belongs to plant "\${empPlant}", not active plant "\${authPlant.id}".\`, 'error');
                return;
            }

            const plantSettings = (state.data.companyMaster || []).find(c => c.id === empPlant) || {};
            const photoField = document.getElementById('field_attPhoto');
            const photo = photoField ? photoField.value : '';
            if (plantSettings.attendanceSelfieRequired !== false && !photo) return showToast('Please take a photo first.', 'error');
            const lat = document.getElementById('att-lat')?.value, lng = document.getElementById('att-lng')?.value;
            if (!lat || !lng) return showToast('Please check your location first.', 'error');
            const geofence = document.getElementById('att-geofence')?.value || 'Not Checked';
            if (plantSettings.geofenceEnabled && geofence === 'Outside Radius') {
                return showToast('You are outside the plant geofence — punch blocked. Contact HR if this is an error.', 'error');
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const nowTime = new Date().toTimeString().substring(0, 5);

            if (mode === 'in') {
                const shift = getLiveShifts().find(s => s.id === emp.shiftId || s.name === emp.shiftId);
                let status = 'Present';
                if (shift && shift.startTime) {
                    const grace = parseInt(shift.gracePeriod) || 0;
                    const [sh, sm] = shift.startTime.split(':').map(Number);
                    const shiftStartMins = sh * 60 + sm + grace;
                    const [nh, nm] = nowTime.split(':').map(Number);
                    if (nh * 60 + nm > shiftStartMins) status = 'Late';
                }

                const rawRecord = {
                    empId: empId,
                    emp_id: empId,
                    date: todayStr,
                    attendance_date: todayStr,
                    punchTime: nowTime,
                    punchPhoto: photo,
                    punchLat: lat,
                    punchLng: lng,
                    punchGeofence: geofence,
                    status: status,
                    companyId: empPlant,
                    plant_id: empPlant,
                    remarks: status === 'Late' ? 'Late punch-in' : ''
                };

                let payload;
                try {
                    payload = buildLiveAttendancePayload(rawRecord);
                } catch (payloadErr) {
                    showToast(payloadErr.message || 'Failed to construct attendance payload', 'error');
                    return;
                }

                // Check if attendance row already exists for today
                const existing = getLiveAttendance().find(a => (a.empId === empId || a.emp_id === empId) && (a.date === todayStr || a.attendance_date === todayStr) && (a.companyId === empPlant || a.plant_id === empPlant));
                const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const liveDbId = existing ? (existing.db_id || existing.uuid || (isUUID(existing.id) ? existing.id : null)) : null;

                try {
                    let data, error;
                    if (liveDbId) {
                        const updateRes = await client
                            .from('attendance')
                            .update(payload)
                            .eq('id', liveDbId)
                            .select()
                            .single();
                        data = updateRes.data;
                        error = updateRes.error;
                    } else {
                        const insertRes = await client
                            .from('attendance')
                            .insert(payload)
                            .select()
                            .single();
                        data = insertRes.data;
                        error = insertRes.error;
                    }

                    if (error) {
                        console.error('[Attendance] Punch-in failed:', error);
                        showToast(\`Punch-in failed: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveAttendance(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved attendance row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters.attendance)) {
                        const idx = state.liveMasters.attendance.findIndex(a => a.id === normalizedRow.id || (a.empId === empId && (a.date === todayStr || a.attendance_date === todayStr)));
                        if (idx > -1) state.liveMasters.attendance[idx] = normalizedRow;
                        else state.liveMasters.attendance.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.attendance)) state.data.attendance = [];
                    const dIdx = state.data.attendance.findIndex(a => a.id === normalizedRow.id || (a.empId === empId && (a.date === todayStr || a.attendance_date === todayStr)));
                    if (dIdx > -1) state.data.attendance[dIdx] = normalizedRow;
                    else state.data.attendance.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('attendance', liveDbId ? 'Update' : 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'attendance' || state.currentModule === 'dashboard') switchModule(state.currentModule);
                    showToast(\`\${emp.name} punched in successfully! (\${status})\`, 'success');
                } catch (punchErr) {
                    console.error('[Attendance] Punch-in exception:', punchErr);
                    showToast(\`Error punching in: \${punchErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // PUNCH OUT
                const existing = getLiveAttendance().find(a => (a.empId === empId || a.emp_id === empId) && (a.date === todayStr || a.attendance_date === todayStr) && (a.companyId === empPlant || a.plant_id === empPlant));
                if (!existing) return showToast('No punch-in record found for today.', 'error');

                const [inH, inM] = (existing.punchTime || '09:00').split(':').map(Number);
                const [outH, outM] = nowTime.split(':').map(Number);
                let mins = (outH * 60 + outM) - (inH * 60 + inM);
                if (mins < 0) mins += 1440;
                const totalHours = (mins / 60).toFixed(2);

                const shift = getLiveShifts().find(s => s.id === emp.shiftId || s.name === emp.shiftId);
                const minFullDay = shift && shift.minHoursFullDay ? parseFloat(shift.minHoursFullDay) : 8;
                const minHalfDay = shift && shift.minHoursHalfDay ? parseFloat(shift.minHoursHalfDay) : 4;
                const workedHours = parseFloat(totalHours);
                let finalStatus = 'Present';
                if (workedHours < minHalfDay) {
                    finalStatus = 'Absent';
                } else if (workedHours < minFullDay) {
                    finalStatus = 'Half Day';
                } else if (existing.status !== 'Late') {
                    finalStatus = 'Present';
                }

                const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const liveDbId = existing.db_id || existing.uuid || (isUUID(existing.id) ? existing.id : null);
                if (!liveDbId) {
                    showToast('Cannot punch out: No live database record found for punch-in.', 'error');
                    return;
                }

                const checkOutIso = new Date(\`\${todayStr}T\${nowTime}:00\`).toISOString();
                const updatePayload = {
                    check_out: checkOutIso,
                    work_hours: parseFloat(totalHours) || 0,
                    status: finalStatus,
                    remarks: existing.remarks || null
                };

                try {
                    const { data, error } = await client
                        .from('attendance')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[Attendance] Punch-out failed:', error);
                        showToast(\`Punch-out failed: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveAttendance(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved punch-out row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters.attendance)) {
                        const idx = state.liveMasters.attendance.findIndex(a => a.id === liveDbId);
                        if (idx > -1) state.liveMasters.attendance[idx] = normalizedRow;
                        else state.liveMasters.attendance.unshift(normalizedRow);
                    }
                    if (Array.isArray(state.data.attendance)) {
                        const idx = state.data.attendance.findIndex(a => a.id === existing.id || a.id === liveDbId);
                        if (idx > -1) state.data.attendance[idx] = normalizedRow;
                        else state.data.attendance.unshift(normalizedRow);
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('attendance', 'Update', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'attendance' || state.currentModule === 'dashboard') switchModule(state.currentModule);
                    showToast(\`\${emp.name} punched out successfully! (\${normalizedRow.totalHours || totalHours} hrs, \${normalizedRow.status})\`, 'success');
                } catch (punchOutErr) {
                    console.error('[Attendance] Punch-out exception:', punchOutErr);
                    showToast(\`Error punching out: \${punchOutErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }`);

    if (!text.includes(smartAttTarget)) {
        throw new Error('Could not find smartAttTarget');
    }
    text = text.replace(smartAttTarget, smartAttReplacement);

    // 4. Insert buildLiveAttendancePayload, buildLivePayrollLedgerPayload, processAttendanceSave, processPayrollLedgerSave after processVendorInvoiceSave (after line 10759)
    const vendorInvoiceSaveEndTarget = toCRLF(`                    showToast(\`Vendor Invoice \${normalizedRow.vendorInvoiceNumber || normalizedRow.id} updated successfully!\`, 'success');
                } catch (updateErr) {
                    console.error('[VendorInvoice] Update exception:', updateErr);
                    showToast(\`Error updating Vendor Invoice: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }`);

    const hrPersistenceCode = toCRLF(`

        // =========================================================================
        // WAVE 11.7: HR TRANSACTIONS LIVE PERSISTENCE (ATTENDANCE + PAYROLL LEDGER)
        // =========================================================================

        function buildLiveAttendancePayload(record) {
            if (!record || typeof record !== 'object') {
                throw new Error('Attendance record must be an object');
            }

            const empId = (record.emp_id || record.empId || '').trim();
            if (!empId) {
                throw new Error('Employee ID is required for attendance.');
            }
            const emp = getLiveEmployees().find(e => e.id === empId || e.emp_id === empId);
            if (!emp) {
                throw new Error(\`Employee "\${empId}" not found in employee master.\`);
            }

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

            if (!authPlant || !authPlant.id) {
                throw new Error('No authorized plant context available for attendance persistence.');
            }

            const empPlant = emp.companyId || emp.plant_id || authPlant.id;
            if (empPlant !== authPlant.id) {
                throw new Error(\`Employee "\${emp.name || empId}" belongs to plant "\${empPlant}", not active plant "\${authPlant.id}". Cross-plant attendance is prohibited.\`);
            }

            const businessId = authPlant.business_id || (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) {
                throw new Error(\`Active plant "\${authPlant.id}" has invalid business UUID (\${businessId}).\`);
            }

            const dateStr = (record.attendance_date || record.date || '').split('T')[0];
            if (!dateStr || !/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) {
                throw new Error('Valid attendance date (YYYY-MM-DD) is required.');
            }

            let shiftId = record.shift_id || record.shiftId || emp.shiftId || null;
            let shiftName = record.shift_name || record.shiftName || null;
            if (shiftId) {
                const shift = getLiveShifts().find(s => s.id === shiftId || s.name === shiftId);
                if (shift) {
                    shiftId = shift.id;
                    shiftName = shift.name || shiftName;
                    if (shift.plant_id && shift.plant_id !== authPlant.id) {
                        throw new Error(\`Shift "\${shift.name || shiftId}" belongs to plant "\${shift.plant_id}", not active plant "\${authPlant.id}".\`);
                    }
                }
            }

            let rawStatus = record.status || 'Present';
            let dbStatus = 'Present';
            let extraRemark = '';
            if (rawStatus === 'Half-Day' || rawStatus === 'Half Day') {
                dbStatus = 'Half Day';
            } else if (rawStatus === 'Late') {
                dbStatus = 'Present';
                extraRemark = 'Late punch-in';
            } else if (['Present', 'Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(rawStatus)) {
                dbStatus = rawStatus;
            } else {
                dbStatus = 'Present';
            }

            let checkIn = record.check_in || null;
            if (!checkIn && record.punchTime) {
                try {
                    const [h, m] = record.punchTime.split(':');
                    const d = new Date(\`\${dateStr}T\${h.padStart(2, '0')}:\${m.padStart(2, '0')}:00\`);
                    if (!isNaN(d.getTime())) checkIn = d.toISOString();
                } catch (_) {}
            }

            let checkOut = record.check_out || null;
            if (!checkOut && record.punchOutTime) {
                try {
                    const [h, m] = record.punchOutTime.split(':');
                    const d = new Date(\`\${dateStr}T\${h.padStart(2, '0')}:\${m.padStart(2, '0')}:00\`);
                    if (!isNaN(d.getTime())) checkOut = d.toISOString();
                } catch (_) {}
            }

            let workHours = 0;
            if (record.work_hours != null) workHours = parseFloat(record.work_hours) || 0;
            else if (record.totalHours != null) workHours = parseFloat(record.totalHours) || 0;
            workHours = Math.max(0, Math.min(24, Math.round(workHours * 100) / 100));

            let otHours = 0;
            if (record.ot_hours != null) otHours = parseFloat(record.ot_hours) || 0;
            else if (record.otHours != null) otHours = parseFloat(record.otHours) || 0;
            otHours = Math.max(0, Math.min(24, Math.round(otHours * 100) / 100));

            let remarks = (record.remarks || '').trim();
            if (extraRemark && !remarks.includes(extraRemark)) {
                remarks = remarks ? \`\${remarks}; \${extraRemark}\` : extraRemark;
            }

            const currentUser = state.currentUser?.email || state.currentUser?.name || 'system';

            return {
                emp_id: empId,
                business_id: businessId,
                plant_id: authPlant.id,
                companyId: authPlant.id,
                attendance_date: dateStr,
                status: dbStatus,
                shift_id: shiftId,
                shift_name: shiftName,
                check_in: checkIn,
                check_out: checkOut,
                work_hours: workHours,
                ot_hours: otHours,
                remarks: remarks || null,
                created_by: currentUser
            };
        }

        async function processAttendanceSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save attendance.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('attendance', 'add')) {
                showToast('Unauthorized: You do not have permission to add attendance records.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('attendance', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit attendance records.', 'error');
                return;
            }

            const empIdVal = (document.getElementById('field_empId')?.value || '').trim();
            const dateVal = document.getElementById('field_date')?.value || '';
            const punchTimeVal = document.getElementById('field_punchTime')?.value || '';
            const punchOutTimeVal = document.getElementById('field_punchOutTime')?.value || '';
            const totalHoursVal = document.getElementById('field_totalHours')?.value || '0';
            const statusVal = document.getElementById('field_status')?.value || 'Present';
            const remarksVal = (document.getElementById('field_remarks')?.value || '').trim();

            const rawRecord = {
                empId: empIdVal,
                emp_id: empIdVal,
                date: dateVal,
                attendance_date: dateVal,
                punchTime: punchTimeVal,
                punchOutTime: punchOutTimeVal,
                totalHours: totalHoursVal,
                status: statusVal,
                remarks: remarksVal
            };

            let payload;
            try {
                payload = buildLiveAttendancePayload(rawRecord);
            } catch (payloadErr) {
                showToast(payloadErr.message || 'Failed to construct attendance payload', 'error');
                return;
            }

            if (!isEditing) {
                // Check if row already exists in live master for (emp_id, attendance_date)
                const existing = getLiveAttendance().find(a => (a.empId === payload.emp_id || a.emp_id === payload.emp_id) && (a.date === payload.attendance_date || a.attendance_date === payload.attendance_date) && (a.companyId === payload.plant_id || a.plant_id === payload.plant_id));
                const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const liveDbId = existing ? (existing.db_id || existing.uuid || (isUUID(existing.id) ? existing.id : null)) : null;

                try {
                    let data, error;
                    if (liveDbId) {
                        const updateRes = await client
                            .from('attendance')
                            .update(payload)
                            .eq('id', liveDbId)
                            .select()
                            .single();
                        data = updateRes.data;
                        error = updateRes.error;
                    } else {
                        const insertRes = await client
                            .from('attendance')
                            .insert(payload)
                            .select()
                            .single();
                        data = insertRes.data;
                        error = insertRes.error;
                    }

                    if (error) {
                        console.error('[Attendance] Save failed:', error);
                        showToast(\`Failed to save attendance: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveAttendance(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved attendance row.', 'error');
                        return;
                    }

                    if (state.liveMasters && Array.isArray(state.liveMasters.attendance)) {
                        const idx = state.liveMasters.attendance.findIndex(a => a.id === normalizedRow.id);
                        if (idx > -1) state.liveMasters.attendance[idx] = normalizedRow;
                        else state.liveMasters.attendance.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.attendance)) state.data.attendance = [];
                    const dIdx = state.data.attendance.findIndex(a => a.id === normalizedRow.id);
                    if (dIdx > -1) state.data.attendance[dIdx] = normalizedRow;
                    else state.data.attendance.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('attendance', liveDbId ? 'Update' : 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'attendance') {
                        renderTableModule('attendance', document.getElementById('content-area'));
                    }
                    showToast(\`Attendance for \${payload.emp_id} on \${payload.attendance_date} saved successfully!\`, 'success');
                } catch (insertErr) {
                    console.error('[Attendance] Save exception:', insertErr);
                    showToast(\`Error saving attendance: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                const existingList = getLiveAttendance();
                const existingRecord = existingList.find(r => r.id === state.editingId || r.db_id === state.editingId || r.uuid === state.editingId) || (state.data.attendance || []).find(r => r.id === state.editingId);
                const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const liveDbId = existingRecord?.db_id || existingRecord?.uuid || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update attendance: No valid live database UUID found.', 'error');
                    return;
                }

                try {
                    const { data, error } = await client
                        .from('attendance')
                        .update(payload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[Attendance] Update failed:', error);
                        showToast(\`Failed to update attendance: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveAttendance(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated attendance row.', 'error');
                        return;
                    }

                    if (state.liveMasters && Array.isArray(state.liveMasters.attendance)) {
                        const idx = state.liveMasters.attendance.findIndex(a => a.id === liveDbId || a.db_id === liveDbId);
                        if (idx > -1) state.liveMasters.attendance[idx] = normalizedRow;
                        else state.liveMasters.attendance.unshift(normalizedRow);
                    }
                    if (Array.isArray(state.data.attendance)) {
                        const idx = state.data.attendance.findIndex(r => r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) state.data.attendance[idx] = normalizedRow;
                        else state.data.attendance.unshift(normalizedRow);
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('attendance', 'Update', normalizedRow);
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === 'attendance') {
                        renderTableModule('attendance', document.getElementById('content-area'));
                    }
                    showToast(\`Attendance for \${payload.emp_id} updated successfully!\`, 'success');
                } catch (updateErr) {
                    console.error('[Attendance] Update exception:', updateErr);
                    showToast(\`Error updating attendance: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }

        function buildLivePayrollLedgerPayload(record) {
            if (!record || typeof record !== 'object') {
                throw new Error('Payroll ledger record must be an object');
            }

            const empId = (record.emp_id || record.empId || '').trim();
            if (!empId) {
                throw new Error('Employee ID is required for payroll ledger.');
            }
            const emp = getLiveEmployees().find(e => e.id === empId || e.emp_id === empId);
            if (!emp) {
                throw new Error(\`Employee "\${empId}" not found in employee master.\`);
            }

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

            if (!authPlant || !authPlant.id) {
                throw new Error('No authorized plant context available for payroll persistence.');
            }

            const empPlant = emp.companyId || emp.plant_id || authPlant.id;
            if (empPlant !== authPlant.id) {
                throw new Error(\`Employee "\${emp.name || empId}" belongs to plant "\${empPlant}", not active plant "\${authPlant.id}". Cross-plant payroll is prohibited.\`);
            }

            const businessId = authPlant.business_id || (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness()?.id : null);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            if (!isUUID(businessId)) {
                throw new Error(\`Active plant "\${authPlant.id}" has invalid business UUID (\${businessId}).\`);
            }

            let m = record.month != null ? parseInt(record.month, 10) : null;
            let y = record.year != null ? parseInt(record.year, 10) : null;
            if ((!m || !y) && record.monthKey) {
                const parts = record.monthKey.split('-');
                if (parts.length === 2) {
                    y = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                }
            }
            if (!m || m < 1 || m > 12) {
                throw new Error(\`Invalid payroll month "\${m}". Must be between 1 and 12.\`);
            }
            if (!y || y < 2000) {
                throw new Error(\`Invalid payroll year "\${y}". Must be >= 2000.\`);
            }

            let rawStatus = record.status || 'Draft';
            let dbStatus = 'Draft';
            if (rawStatus === 'Reviewed' || rawStatus === 'Processed') {
                dbStatus = 'Processed';
            } else if (['Draft', 'Approved', 'Paid'].includes(rawStatus)) {
                dbStatus = rawStatus;
            } else {
                dbStatus = 'Draft';
            }

            const toNum = (val, dec = 2) => {
                const n = parseFloat(val);
                return isNaN(n) ? 0 : Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
            };

            const payableDays = toNum(record.payable_days != null ? record.payable_days : record.payableDays, 1);
            const presentDays = toNum(record.present_days != null ? record.present_days : record.presentDays, 1);
            const paidLeaves = toNum(record.paid_leaves != null ? record.paid_leaves : record.paidLeaveDays, 1);
            const unpaidLeaves = toNum(record.unpaid_leaves != null ? record.unpaid_leaves : (record.unpaidLeaveDays != null ? record.unpaidLeaveDays : record.absentDays), 1);
            const weeklyOffs = toNum(record.weekly_offs != null ? record.weekly_offs : record.weeklyOffDays, 1);
            const holidays = toNum(record.holidays != null ? record.holidays : record.holidayDays, 1);
            const otHours = toNum(record.ot_hours != null ? record.ot_hours : record.otHours, 2);

            const basicEarned = toNum(record.basic_earned != null ? record.basic_earned : record.basicEarned, 2);
            const hraEarned = toNum(record.hra_earned != null ? record.hra_earned : record.hraEarned, 2);
            const allowancesEarned = toNum(record.allowances_earned != null ? record.allowances_earned : record.allowancesEarned, 2);
            const otAmount = toNum(record.ot_amount != null ? record.ot_amount : record.otAmount, 2);
            const grossSalary = toNum(record.gross_salary != null ? record.gross_salary : record.grossEarned, 2);

            const pfEmployee = toNum(record.pf_employee != null ? record.pf_employee : record.pfDeduction, 2);
            const pfEmployerEpf = toNum(record.pf_employer_epf != null ? record.pf_employer_epf : record.employerPF, 2);
            const pfEmployerEps = toNum(record.pf_employer_eps, 2);
            const pfAdminCharges = toNum(record.pf_admin_charges, 2);
            const esiEmployee = toNum(record.esi_employee != null ? record.esi_employee : record.esiDeduction, 2);
            const esiEmployer = toNum(record.esi_employer != null ? record.esi_employer : record.employerESI, 2);
            const ptDeduction = toNum(record.pt_deduction != null ? record.pt_deduction : record.ptDeduction, 2);
            const advanceDeduction = toNum(record.advance_deduction != null ? record.advance_deduction : record.advance, 2);
            const otherDeductions = toNum(record.other_deductions, 2);
            const totalDeductions = toNum(record.total_deductions != null ? record.total_deductions : record.totalDeductions, 2);
            const netSalary = toNum(record.net_salary != null ? record.net_salary : record.netSalary, 2);

            let paymentDate = record.payment_date || null;
            if (!paymentDate && record.paidOn && dbStatus === 'Paid') {
                try {
                    const pd = new Date(record.paidOn);
                    if (!isNaN(pd.getTime())) paymentDate = pd.toISOString().split('T')[0];
                } catch (_) {}
            }
            if (!paymentDate && dbStatus === 'Paid') {
                paymentDate = new Date().toISOString().split('T')[0];
            }

            let remarks = record.remarks || '';
            if (Array.isArray(record.exceptions) && record.exceptions.length > 0 && !remarks) {
                remarks = record.exceptions.join('; ');
            }

            const currentUser = state.currentUser?.email || state.currentUser?.name || 'system';

            return {
                emp_id: empId,
                business_id: businessId,
                plant_id: authPlant.id,
                companyId: authPlant.id,
                month: m,
                year: y,
                payable_days: payableDays,
                present_days: presentDays,
                paid_leaves: paidLeaves,
                unpaid_leaves: unpaidLeaves,
                weekly_offs: weeklyOffs,
                holidays: holidays,
                ot_hours: otHours,
                basic_earned: basicEarned,
                hra_earned: hraEarned,
                allowances_earned: allowancesEarned,
                ot_amount: otAmount,
                gross_salary: grossSalary,
                pf_employee: pfEmployee,
                pf_employer_epf: pfEmployerEpf,
                pf_employer_eps: pfEmployerEps,
                pf_admin_charges: pfAdminCharges,
                esi_employee: esiEmployee,
                esi_employer: esiEmployer,
                pt_deduction: ptDeduction,
                advance_deduction: advanceDeduction,
                other_deductions: otherDeductions,
                total_deductions: totalDeductions,
                net_salary: netSalary,
                status: dbStatus,
                payment_mode: record.payment_mode || null,
                payment_date: paymentDate,
                transaction_ref: record.transaction_ref || null,
                remarks: remarks || null,
                created_by: currentUser
            };
        }

        async function processPayrollLedgerSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save payroll ledger.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('payrollLedger', 'add')) {
                showToast('Unauthorized: You do not have permission to add payroll ledger entries.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('payrollLedger', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit payroll ledger entries.', 'error');
                return;
            }

            const existingList = getLivePayrollLedger();
            const existingRecord = existingList.find(r => r.id === state.editingId || r.db_id === state.editingId || r.uuid === state.editingId) || (state.data.payrollLedger || []).find(r => r.id === state.editingId);
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const liveDbId = existingRecord?.db_id || existingRecord?.uuid || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

            if (!liveDbId || !isUUID(liveDbId)) {
                showToast('Cannot update payroll ledger: No valid live database UUID found.', 'error');
                return;
            }

            const statusVal = document.getElementById('field_status')?.value || existingRecord.status || 'Draft';
            const dbStatus = (statusVal === 'Reviewed' || statusVal === 'Processed') ? 'Processed' : statusVal;

            const updatePayload = {
                status: dbStatus,
                remarks: (document.getElementById('field_remarks')?.value || existingRecord.remarks || '').trim() || null,
                payment_mode: document.getElementById('field_paymentMode')?.value || existingRecord.payment_mode || null,
                transaction_ref: (document.getElementById('field_transactionRef')?.value || existingRecord.transaction_ref || '').trim() || null
            };

            if (dbStatus === 'Paid' && !existingRecord.payment_date) {
                updatePayload.payment_date = new Date().toISOString().split('T')[0];
            }

            try {
                const { data, error } = await client
                    .from('payroll_ledger')
                    .update(updatePayload)
                    .eq('id', liveDbId)
                    .select()
                    .single();

                if (error) {
                    console.error('[PayrollLedger] Update failed:', error);
                    showToast(\`Failed to update payroll ledger: \${error.message || error.details || 'Database error'}\`, 'error');
                    return;
                }

                const normalizedRow = normalizeLivePayrollLedger(data);
                if (!normalizedRow) {
                    showToast('Failed to normalize updated payroll row.', 'error');
                    return;
                }

                if (state.liveMasters && Array.isArray(state.liveMasters.payrollLedger)) {
                    const idx = state.liveMasters.payrollLedger.findIndex(r => r.id === liveDbId || r.db_id === liveDbId);
                    if (idx > -1) state.liveMasters.payrollLedger[idx] = normalizedRow;
                    else state.liveMasters.payrollLedger.unshift(normalizedRow);
                }
                if (Array.isArray(state.data.payrollLedger)) {
                    const idx = state.data.payrollLedger.findIndex(r => r.id === state.editingId || r.id === liveDbId);
                    if (idx > -1) state.data.payrollLedger[idx] = normalizedRow;
                    else state.data.payrollLedger.unshift(normalizedRow);
                }

                if (typeof logAudit === 'function') {
                    logAudit('payrollLedger', 'Update', normalizedRow);
                }

                closeModal();
                state.editingId = null;
                if (state.currentModule === 'payrollLedger') {
                    renderTableModule('payrollLedger', document.getElementById('content-area'));
                }
                showToast(\`Payroll for \${normalizedRow.empId || normalizedRow.emp_id} updated successfully!\`, 'success');
            } catch (updateErr) {
                console.error('[PayrollLedger] Update exception:', updateErr);
                showToast(\`Error updating payroll ledger: \${updateErr.message || 'Unexpected error'}\`, 'error');
                return;
            }
        }`);

    if (!text.includes(vendorInvoiceSaveEndTarget)) {
        throw new Error('Could not find vendorInvoiceSaveEndTarget');
    }
    text = text.replace(vendorInvoiceSaveEndTarget, vendorInvoiceSaveEndTarget + hrPersistenceCode);

    // 5. Update runPayrollGeneration (lines 11149-11196)
    const runPayrollTarget = toCRLF(`        function runPayrollGeneration(monthYear, year, month, companyIdOverride) {
            if (!state.data.payrollSettings || !state.data.payrollSettings.length) {
                showToast('Please configure Payroll Statutory Settings first.', 'error');
                return;
            }
            const monthKey = \`\${year}-\${String(month).padStart(2, '0')}\`;
            const companyId = companyIdOverride || state.currentCompany;
            let created = 0, skippedLocked = 0, skippedBlocked = [];

            getLiveEmployees().filter(e => e.companyId === companyId && e.status === 'Active').forEach(emp => {
                const existing = state.data.payrollLedger.find(p => p.empId === emp.id && p.monthKey === monthKey && p.companyId === companyId);
                if (existing && ['Approved', 'Paid'].includes(existing.status)) { skippedLocked++; return; } // never silently overwrite locked payroll

                const calc = calculateEmployeePayroll(emp.id, year, month, companyId);
                if (calc.blocked) { skippedBlocked.push(emp.name); return; }

                const prRecord = {
                    id: existing ? existing.id : generateId('PAY'),
                    monthYear, monthKey, empId: emp.id,
                    financialYear: existing ? existing.financialYear : getFinancialYear(new Date(year, month - 1, 1), companyId),
                    payableDays: calc.summary.payableDays,
                    presentDays: calc.summary.presentDays, halfDays: calc.summary.halfDays, lateDays: calc.summary.lateDays,
                    absentDays: calc.summary.absentDays, paidLeaveDays: calc.summary.paidLeaveDays, unpaidLeaveDays: calc.summary.unpaidLeaveDays,
                    weeklyOffDays: calc.summary.weeklyOffDays, holidayDays: calc.summary.holidayDays, missingPunchDays: calc.summary.missingPunchDays,
                    otHours: calc.otHours, otAmount: calc.otAmount,
                    grossEarned: calc.grossEarned,
                    pfDeduction: calc.pfDeduction, esiDeduction: calc.esiDeduction, ptDeduction: calc.ptDeduction, advance: calc.advance,
                    totalDeductions: calc.totalDeductions, netSalary: calc.netSalary,
                    employerPF: calc.employerPF, employerESI: calc.employerESI,
                    exceptions: calc.exceptions,
                    status: existing ? existing.status : 'Draft',
                    companyId
                };
                if (existing) {
                    Object.assign(existing, prRecord);
                    logAudit('payrollLedger', 'Update', existing);
                } else {
                    state.data.payrollLedger.unshift(prRecord);
                    logAudit('payrollLedger', 'Create', prRecord);
                }
                created++;
            });

            let msg = \`Payroll for \${monthYear} generated for \${created} employee(s).\`;
            if (skippedLocked > 0) msg += \` \${skippedLocked} already Approved/Paid — left untouched.\`;
            if (skippedBlocked.length) msg += \` \${skippedBlocked.length} skipped due to missing setup (see Exceptions).\`;
            showToast(msg, skippedBlocked.length ? 'warning' : 'success');
        }`);

    const runPayrollReplacement = toCRLF(`        async function runPayrollGeneration(monthYear, year, month, companyIdOverride) {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to generate payroll.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            if (typeof hasPerm === 'function' && !hasPerm('payrollLedger', 'add')) {
                showToast('Unauthorized: You do not have permission to generate payroll.', 'error');
                return;
            }

            if (!state.data.payrollSettings || !state.data.payrollSettings.length) {
                showToast('Please configure Payroll Statutory Settings first.', 'error');
                return;
            }

            const monthKey = \`\${year}-\${String(month).padStart(2, '0')}\`;
            const companyId = companyIdOverride || state.currentCompany;

            // Enforce plant authorization
            let authPlant = null;
            if (typeof assertAuthorizedPlant === 'function') {
                authPlant = assertAuthorizedPlant(companyId);
            }
            if (!authPlant && typeof getCurrentAuthorizedPlant === 'function') {
                authPlant = getCurrentAuthorizedPlant();
            }
            if (!authPlant && Array.isArray(state.authorizedPlants)) {
                authPlant = state.authorizedPlants.find(p => p.id === companyId) || state.authorizedPlants[0] || null;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot generate payroll: no authorized plant found.', 'error');
                return;
            }

            let created = 0, skippedLocked = 0;
            const skippedBlocked = [];
            const failedErrors = [];

            const activeEmps = getLiveEmployees().filter(e => (e.companyId === companyId || e.plant_id === companyId) && e.status === 'Active');

            for (const emp of activeEmps) {
                const existing = getLivePayrollLedger().find(p => (p.empId === emp.id || p.emp_id === emp.id) && p.monthKey === monthKey && (p.companyId === companyId || p.plant_id === companyId)) || (state.data.payrollLedger || []).find(p => (p.empId === emp.id || p.emp_id === emp.id) && p.monthKey === monthKey && (p.companyId === companyId || p.plant_id === companyId));
                if (existing && ['Approved', 'Paid'].includes(existing.status)) {
                    skippedLocked++;
                    continue;
                }

                const calc = calculateEmployeePayroll(emp.id, year, month, companyId);
                if (calc.blocked) {
                    skippedBlocked.push(emp.name);
                    continue;
                }

                const daysBasis = calc.daysBasis || 26;
                const basicEarned = Math.round(((parseFloat(emp.basicPay) || 0) / daysBasis) * calc.summary.payableDays);
                const hraEarned = Math.round(((parseFloat(emp.hra) || 0) / daysBasis) * calc.summary.payableDays);
                const allowancesEarned = calc.grossEarned - basicEarned - hraEarned;

                const rawRecord = {
                    empId: emp.id,
                    emp_id: emp.id,
                    month: month,
                    year: year,
                    monthKey: monthKey,
                    monthYear: monthYear,
                    payableDays: calc.summary.payableDays,
                    presentDays: calc.summary.presentDays,
                    halfDays: calc.summary.halfDays,
                    lateDays: calc.summary.lateDays,
                    absentDays: calc.summary.absentDays,
                    paidLeaveDays: calc.summary.paidLeaveDays,
                    unpaidLeaveDays: calc.summary.unpaidLeaveDays,
                    weeklyOffDays: calc.summary.weeklyOffDays,
                    holidayDays: calc.summary.holidayDays,
                    missingPunchDays: calc.summary.missingPunchDays,
                    otHours: calc.otHours,
                    otAmount: calc.otAmount,
                    basicEarned: basicEarned,
                    hraEarned: hraEarned,
                    allowancesEarned: allowancesEarned,
                    grossEarned: calc.grossEarned,
                    pfDeduction: calc.pfDeduction,
                    esiDeduction: calc.esiDeduction,
                    ptDeduction: calc.ptDeduction,
                    advance: calc.advance,
                    totalDeductions: calc.totalDeductions,
                    netSalary: calc.netSalary,
                    employerPF: calc.employerPF,
                    employerESI: calc.employerESI,
                    exceptions: calc.exceptions,
                    status: existing ? existing.status : 'Draft',
                    companyId: companyId
                };

                let payload;
                try {
                    payload = buildLivePayrollLedgerPayload(rawRecord);
                } catch (payloadErr) {
                    failedErrors.push(\`\${emp.name}: \${payloadErr.message}\`);
                    continue;
                }

                const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const liveDbId = existing ? (existing.db_id || existing.uuid || (isUUID(existing.id) ? existing.id : null)) : null;

                try {
                    let data, error;
                    if (liveDbId) {
                        const updateRes = await client
                            .from('payroll_ledger')
                            .update(payload)
                            .eq('id', liveDbId)
                            .select()
                            .single();
                        data = updateRes.data;
                        error = updateRes.error;
                    } else {
                        const insertRes = await client
                            .from('payroll_ledger')
                            .insert(payload)
                            .select()
                            .single();
                        data = insertRes.data;
                        error = insertRes.error;
                    }

                    if (error) {
                        console.error(\`[PayrollLedger] Save failed for \${emp.name}:\`, error);
                        failedErrors.push(\`\${emp.name}: \${error.message || 'Database error'}\`);
                        continue;
                    }

                    const normalizedRow = normalizeLivePayrollLedger(data);
                    if (!normalizedRow) {
                        failedErrors.push(\`\${emp.name}: Failed to normalize row\`);
                        continue;
                    }

                    // Update live master & local data
                    if (state.liveMasters && Array.isArray(state.liveMasters.payrollLedger)) {
                        const idx = state.liveMasters.payrollLedger.findIndex(p => p.id === normalizedRow.id || ((p.empId === emp.id || p.emp_id === emp.id) && p.monthKey === monthKey && (p.companyId === companyId || p.plant_id === companyId)));
                        if (idx > -1) state.liveMasters.payrollLedger[idx] = normalizedRow;
                        else state.liveMasters.payrollLedger.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.payrollLedger)) state.data.payrollLedger = [];
                    const dIdx = state.data.payrollLedger.findIndex(p => p.id === normalizedRow.id || ((p.empId === emp.id || p.emp_id === emp.id) && p.monthKey === monthKey && (p.companyId === companyId || p.plant_id === companyId)));
                    if (dIdx > -1) state.data.payrollLedger[dIdx] = normalizedRow;
                    else state.data.payrollLedger.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('payrollLedger', liveDbId ? 'Update' : 'Create', normalizedRow);
                    }
                    created++;
                } catch (saveErr) {
                    console.error(\`[PayrollLedger] Save exception for \${emp.name}:\`, saveErr);
                    failedErrors.push(\`\${emp.name}: \${saveErr.message || 'Unexpected error'}\`);
                }
            }

            if (created === 0 && failedErrors.length > 0) {
                showToast(\`Payroll generation failed: \${failedErrors[0]}\`, 'error');
            } else if (failedErrors.length > 0) {
                let warnMsg = \`Partial payroll generation for \${monthYear}: \${created} succeeded, \${failedErrors.length} failed (\${failedErrors[0]}).\`;
                if (skippedLocked > 0) warnMsg += \` \${skippedLocked} locked.\`;
                showToast(warnMsg, 'warning');
            } else {
                let successMsg = \`Payroll for \${monthYear} generated for \${created} employee(s).\`;
                if (skippedLocked > 0) successMsg += \` \${skippedLocked} already Approved/Paid — left untouched.\`;
                if (skippedBlocked.length) successMsg += \` \${skippedBlocked.length} skipped due to missing setup.\`;
                showToast(successMsg, skippedBlocked.length ? 'warning' : 'success');
            }

            // Re-render site run or detail view if open
            if (typeof renderPayrollSiteRun === 'function' && document.getElementById('content-area')) {
                renderPayrollSiteRun(companyId, monthKey);
            }
        }`);

    if (!text.includes(runPayrollTarget)) {
        throw new Error('Could not find runPayrollTarget');
    }
    text = text.replace(runPayrollTarget, runPayrollReplacement);

    // 6. Update saveRecord() to route attendance and payrollLedger
    const saveRecordTarget = toCRLF(`            if (moduleKey === 'receivedInvoice') {
                return processVendorInvoiceSave();
            }`);

    const saveRecordReplacement = toCRLF(`            if (moduleKey === 'receivedInvoice') {
                return processVendorInvoiceSave();
            }
            if (moduleKey === 'attendance') {
                return processAttendanceSave();
            }
            if (moduleKey === 'payrollLedger') {
                return processPayrollLedgerSave();
            }`);

    if (!text.includes(saveRecordTarget)) {
        throw new Error('Could not find saveRecordTarget');
    }
    text = text.replace(saveRecordTarget, saveRecordReplacement);

    // 7. Update deleteRecord() to block deletion of attendance and payrollLedger
    const deleteRecordTarget = toCRLF(`            if (moduleKey === 'receivedInvoice') {
                showToast('Vendor invoice deletion is restricted to protect purchase orders and GRN audit integrity.', 'warning');
                return;
            }`);

    const deleteRecordReplacement = toCRLF(`            if (moduleKey === 'receivedInvoice') {
                showToast('Vendor invoice deletion is restricted to protect purchase orders and GRN audit integrity.', 'warning');
                return;
            }
            if (moduleKey === 'attendance') {
                showToast('Attendance logs are audit records and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'payrollLedger') {
                showToast('Payroll ledger entries are statutory records and cannot be deleted.', 'warning');
                return;
            }`);

    if (!text.includes(deleteRecordTarget)) {
        throw new Error('Could not find deleteRecordTarget');
    }
    text = text.replace(deleteRecordTarget, deleteRecordReplacement);

    return text;
}

const originalAppJs = fs.readFileSync('frontend/app.js', 'utf8');
const modifiedAppJs = applyChanges(originalAppJs);
fs.writeFileSync('scratch/app.test.js', modifiedAppJs);
console.log('Successfully wrote scratch/app.test.js! Length:', modifiedAppJs.length);
