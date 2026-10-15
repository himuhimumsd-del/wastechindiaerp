const fs = require('fs');

function toCRLF(str) {
    return str.replace(/\r?\n/g, '\r\n');
}

function applyWave12_1(content) {
    let text = content;

    // 1. State initialization: add admin & system collections to liveMasters and liveMasterLoaded
    const stateTarget = toCRLF(`            liveMasters: { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [], poReceived: [], poIssued: [], grn: [], payrollSettings: [] },
            liveMasterLoaded: { items: false, shifts: false, employees: false, attendance: false, payrollLedger: false, machineLogs: false, consumableLogs: false, invoices: false, receivedInvoice: false, trips: false, gateVerification: false, poReceived: false, poIssued: false, grn: false, payrollSettings: false }`);

    const stateReplacement = toCRLF(`            liveMasters: { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [], poReceived: [], poIssued: [], grn: [], payrollSettings: [], roles: [], signatures: [], templatesMaster: [], systemSettings: [], profiles: [], auditLogs: [] },
            liveMasterLoaded: { items: false, shifts: false, employees: false, attendance: false, payrollLedger: false, machineLogs: false, consumableLogs: false, invoices: false, receivedInvoice: false, trips: false, gateVerification: false, poReceived: false, poIssued: false, grn: false, payrollSettings: false, roles: false, signatures: false, templatesMaster: false, systemSettings: false, profiles: false, auditLogs: false, companyMaster: false, usersMaster: false }`);

    if (!text.includes(stateTarget)) {
        throw new Error('Could not find stateTarget');
    }
    text = text.replace(stateTarget, stateReplacement);

    // 2. Unauth reset in hydrateLiveMasterData (line ~3264)
    const unauthHydrateTarget = toCRLF(`            if (state.authAuthorized !== true) {
                state.liveMasters = { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [], poReceived: [], poIssued: [], grn: [], payrollSettings: [] };
                if (state.liveMasterLoaded) {
                    state.liveMasterLoaded.items = false;
                    state.liveMasterLoaded.shifts = false;
                    state.liveMasterLoaded.employees = false;
                    state.liveMasterLoaded.attendance = false;
                    state.liveMasterLoaded.payrollLedger = false;
                    state.liveMasterLoaded.machineLogs = false;
                    state.liveMasterLoaded.consumableLogs = false;
                    state.liveMasterLoaded.invoices = false;
                    state.liveMasterLoaded.receivedInvoice = false;
                    state.liveMasterLoaded.trips = false;
                    state.liveMasterLoaded.gateVerification = false;
                    state.liveMasterLoaded.poReceived = false;
                    state.liveMasterLoaded.poIssued = false;
                    state.liveMasterLoaded.grn = false;
                    state.liveMasterLoaded.payrollSettings = false;
                }
                return { success: false, error: 'Unauthorized' };
            }`);

    const unauthHydrateReplacement = toCRLF(`            if (state.authAuthorized !== true) {
                state.liveMasters = { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [], poReceived: [], poIssued: [], grn: [], payrollSettings: [], roles: [], signatures: [], templatesMaster: [], systemSettings: [], profiles: [], auditLogs: [] };
                if (state.liveMasterLoaded) {
                    state.liveMasterLoaded.items = false;
                    state.liveMasterLoaded.shifts = false;
                    state.liveMasterLoaded.employees = false;
                    state.liveMasterLoaded.attendance = false;
                    state.liveMasterLoaded.payrollLedger = false;
                    state.liveMasterLoaded.machineLogs = false;
                    state.liveMasterLoaded.consumableLogs = false;
                    state.liveMasterLoaded.invoices = false;
                    state.liveMasterLoaded.receivedInvoice = false;
                    state.liveMasterLoaded.trips = false;
                    state.liveMasterLoaded.gateVerification = false;
                    state.liveMasterLoaded.poReceived = false;
                    state.liveMasterLoaded.poIssued = false;
                    state.liveMasterLoaded.grn = false;
                    state.liveMasterLoaded.payrollSettings = false;
                    state.liveMasterLoaded.roles = false;
                    state.liveMasterLoaded.signatures = false;
                    state.liveMasterLoaded.templatesMaster = false;
                    state.liveMasterLoaded.systemSettings = false;
                    state.liveMasterLoaded.profiles = false;
                    state.liveMasterLoaded.auditLogs = false;
                    state.liveMasterLoaded.companyMaster = false;
                    state.liveMasterLoaded.usersMaster = false;
                }
                return { success: false, error: 'Unauthorized' };
            }`);

    if (!text.includes(unauthHydrateTarget)) {
        throw new Error('Could not find unauthHydrateTarget');
    }
    text = text.replace(unauthHydrateTarget, unauthHydrateReplacement);

    // 3. HydrateLiveMasterData additions: Steps 22-28 and liveMasters assignment
    const hydrateAssignmentTarget = toCRLF(`                state.liveMasters = {
                    businesses: bizRes.data,
                    plants: verifiedLivePlants,
                    units: unitRes.data,
                    poTypes: poTypeRes.data,
                    items: liveItems,
                    parties: liveParties,
                    vehicles: liveVehicles,
                    plantMachinery: liveMachinery,
                    consumables: liveConsumables,
                    shifts: liveShifts,
                    employees: liveEmployees,
                    attendance: liveAttendance,
                    payrollLedger: livePayrollLedger,
                    machineLogs: liveMachineLogs,
                    consumableLogs: liveConsumableLogs,
                    invoices: liveInvoices,
                    receivedInvoice: liveReceivedInvoices,
                    trips: liveTrips,
                    gateVerification: liveGateEntries,
                    poReceived: livePoReceived,
                    poIssued: livePoIssued,
                    grn: liveGrn,
                    payrollSettings: livePayrollSettings
                };`);

    const hydrateAssignmentReplacement = toCRLF(`                // 22. Live Company Master Synchronization
                const liveCompanyMaster = verifiedLivePlants.map(p => {
                    const biz = (bizRes.data || []).find(b => b.id === p.business_id);
                    const existing = (state.data.companyMaster || []).find(c => c.id === p.id) || {};
                    return {
                        id: p.id,
                        name: biz ? biz.legal_name : (p.plant_name || existing.name || p.id),
                        tradeName: p.trade_name || p.plant_name || existing.tradeName || p.id,
                        phone: p.phone || existing.phone || '',
                        cin: biz ? biz.cin : (existing.cin || ''),
                        pan: biz ? biz.pan : (existing.pan || ''),
                        gstin: existing.gstin || '',
                        state: existing.state || '',
                        spcb: p.spcb_auth || existing.spcb || '',
                        epr: p.epr_reg_no || existing.epr || '',
                        address: p.physical_address || existing.address || '',
                        bankName: existing.bankName || '',
                        accNo: existing.accNo || '',
                        ifsc: existing.ifsc || '',
                        logo: biz ? (biz.logo_url || '') : (existing.logo || ''),
                        plantLat: p.plant_lat != null ? String(p.plant_lat) : (existing.plantLat || ''),
                        plantLng: p.plant_lng != null ? String(p.plant_lng) : (existing.plantLng || ''),
                        geofenceRadius: p.geofence_radius != null ? String(p.geofence_radius) : (existing.geofenceRadius || '500'),
                        geofenceEnabled: p.geofence_enabled !== false,
                        attendanceSelfieRequired: p.attendance_selfie_required !== false,
                        fyStartMonth: biz ? (biz.fy_start_month || 'April') : (existing.fyStartMonth || 'April'),
                        _isLive: true
                    };
                });
                if (liveCompanyMaster.length > 0) {
                    state.data.companyMaster = liveCompanyMaster;
                    if (state.liveMasterLoaded) state.liveMasterLoaded.companyMaster = true;
                }

                // 23. Live Roles & Permissions (public.roles & public.role_permissions)
                const rolesRes = await fetchLiveMaster('roles', 'id, role_name, description, is_system', { order: { column: 'id', ascending: true } });
                const permsRes = await fetchLiveMaster('role_permissions', 'id, role_id, module_key, can_view, can_add, can_edit, can_delete', {});
                let liveRoles = [];
                if (!rolesRes.error && Array.isArray(rolesRes.data)) {
                    liveRoles = rolesRes.data.map(r => normalizeLiveRole(r, permsRes.data || []));
                    state.liveMasters.roles = liveRoles;
                    state.data.rolesMaster = liveRoles;
                    if (state.liveMasterLoaded) state.liveMasterLoaded.roles = true;
                } else if (rolesRes.error) {
                    console.warn('[LiveMaster] Roles read error:', rolesRes.error);
                    if (state.liveMasterLoaded) state.liveMasterLoaded.roles = false;
                }

                // 24. Live Signatures (public.signatures)
                const sigsRes = await fetchLiveMaster('signatures', 'id, plant_id, auth_name, sign_image_url, is_active', { eq: { is_active: true } });
                let liveSignatures = [];
                if (!sigsRes.error && Array.isArray(sigsRes.data)) {
                    const verifiedSigs = sigsRes.data.filter(s => !s.plant_id || authPlantIds.includes(s.plant_id));
                    liveSignatures = verifiedSigs.map(normalizeLiveSignature);
                    state.liveMasters.signatures = liveSignatures;
                    state.data.signatureMaster = liveSignatures;
                    if (state.liveMasterLoaded) state.liveMasterLoaded.signatures = true;
                } else if (sigsRes.error) {
                    console.warn('[LiveMaster] Signatures read error:', sigsRes.error);
                    if (state.liveMasterLoaded) state.liveMasterLoaded.signatures = false;
                }

                // 25. Live Document Templates (public.document_templates)
                const tmplRes = await fetchLiveMaster('document_templates', 'id, plant_id, name, applicable_type, content, is_active', { eq: { is_active: true } });
                let liveTemplates = [];
                if (!tmplRes.error && Array.isArray(tmplRes.data)) {
                    const verifiedTmpl = tmplRes.data.filter(t => !t.plant_id || authPlantIds.includes(t.plant_id));
                    liveTemplates = verifiedTmpl.map(normalizeLiveTemplate);
                    state.liveMasters.templatesMaster = liveTemplates;
                    state.data.templatesMaster = liveTemplates;
                    if (state.liveMasterLoaded) state.liveMasterLoaded.templatesMaster = true;
                } else if (tmplRes.error) {
                    console.warn('[LiveMaster] Document templates read error:', tmplRes.error);
                    if (state.liveMasterLoaded) state.liveMasterLoaded.templatesMaster = false;
                }

                // 26. Live System Settings (public.system_settings)
                const sysRes = await fetchLiveMaster('system_settings', 'id, default_plant_lat, default_plant_lng, default_geofence_radius, config');
                let liveSystemSettings = [];
                if (!sysRes.error && Array.isArray(sysRes.data)) {
                    liveSystemSettings = sysRes.data.map(normalizeLiveSystemSettings);
                    state.liveMasters.systemSettings = liveSystemSettings;
                    if (liveSystemSettings.length > 0) {
                        state.data.systemSettings = liveSystemSettings;
                    }
                    if (state.liveMasterLoaded) state.liveMasterLoaded.systemSettings = true;
                } else if (sysRes.error) {
                    console.warn('[LiveMaster] System settings read error:', sysRes.error);
                    if (state.liveMasterLoaded) state.liveMasterLoaded.systemSettings = false;
                }

                // 27. Live Profiles / Users (public.profiles)
                const profRes = await fetchLiveMaster('profiles', 'id, legacy_user_id, username, full_name, emp_id, role_id, default_plant_id, status', {});
                let liveProfiles = [];
                if (!profRes.error && Array.isArray(profRes.data)) {
                    liveProfiles = profRes.data.map(normalizeLiveProfile);
                    state.liveMasters.profiles = liveProfiles;
                    state.data.usersMaster = liveProfiles;
                    if (state.liveMasterLoaded) state.liveMasterLoaded.usersMaster = true;
                } else if (profRes.error) {
                    console.warn('[LiveMaster] Profiles read error:', profRes.error);
                    if (state.liveMasterLoaded) state.liveMasterLoaded.usersMaster = false;
                }

                // 28. Live Audit Logs (public.audit_logs - Recent Audit Trail)
                let liveAuditLogs = [];
                const auditClient = window.getSupabaseClient ? window.getSupabaseClient() : null;
                if (auditClient) {
                    try {
                        const { data: auditRows, error: auditErr } = await auditClient
                            .from('audit_logs')
                            .select('id, business_id, plant_id, "companyId", user_id, user_email, action, entity_type, entity_id, details, after_state, created_at')
                            .in('business_id', authBizIds)
                            .order('created_at', { ascending: false });
                        if (!auditErr && Array.isArray(auditRows)) {
                            liveAuditLogs = auditRows.map(normalizeLiveAuditLog);
                            state.liveMasters.auditLogs = liveAuditLogs;
                            if (liveAuditLogs.length > 0) {
                                state.data.auditLogs = liveAuditLogs;
                            }
                            if (state.liveMasterLoaded) state.liveMasterLoaded.auditLogs = true;
                        } else if (auditErr) {
                            console.warn('[LiveMaster] Audit logs read error:', auditErr);
                            if (state.liveMasterLoaded) state.liveMasterLoaded.auditLogs = false;
                        }
                    } catch (auditFetchErr) {
                        console.warn('[LiveMaster] Audit logs fetch exception:', auditFetchErr);
                    }
                }

                state.liveMasters = {
                    businesses: bizRes.data,
                    plants: verifiedLivePlants,
                    units: unitRes.data,
                    poTypes: poTypeRes.data,
                    items: liveItems,
                    parties: liveParties,
                    vehicles: liveVehicles,
                    plantMachinery: liveMachinery,
                    consumables: liveConsumables,
                    shifts: liveShifts,
                    employees: liveEmployees,
                    attendance: liveAttendance,
                    payrollLedger: livePayrollLedger,
                    machineLogs: liveMachineLogs,
                    consumableLogs: liveConsumableLogs,
                    invoices: liveInvoices,
                    receivedInvoice: liveReceivedInvoices,
                    trips: liveTrips,
                    gateVerification: liveGateEntries,
                    poReceived: livePoReceived,
                    poIssued: livePoIssued,
                    grn: liveGrn,
                    payrollSettings: livePayrollSettings,
                    roles: liveRoles,
                    signatures: liveSignatures,
                    templatesMaster: liveTemplates,
                    systemSettings: liveSystemSettings,
                    profiles: liveProfiles,
                    auditLogs: liveAuditLogs
                };`);

    if (!text.includes(hydrateAssignmentTarget)) {
        throw new Error('Could not find hydrateAssignmentTarget');
    }
    text = text.replace(hydrateAssignmentTarget, hydrateAssignmentReplacement);

    // 4. Window exports
    const exportTarget = toCRLF(`        window.getLivePoIssued = getLivePoIssued;
        window.getLiveGrn = getLiveGrn;
        window.getLivePayrollSettings = getLivePayrollSettings;`);

    const exportReplacement = toCRLF(`        window.getLivePoIssued = getLivePoIssued;
        window.getLiveGrn = getLiveGrn;
        window.getLivePayrollSettings = getLivePayrollSettings;
        window.normalizeLiveRole = normalizeLiveRole;
        window.normalizeLiveSignature = normalizeLiveSignature;
        window.normalizeLiveTemplate = normalizeLiveTemplate;
        window.normalizeLiveSystemSettings = normalizeLiveSystemSettings;
        window.normalizeLiveProfile = normalizeLiveProfile;
        window.normalizeLiveAuditLog = normalizeLiveAuditLog;
        window.getLiveRoles = getLiveRoles;
        window.getLiveSignatures = getLiveSignatures;
        window.getLiveTemplates = getLiveTemplates;
        window.getLiveSystemSettings = getLiveSystemSettings;
        window.processCompanyMasterSave = processCompanyMasterSave;
        window.processRolesMasterSave = processRolesMasterSave;
        window.processSignatureMasterSave = processSignatureMasterSave;
        window.processTemplatesMasterSave = processTemplatesMasterSave;
        window.processSystemSettingsSave = processSystemSettingsSave;
        window.processUsersMasterSave = processUsersMasterSave;
        window.processSignatureDelete = processSignatureDelete;
        window.processTemplateDelete = processTemplateDelete;
        window.processRoleDelete = processRoleDelete;`);

    if (!text.includes(exportTarget)) {
        throw new Error('Could not find exportTarget');
    }
    text = text.replace(exportTarget, exportReplacement);

    // 5. Normalizers, getters, save handlers, delete handlers (placed before `// --- CORE SAVE RECORD ---`)
    const coreSaveTarget = toCRLF(`        // --- CORE SAVE RECORD ---
        function saveRecord() {`);

    const handlersChunk = toCRLF(`        // ============ WAVE 12.1: ADMIN / SYSTEM LIVE NORMALIZERS & GETTERS ============
        function normalizeLiveRole(row, permsRows = []) {
            if (!row) return null;
            let matrix = {};
            if (Array.isArray(permsRows) && permsRows.length > 0) {
                permsRows.filter(p => p.role_id === row.id).forEach(p => {
                    matrix[p.module_key] = {
                        view: Boolean(p.can_view),
                        add: Boolean(p.can_add),
                        edit: Boolean(p.can_edit),
                        delete: Boolean(p.can_delete)
                    };
                });
            }
            return {
                id: row.id,
                roleName: row.role_name || row.roleName || row.id,
                desc: row.description || row.desc || '',
                permissions: Object.keys(matrix).length > 0 ? JSON.stringify(matrix) : (row.permissions || '{}'),
                isSystem: Boolean(row.is_system),
                _isLive: true
            };
        }

        function normalizeLiveSignature(row) {
            if (!row) return null;
            return {
                id: row.id,
                authName: row.auth_name || row.authName || '',
                signImage: row.sign_image_url || row.signImage || '',
                plantId: row.plant_id || row.plantId || null,
                companyId: row.plant_id || row.companyId || null,
                isActive: row.is_active !== false,
                _isLive: true
            };
        }

        function normalizeLiveTemplate(row) {
            if (!row) return null;
            return {
                id: row.id,
                name: row.name || '',
                type: row.applicable_type || row.type || '',
                content: row.content || '',
                plantId: row.plant_id || row.plantId || null,
                companyId: row.plant_id || row.companyId || null,
                isActive: row.is_active !== false,
                _isLive: true
            };
        }

        function normalizeLiveSystemSettings(row) {
            if (!row) return null;
            return {
                id: row.id || 'SET-1',
                plantLat: row.default_plant_lat != null ? String(row.default_plant_lat) : '21.2514',
                plantLng: row.default_plant_lng != null ? String(row.default_plant_lng) : '81.6296',
                geofenceRadius: row.default_geofence_radius != null ? String(row.default_geofence_radius) : '500',
                config: row.config || {},
                _isLive: true
            };
        }

        function normalizeLiveProfile(row) {
            if (!row) return null;
            return {
                id: row.legacy_user_id || row.id,
                authUserId: row.id,
                username: row.username || '',
                fullName: row.full_name || '',
                empId: row.emp_id || '',
                roleId: row.role_id || '',
                companyId: row.default_plant_id || '',
                status: row.status || 'Active',
                _isLive: true
            };
        }

        function normalizeLiveAuditLog(row) {
            if (!row) return null;
            const ts = row.created_at ? new Date(row.created_at).toLocaleString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '';
            const detailsObj = (typeof row.details === 'object' && row.details !== null) ? row.details : {};
            return {
                id: row.id || generateId('AUD'),
                timestamp: ts,
                userRole: row.user_email || detailsObj.actor || 'System',
                module: detailsObj.module || (modulesConfig[row.entity_type] ? modulesConfig[row.entity_type].title : row.entity_type),
                moduleKey: row.entity_type,
                recordId: row.entity_id,
                action: row.action,
                details: detailsObj.description || \`\${row.action} on \${row.entity_type} \${row.entity_id}\`,
                rawSnapshot: JSON.stringify(row.after_state || {}),
                companyId: row.plant_id || row['companyId'] || null,
                _isLive: true
            };
        }

        function getLiveRoles() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.roles) {
                return (state.liveMasters && Array.isArray(state.liveMasters.roles)) ? state.liveMasters.roles : [];
            }
            return (state.data && Array.isArray(state.data.rolesMaster)) ? state.data.rolesMaster : [];
        }

        function getLiveSignatures() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.signatures) {
                return (state.liveMasters && Array.isArray(state.liveMasters.signatures)) ? state.liveMasters.signatures : [];
            }
            return (state.data && Array.isArray(state.data.signatureMaster)) ? state.data.signatureMaster : [];
        }

        function getLiveTemplates() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.templatesMaster) {
                return (state.liveMasters && Array.isArray(state.liveMasters.templatesMaster)) ? state.liveMasters.templatesMaster : [];
            }
            return (state.data && Array.isArray(state.data.templatesMaster)) ? state.data.templatesMaster : [];
        }

        function getLiveSystemSettings() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.systemSettings) {
                return (state.liveMasters && Array.isArray(state.liveMasters.systemSettings)) ? state.liveMasters.systemSettings : [];
            }
            return (state.data && Array.isArray(state.data.systemSettings)) ? state.data.systemSettings : [];
        }

        // ============ WAVE 12.1: ADMIN / SYSTEM LIVE SAVE HANDLERS ============
        async function processCompanyMasterSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            if (typeof hasPerm === 'function' && !hasPerm('companyMaster', 'edit') && !hasPerm('companyMaster', 'add')) {
                showToast('Unauthorized: You do not have permission to modify company / plant settings.', 'error');
                return;
            }

            const plantId = state.editingId || document.getElementById('field_id')?.value?.trim();
            if (!plantId) {
                showToast('Plant ID is required.', 'error');
                return;
            }

            const authPlantIds = (state.authorizedPlants || []).map(p => p.id).filter(Boolean);
            if (!authPlantIds.includes(plantId)) {
                showToast('Access Denied: You do not have permission to manage this plant facility.', 'error');
                return;
            }

            try {
                const tradeName = document.getElementById('field_tradeName')?.value?.trim() || '';
                const name = document.getElementById('field_name')?.value?.trim() || '';
                const phone = document.getElementById('field_phone')?.value?.trim() || null;
                const address = document.getElementById('field_address')?.value?.trim() || '';
                const spcb = document.getElementById('field_spcb')?.value?.trim() || null;
                const epr = document.getElementById('field_epr')?.value?.trim() || null;
                const plantLatVal = document.getElementById('field_plantLat')?.value;
                const plantLngVal = document.getElementById('field_plantLng')?.value;
                const radiusVal = document.getElementById('field_geofenceRadius')?.value;
                const geofenceCb = document.getElementById('field_geofenceEnabled');
                const selfieCb = document.getElementById('field_attendanceSelfieRequired');
                const fyMonth = document.getElementById('field_fyStartMonth')?.value || 'April';
                const cinVal = document.getElementById('field_cin')?.value?.trim() || null;
                const panVal = document.getElementById('field_pan')?.value?.trim() || null;

                const plantPayload = {
                    trade_name: tradeName || name,
                    plant_name: name || tradeName,
                    phone: phone,
                    physical_address: address,
                    spcb_auth: spcb,
                    epr_reg_no: epr,
                    plant_lat: plantLatVal ? parseFloat(plantLatVal) : null,
                    plant_lng: plantLngVal ? parseFloat(plantLngVal) : null,
                    geofence_radius: radiusVal ? parseInt(radiusVal, 10) : 500,
                    geofence_enabled: geofenceCb ? geofenceCb.checked : true,
                    attendance_selfie_required: selfieCb ? selfieCb.checked : true
                };

                const { data: updatedPlant, error: plantErr } = await client
                    .from('plants')
                    .update(plantPayload)
                    .eq('id', plantId)
                    .select()
                    .single();

                if (plantErr) {
                    console.error('[CompanyMaster] Plant update failed:', plantErr);
                    showToast(\`Failed to update plant: \${plantErr.message || 'Database error'}\`, 'error');
                    return;
                }

                const targetBizId = updatedPlant.business_id;
                if (targetBizId) {
                    const bizPayload = {};
                    if (fyMonth) bizPayload.fy_start_month = fyMonth;
                    if (cinVal) bizPayload.cin = cinVal;
                    if (panVal) bizPayload.pan = panVal;
                    if (Object.keys(bizPayload).length > 0) {
                        const { error: bizErr } = await client.from('businesses').update(bizPayload).eq('id', targetBizId);
                        if (bizErr) console.warn('[CompanyMaster] Business metadata update warning:', bizErr);
                    }
                }

                if (state.liveMasters && state.liveMasters.plants) {
                    const idx = state.liveMasters.plants.findIndex(p => p.id === plantId);
                    if (idx > -1) state.liveMasters.plants[idx] = Object.assign({}, state.liveMasters.plants[idx], updatedPlant);
                }

                if (state.data && state.data.companyMaster) {
                    const cIdx = state.data.companyMaster.findIndex(c => c.id === plantId);
                    if (cIdx > -1) {
                        state.data.companyMaster[cIdx] = Object.assign({}, state.data.companyMaster[cIdx], {
                            name: name || tradeName,
                            tradeName: tradeName || name,
                            phone: phone || '',
                            address: address,
                            spcb: spcb || '',
                            epr: epr || '',
                            plantLat: plantLatVal || '',
                            plantLng: plantLngVal || '',
                            geofenceRadius: radiusVal || '500',
                            geofenceEnabled: plantPayload.geofence_enabled,
                            attendanceSelfieRequired: plantPayload.attendance_selfie_required,
                            fyStartMonth: fyMonth,
                            cin: cinVal || '',
                            pan: panVal || '',
                            _isLive: true
                        });
                    }
                }

                logAudit('companyMaster', 'Update', { id: plantId, tradeName: plantPayload.trade_name });
                closeModal();
                if (typeof populateCompanySelector === 'function') populateCompanySelector();
                if (state.currentModule === 'companyMaster') {
                    renderTableModule('companyMaster', document.getElementById('content-area'));
                } else if (state.currentModule === 'systemSettings') {
                    renderGlobalSettingsDashboard(document.getElementById('content-area'));
                }
                showToast('Plant settings saved successfully!', 'success');
            } catch (err) {
                console.error('[CompanyMaster] Save exception:', err);
                showToast(\`Error saving plant settings: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processRolesMasterSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            if (typeof hasPerm === 'function' && !hasPerm('rolesMaster', 'edit') && !hasPerm('rolesMaster', 'add')) {
                showToast('Unauthorized: Super-admin permissions required to manage roles.', 'error');
                return;
            }

            const roleName = document.getElementById('field_roleName')?.value?.trim();
            const desc = document.getElementById('field_desc')?.value?.trim() || '';
            if (!roleName) {
                showToast('Role Title is required.', 'error');
                return;
            }

            let matrix = {};
            document.querySelectorAll('#matrix-body tr').forEach(tr => {
                let m = tr.getAttribute('data-module');
                if (m) {
                    matrix[m] = {
                        view: tr.querySelector('[data-action="view"]')?.checked || false,
                        add: tr.querySelector('[data-action="add"]')?.checked || false,
                        edit: tr.querySelector('[data-action="edit"]')?.checked || false,
                        delete: tr.querySelector('[data-action="delete"]')?.checked || false
                    };
                }
            });

            try {
                const isEdit = Boolean(state.editingId);
                const roleId = isEdit
                    ? state.editingId
                    : ('ROLE-' + roleName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30));

                let savedRole = null;
                if (isEdit) {
                    const { data, error } = await client
                        .from('roles')
                        .update({ role_name: roleName, description: desc })
                        .eq('id', roleId)
                        .select()
                        .single();
                    if (error) {
                        console.error('[RolesMaster] Update error:', error);
                        showToast(\`Failed to update role: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }
                    savedRole = data;
                } else {
                    const { data, error } = await client
                        .from('roles')
                        .insert({ id: roleId, role_name: roleName, description: desc, is_system: false })
                        .select()
                        .single();
                    if (error) {
                        console.error('[RolesMaster] Insert error:', error);
                        showToast(\`Failed to create role: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }
                    savedRole = data;
                }

                const permRows = Object.keys(matrix).map(modKey => ({
                    role_id: roleId,
                    module_key: modKey,
                    can_view: Boolean(matrix[modKey].view),
                    can_add: Boolean(matrix[modKey].add),
                    can_edit: Boolean(matrix[modKey].edit),
                    can_delete: Boolean(matrix[modKey].delete)
                }));

                if (permRows.length > 0) {
                    const { error: permErr } = await client
                        .from('role_permissions')
                        .upsert(permRows, { onConflict: 'role_id,module_key' });
                    if (permErr) {
                        console.warn('[RolesMaster] Permission upsert warning:', permErr);
                    }
                }

                const normalizedRole = {
                    id: roleId,
                    roleName: roleName,
                    desc: desc,
                    permissions: JSON.stringify(matrix),
                    isSystem: Boolean(savedRole?.is_system),
                    _isLive: true
                };

                if (!state.liveMasters.roles) state.liveMasters.roles = [];
                const rIdx = state.liveMasters.roles.findIndex(r => r.id === roleId);
                if (rIdx > -1) state.liveMasters.roles[rIdx] = normalizedRole;
                else state.liveMasters.roles.unshift(normalizedRole);

                if (!state.data.rolesMaster) state.data.rolesMaster = [];
                const dIdx = state.data.rolesMaster.findIndex(r => r.id === roleId);
                if (dIdx > -1) state.data.rolesMaster[dIdx] = normalizedRole;
                else state.data.rolesMaster.unshift(normalizedRole);

                logAudit('rolesMaster', isEdit ? 'Update' : 'Create', normalizedRole);
                closeModal();
                if (typeof populateUserSelector === 'function') populateUserSelector();
                if (state.currentModule === 'rolesMaster') {
                    renderTableModule('rolesMaster', document.getElementById('content-area'));
                }
                showToast(\`Role \${isEdit ? 'updated' : 'created'} and permissions persisted!\`, 'success');
            } catch (err) {
                console.error('[RolesMaster] Save exception:', err);
                showToast(\`Error saving role: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processSignatureMasterSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            if (typeof hasPerm === 'function' && !hasPerm('signatureMaster', 'edit') && !hasPerm('signatureMaster', 'add')) {
                showToast('Unauthorized: Permission required to manage signatures.', 'error');
                return;
            }

            const authName = document.getElementById('field_authName')?.value?.trim();
            if (!authName) {
                showToast('Authority Name is required.', 'error');
                return;
            }
            const signImage = document.getElementById('field_signImage')?.value || '';
            const isEdit = Boolean(state.editingId);
            const signId = isEdit ? state.editingId : generateId('SIGN');
            const plantId = state.currentCompany || null;

            try {
                let savedSig = null;
                if (isEdit) {
                    const { data, error } = await client
                        .from('signatures')
                        .update({ auth_name: authName, sign_image_url: signImage, plant_id: plantId })
                        .eq('id', signId)
                        .select()
                        .single();
                    if (error) {
                        console.error('[Signatures] Update failed:', error);
                        showToast(\`Failed to update signature: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }
                    savedSig = data;
                } else {
                    const { data, error } = await client
                        .from('signatures')
                        .insert({ id: signId, auth_name: authName, sign_image_url: signImage, plant_id: plantId, is_active: true })
                        .select()
                        .single();
                    if (error) {
                        console.error('[Signatures] Insert failed:', error);
                        showToast(\`Failed to create signature: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }
                    savedSig = data;
                }

                const normSig = normalizeLiveSignature(savedSig);
                if (!state.liveMasters.signatures) state.liveMasters.signatures = [];
                const idx = state.liveMasters.signatures.findIndex(s => s.id === signId);
                if (idx > -1) state.liveMasters.signatures[idx] = normSig;
                else state.liveMasters.signatures.unshift(normSig);

                if (!state.data.signatureMaster) state.data.signatureMaster = [];
                const dIdx = state.data.signatureMaster.findIndex(s => s.id === signId);
                if (dIdx > -1) state.data.signatureMaster[dIdx] = normSig;
                else state.data.signatureMaster.unshift(normSig);

                logAudit('signatureMaster', isEdit ? 'Update' : 'Create', normSig);
                closeModal();
                if (state.currentModule === 'signatureMaster') {
                    renderTableModule('signatureMaster', document.getElementById('content-area'));
                }
                showToast(\`Signature \${isEdit ? 'updated' : 'saved'} successfully!\`, 'success');
            } catch (err) {
                console.error('[Signatures] Save exception:', err);
                showToast(\`Error saving signature: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processTemplatesMasterSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            if (typeof hasPerm === 'function' && !hasPerm('templatesMaster', 'edit') && !hasPerm('templatesMaster', 'add')) {
                showToast('Unauthorized: Permission required to manage templates.', 'error');
                return;
            }

            const name = document.getElementById('field_name')?.value?.trim();
            const content = document.getElementById('field_content')?.value?.trim();
            const type = document.getElementById('field_type')?.value?.trim() || 'General';
            if (!name || !content) {
                showToast('Template Name and Details content are required.', 'error');
                return;
            }

            const isEdit = Boolean(state.editingId);
            const tmplId = isEdit ? state.editingId : generateId('TMP');
            const plantId = state.currentCompany || null;

            try {
                let savedTmpl = null;
                if (isEdit) {
                    const { data, error } = await client
                        .from('document_templates')
                        .update({ name: name, applicable_type: type, content: content, plant_id: plantId })
                        .eq('id', tmplId)
                        .select()
                        .single();
                    if (error) {
                        console.error('[Templates] Update failed:', error);
                        showToast(\`Failed to update template: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }
                    savedTmpl = data;
                } else {
                    const { data, error } = await client
                        .from('document_templates')
                        .insert({ id: tmplId, name: name, applicable_type: type, content: content, plant_id: plantId, is_active: true })
                        .select()
                        .single();
                    if (error) {
                        console.error('[Templates] Insert failed:', error);
                        showToast(\`Failed to create template: \${error.message || 'Database error'}\`, 'error');
                        return;
                    }
                    savedTmpl = data;
                }

                const normTmpl = normalizeLiveTemplate(savedTmpl);
                if (!state.liveMasters.templatesMaster) state.liveMasters.templatesMaster = [];
                const idx = state.liveMasters.templatesMaster.findIndex(t => t.id === tmplId);
                if (idx > -1) state.liveMasters.templatesMaster[idx] = normTmpl;
                else state.liveMasters.templatesMaster.unshift(normTmpl);

                if (!state.data.templatesMaster) state.data.templatesMaster = [];
                const dIdx = state.data.templatesMaster.findIndex(t => t.id === tmplId);
                if (dIdx > -1) state.data.templatesMaster[dIdx] = normTmpl;
                else state.data.templatesMaster.unshift(normTmpl);

                logAudit('templatesMaster', isEdit ? 'Update' : 'Create', normTmpl);
                closeModal();
                if (state.currentModule === 'templatesMaster') {
                    renderTableModule('templatesMaster', document.getElementById('content-area'));
                }
                showToast(\`Template \${isEdit ? 'updated' : 'saved'} successfully!\`, 'success');
            } catch (err) {
                console.error('[Templates] Save exception:', err);
                showToast(\`Error saving template: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processSystemSettingsSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            if (typeof hasPerm === 'function' && !hasPerm('systemSettings', 'edit')) {
                showToast('Unauthorized: Super-admin permissions required to modify system settings.', 'error');
                return;
            }

            try {
                const lat = document.getElementById('field_plantLat')?.value;
                const lng = document.getElementById('field_plantLng')?.value;
                const rad = document.getElementById('field_geofenceRadius')?.value;

                const payload = {
                    default_plant_lat: lat ? parseFloat(lat) : 21.2514,
                    default_plant_lng: lng ? parseFloat(lng) : 81.6296,
                    default_geofence_radius: rad ? parseInt(rad, 10) : 500
                };

                const { data: updatedSettings, error: sysErr } = await client
                    .from('system_settings')
                    .update(payload)
                    .eq('id', 'SET-1')
                    .select()
                    .single();

                if (sysErr) {
                    console.error('[SystemSettings] Update failed:', sysErr);
                    showToast(\`Failed to save system settings: \${sysErr.message || 'Database error'}\`, 'error');
                    return;
                }

                const normSettings = normalizeLiveSystemSettings(updatedSettings);
                state.liveMasters.systemSettings = [normSettings];
                state.data.systemSettings = [normSettings];

                logAudit('systemSettings', 'Update', normSettings);
                closeModal();
                if (state.currentModule === 'systemSettings') {
                    renderGlobalSettingsDashboard(document.getElementById('content-area'));
                }
                showToast('Global system settings saved successfully!', 'success');
            } catch (err) {
                console.error('[SystemSettings] Save exception:', err);
                showToast(\`Error saving system settings: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processUsersMasterSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEdit = Boolean(state.editingId);
            if (!isEdit) {
                showToast('User creation requires server-side identity provisioning (DEFERRED — SUPABASE AUTH ADMIN BOUNDARY). Direct password creation is not permitted on the client.', 'warning');
                return;
            }

            const status = document.getElementById('field_status')?.value || 'Active';
            const empId = document.getElementById('field_empId')?.value || null;
            const roleId = document.getElementById('field_roleId')?.value || null;
            const companyId = document.getElementById('field_companyId')?.value || null;

            try {
                const existingUser = (state.data.usersMaster || []).find(u => u.id === state.editingId);
                const targetProfileId = existingUser?.authUserId || existingUser?.id;

                const updatePayload = {
                    status: status,
                    emp_id: empId,
                    role_id: roleId,
                    default_plant_id: companyId
                };

                const { data: updatedProfile, error: profErr } = await client
                    .from('profiles')
                    .update(updatePayload)
                    .eq('id', targetProfileId)
                    .select()
                    .single();

                if (profErr) {
                    console.error('[UsersMaster] Profile update failed:', profErr);
                    showToast(\`Failed to update user profile: \${profErr.message || 'Database error'}\`, 'error');
                    return;
                }

                const normProf = normalizeLiveProfile(updatedProfile);
                if (!state.liveMasters.profiles) state.liveMasters.profiles = [];
                const idx = state.liveMasters.profiles.findIndex(p => p.id === normProf.id || p.authUserId === normProf.authUserId);
                if (idx > -1) state.liveMasters.profiles[idx] = normProf;

                if (!state.data.usersMaster) state.data.usersMaster = [];
                const dIdx = state.data.usersMaster.findIndex(u => u.id === normProf.id);
                if (dIdx > -1) state.data.usersMaster[dIdx] = normProf;

                logAudit('usersMaster', 'Update', normProf);
                closeModal();
                if (state.currentModule === 'usersMaster') {
                    renderTableModule('usersMaster', document.getElementById('content-area'));
                }
                showToast('User profile updated successfully!', 'success');
            } catch (err) {
                console.error('[UsersMaster] Profile update exception:', err);
                showToast(\`Error updating user profile: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processSignatureDelete(recordId) {
            if (!confirm(\`Are you sure you want to delete signature \${recordId}?\`)) return;
            if (state.authAuthorized !== true) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            try {
                const { error } = await client.from('signatures').delete().eq('id', recordId);
                if (error) {
                    console.error('[Signatures] Delete failed:', error);
                    showToast(\`Failed to delete signature: \${error.message || 'Database error'}\`, 'error');
                    return;
                }
                if (state.liveMasters.signatures) {
                    state.liveMasters.signatures = state.liveMasters.signatures.filter(s => s.id !== recordId);
                }
                if (state.data.signatureMaster) {
                    state.data.signatureMaster = state.data.signatureMaster.filter(s => s.id !== recordId);
                }
                logAudit('signatureMaster', 'Delete', { id: recordId });
                renderTableModule('signatureMaster', document.getElementById('content-area'));
                showToast('Signature deleted.', 'warning');
            } catch (err) {
                console.error('[Signatures] Delete exception:', err);
                showToast(\`Error deleting signature: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processTemplateDelete(recordId) {
            if (!confirm(\`Are you sure you want to delete template \${recordId}?\`)) return;
            if (state.authAuthorized !== true) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            try {
                const { error } = await client.from('document_templates').delete().eq('id', recordId);
                if (error) {
                    console.error('[Templates] Delete failed:', error);
                    showToast(\`Failed to delete template: \${error.message || 'Database error'}\`, 'error');
                    return;
                }
                if (state.liveMasters.templatesMaster) {
                    state.liveMasters.templatesMaster = state.liveMasters.templatesMaster.filter(t => t.id !== recordId);
                }
                if (state.data.templatesMaster) {
                    state.data.templatesMaster = state.data.templatesMaster.filter(t => t.id !== recordId);
                }
                logAudit('templatesMaster', 'Delete', { id: recordId });
                renderTableModule('templatesMaster', document.getElementById('content-area'));
                showToast('Template deleted.', 'warning');
            } catch (err) {
                console.error('[Templates] Delete exception:', err);
                showToast(\`Error deleting template: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        async function processRoleDelete(recordId) {
            if (['ROLE-ADMIN', 'ROLE-GUARD', 'ROLE-MANAGER'].includes(recordId)) {
                showToast('System roles cannot be deleted.', 'warning');
                return;
            }
            const role = (state.data.rolesMaster || []).find(r => r.id === recordId);
            if (role && role.isSystem) {
                showToast('System roles cannot be deleted.', 'warning');
                return;
            }
            if (!confirm(\`Are you sure you want to delete role \${recordId}?\`)) return;
            if (state.authAuthorized !== true) {
                showToast('Authentication required.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            try {
                const { error } = await client.from('roles').delete().eq('id', recordId);
                if (error) {
                    console.error('[Roles] Delete failed:', error);
                    showToast(\`Failed to delete role: \${error.message || 'Database error'}\`, 'error');
                    return;
                }
                if (state.liveMasters.roles) {
                    state.liveMasters.roles = state.liveMasters.roles.filter(r => r.id !== recordId);
                }
                if (state.data.rolesMaster) {
                    state.data.rolesMaster = state.data.rolesMaster.filter(r => r.id !== recordId);
                }
                logAudit('rolesMaster', 'Delete', { id: recordId });
                renderTableModule('rolesMaster', document.getElementById('content-area'));
                if (typeof populateUserSelector === 'function') populateUserSelector();
                showToast('Role deleted.', 'warning');
            } catch (err) {
                console.error('[Roles] Delete exception:', err);
                showToast(\`Error deleting role: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        // --- CORE SAVE RECORD ---
        function saveRecord() {`);

    if (!text.includes(coreSaveTarget)) {
        throw new Error('Could not find coreSaveTarget');
    }
    text = text.replace(coreSaveTarget, handlersChunk);

    // 6. SaveRecord dispatch
    const saveDispatchTarget = toCRLF(`            if (supportedMasters.includes(moduleKey)) {
                return processMasterSave(moduleKey);
            }`);

    const saveDispatchReplacement = toCRLF(`            if (supportedMasters.includes(moduleKey)) {
                return processMasterSave(moduleKey);
            }
            if (moduleKey === 'companyMaster') {
                return processCompanyMasterSave();
            }
            if (moduleKey === 'rolesMaster') {
                return processRolesMasterSave();
            }
            if (moduleKey === 'signatureMaster') {
                return processSignatureMasterSave();
            }
            if (moduleKey === 'templatesMaster') {
                return processTemplatesMasterSave();
            }
            if (moduleKey === 'systemSettings') {
                return processSystemSettingsSave();
            }
            if (moduleKey === 'usersMaster') {
                return processUsersMasterSave();
            }`);

    if (!text.includes(saveDispatchTarget)) {
        throw new Error('Could not find saveDispatchTarget');
    }
    text = text.replace(saveDispatchTarget, saveDispatchReplacement);

    // 7. DeleteRecord dispatch
    const deleteDispatchTarget = toCRLF(`            if (moduleKey === 'payrollLedger') {
                showToast('Payroll ledger entries are statutory records and cannot be deleted.', 'warning');
                return;
            }`);

    const deleteDispatchReplacement = toCRLF(`            if (moduleKey === 'payrollLedger') {
                showToast('Payroll ledger entries are statutory records and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'systemSettings') {
                showToast('Global system settings cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'companyMaster') {
                showToast('Plant facility deletion is restricted to preserve business audit and relational integrity.', 'warning');
                return;
            }
            if (moduleKey === 'auditLogs') {
                showToast('Audit log entries are immutable and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'usersMaster') {
                showToast('User account deletion requires Auth Admin provisioning (DEFERRED — SUPABASE AUTH ADMIN BOUNDARY).', 'warning');
                return;
            }
            if (moduleKey === 'signatureMaster') {
                return processSignatureDelete(recordId);
            }
            if (moduleKey === 'templatesMaster') {
                return processTemplateDelete(recordId);
            }
            if (moduleKey === 'rolesMaster') {
                return processRoleDelete(recordId);
            }`);

    if (!text.includes(deleteDispatchTarget)) {
        throw new Error('Could not find deleteDispatchTarget');
    }
    text = text.replace(deleteDispatchTarget, deleteDispatchReplacement);

    // 8. LogAudit live persistence (append-only, fail-safe, non-recursive)
    const logAuditTarget = toCRLF(`        function logAudit(moduleKey, action, recordData) { 
            const username = state.currentUser ? state.currentUser.username : 'System'; 
            
            let detailString = \`\${action} performed on record \${recordData.id || ''}\`;
            if (moduleKey === 'trips' && action === 'Create') detailString = \`New Trip \${recordData.id} added (\${recordData.vehicle || ''})\`;
            else if (moduleKey === 'trips' && action === 'Update') detailString = \`Trip \${recordData.id} updated (Status: \${recordData.status || ''})\`;
            else if (action === 'Create') detailString = \`Created new record \${recordData.id || ''}\`;
            else if (action === 'Update') detailString = \`Updated record \${recordData.id || ''}\`;
            else if (action === 'Delete') detailString = \`Deleted record \${recordData.id || ''}\`;

            state.data.auditLogs.unshift({ 
                id: generateId('AUD'), 
                timestamp: new Date().toLocaleString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'}), 
                userRole: username, 
                module: modulesConfig[moduleKey].title, 
                moduleKey: moduleKey,
                recordId: recordData.id,
                action: action, 
                details: detailString, 
                rawSnapshot: JSON.stringify(recordData),
                companyId: state.currentCompany 
            }); 
        }`);

    const logAuditReplacement = toCRLF(`        function logAudit(moduleKey, action, recordData) { 
            if (moduleKey === 'auditLogs' || moduleKey === 'audit_logs') return;
            const username = state.currentUser ? state.currentUser.username : 'System'; 
            
            let detailString = \`\${action} performed on record \${recordData?.id || ''}\`;
            if (moduleKey === 'trips' && action === 'Create') detailString = \`New Trip \${recordData.id} added (\${recordData.vehicle || ''})\`;
            else if (moduleKey === 'trips' && action === 'Update') detailString = \`Trip \${recordData.id} updated (Status: \${recordData.status || ''})\`;
            else if (action === 'Create') detailString = \`Created new record \${recordData?.id || ''}\`;
            else if (action === 'Update') detailString = \`Updated record \${recordData?.id || ''}\`;
            else if (action === 'Delete') detailString = \`Deleted record \${recordData?.id || ''}\`;

            const localAuditEntry = { 
                id: generateId('AUD'), 
                timestamp: new Date().toLocaleString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'}), 
                userRole: username, 
                module: modulesConfig[moduleKey]?.title || moduleKey, 
                moduleKey: moduleKey,
                recordId: recordData?.id || 'N/A',
                action: action, 
                details: detailString, 
                rawSnapshot: JSON.stringify(recordData || {}),
                companyId: state.currentCompany 
            };
            if (!state.data.auditLogs) state.data.auditLogs = [];
            state.data.auditLogs.unshift(localAuditEntry);

            // Live async persistence (append-only, fail-safe, non-recursive)
            if (state.authAuthorized === true && window.getSupabaseClient) {
                try {
                    const client = window.getSupabaseClient();
                    if (client) {
                        const authUser = state.stage1AuthUser || null;
                        const bizId = state.currentBusiness || (state.authorizedBusinesses?.[0]?.id) || null;
                        const plantId = state.currentCompany || (state.authorizedPlants?.[0]?.id) || null;
                        const payload = {
                            business_id: bizId,
                            plant_id: plantId,
                            "companyId": plantId,
                            user_id: authUser?.id || null,
                            user_email: authUser?.email || username,
                            action: (action || 'Action').toUpperCase(),
                            entity_type: moduleKey || 'system',
                            entity_id: String((recordData && recordData.id) || 'N/A'),
                            details: { description: detailString, actor: username, module: modulesConfig[moduleKey]?.title || moduleKey },
                            after_state: recordData || null
                        };
                        client.from('audit_logs').insert(payload).then(({ error }) => {
                            if (error) console.warn('[LiveAudit] insert error:', error);
                        }).catch(e => {
                            console.warn('[LiveAudit] network error:', e);
                        });
                    }
                } catch (auditErr) {
                    console.warn('[LiveAudit] unexpected error in audit logging:', auditErr);
                }
            }
        }`);

    if (!text.includes(logAuditTarget)) {
        throw new Error('Could not find logAuditTarget');
    }
    text = text.replace(logAuditTarget, logAuditReplacement);

    return text;
}

const originalPath = 'frontend/app.js';
const originalContent = fs.readFileSync(originalPath, 'utf8');
try {
    const patchedContent = applyWave12_1(originalContent);
    fs.writeFileSync(originalPath, patchedContent, 'utf8');
    console.log('Wave 12.1 applied successfully to frontend/app.js!');
} catch (err) {
    console.error('Failed to apply Wave 12.1:', err.message);
    process.exit(1);
}
