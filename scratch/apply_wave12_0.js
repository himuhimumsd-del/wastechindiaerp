const fs = require('fs');

function toCRLF(str) {
    return str.replace(/\r?\n/g, '\r\n');
}

function applyWave12(content) {
    let text = content;

    // 1. State initialization: add poReceived, poIssued, grn, payrollSettings to liveMasters and liveMasterLoaded
    const stateTarget = toCRLF(`            liveMasters: { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [] },
            liveMasterLoaded: { items: false, shifts: false, employees: false, attendance: false, payrollLedger: false, machineLogs: false, consumableLogs: false, invoices: false, receivedInvoice: false, trips: false, gateVerification: false }`);

    const stateReplacement = toCRLF(`            liveMasters: { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [], poReceived: [], poIssued: [], grn: [], payrollSettings: [] },
            liveMasterLoaded: { items: false, shifts: false, employees: false, attendance: false, payrollLedger: false, machineLogs: false, consumableLogs: false, invoices: false, receivedInvoice: false, trips: false, gateVerification: false, poReceived: false, poIssued: false, grn: false, payrollSettings: false }`);

    if (!text.includes(stateTarget)) {
        throw new Error('Could not find stateTarget');
    }
    text = text.replace(stateTarget, stateReplacement);

    // 2. Window exports (around line 3960)
    const exportTarget = toCRLF(`        window.checkMasterDeletionDependencies = checkMasterDeletionDependencies;`);
    const exportReplacement = toCRLF(`        window.checkMasterDeletionDependencies = checkMasterDeletionDependencies;
        window.normalizeLivePayrollSettings = normalizeLivePayrollSettings;
        window.buildLivePayrollSettingsPayload = buildLivePayrollSettingsPayload;
        window.processPayrollSettingsSave = processPayrollSettingsSave;
        window.getLivePoReceived = getLivePoReceived;
        window.getLivePoIssued = getLivePoIssued;
        window.getLiveGrn = getLiveGrn;
        window.getLivePayrollSettings = getLivePayrollSettings;`);

    if (!text.includes(exportTarget)) {
        throw new Error('Could not find exportTarget');
    }
    text = text.replace(exportTarget, exportReplacement);

    // 3. calculateEmployeePayroll: read authoritative live settings and fail if unavailable
    const calcSalaryTarget = toCRLF(`        function calculateEmployeePayroll(empId, year, month, companyId) {
            const emp = getLiveEmployees().find(e => e.id === empId);
            const cfg = (state.data.payrollSettings && state.data.payrollSettings[0]) || {};
            const exceptions = [];

            if (!emp) return { empId, exceptions: ['Employee not found'], blocked: true };
            if (!state.data.payrollSettings || !state.data.payrollSettings.length) return { empId, exceptions: ['Payroll Statutory Settings not configured'], blocked: true };`);

    const calcSalaryReplacement = toCRLF(`        function calculateEmployeePayroll(empId, year, month, companyId) {
            const emp = getLiveEmployees().find(e => e.id === empId);
            const targetCompany = companyId || state.currentCompany;
            const cfg = typeof getLivePayrollSettings === 'function' ? getLivePayrollSettings(targetCompany) : (state.data.payrollSettings && state.data.payrollSettings[0]) || null;
            const exceptions = [];

            if (!emp) return { empId, exceptions: ['Employee not found'], blocked: true };
            if (!cfg || !cfg.workingDaysBasis) return { empId, exceptions: ['Authoritative live Payroll Statutory Settings not configured or unavailable'], blocked: true };`);

    if (!text.includes(calcSalaryTarget)) {
        throw new Error('Could not find calcSalaryTarget');
    }
    text = text.replace(calcSalaryTarget, calcSalaryReplacement);

    // 4. runPayrollGeneration: enforce live payroll settings authority
    const runPayrollTarget = toCRLF(`            if (!state.data.payrollSettings || !state.data.payrollSettings.length) {
                showToast('Please configure Payroll Statutory Settings first.', 'error');
                return;
            }`);

    const runPayrollReplacement = toCRLF(`            const liveCfg = typeof getLivePayrollSettings === 'function' ? getLivePayrollSettings(companyIdOverride || state.currentCompany) : null;
            if (!liveCfg || !liveCfg.workingDaysBasis) {
                showToast('Cannot generate payroll: Authoritative live Payroll Statutory Settings are unavailable. Stale mock fallback is blocked.', 'error');
                return;
            }`);

    if (!text.includes(runPayrollTarget)) {
        throw new Error('Could not find runPayrollTarget');
    }
    text = text.replace(runPayrollTarget, runPayrollReplacement);

    // 5. hydrateLiveMasterData unauth reset
    const unauthHydrateTarget = toCRLF(`            if (state.authAuthorized !== true) {
                state.liveMasters = { businesses: [], plants: [], units: [], poTypes: [], items: [], parties: [], vehicles: [], plantMachinery: [], consumables: [], shifts: [], employees: [], attendance: [], payrollLedger: [], machineLogs: [], consumableLogs: [], invoices: [], receivedInvoice: [], trips: [], gateVerification: [] };
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
                }
                return { success: false, error: 'Unauthorized' };
            }`);

    const unauthHydrateReplacement = toCRLF(`            if (state.authAuthorized !== true) {
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

    if (!text.includes(unauthHydrateTarget)) {
        throw new Error('Could not find unauthHydrateTarget');
    }
    text = text.replace(unauthHydrateTarget, unauthHydrateReplacement);

    // 6. In hydrateLiveMasterData: add Orders, GRN, Payroll Settings hydration right before liveMasters assignment
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
                    gateVerification: liveGateEntries
                };`);

    const hydrateAssignmentReplacement = toCRLF(`                // 19. Live Orders (public.orders - Split into poReceived and poIssued)
                const orderCols = 'id, order_type, po_number, po_date, due_date, po_type_id, po_type_name, business_id, plant_id, "companyId", party_id, delivery_location, contact_person, vendor_code, separate_consignor_consignee, item_id, item_description, item_qty, unit_id, item_rate, hsn_code, cgst_rate, sgst_rate, igst_rate, ugst_rate, total_qty, consumed_qty, balance_qty, payment_terms_days, terms_conditions, comments, attachment_url, status, financial_year, created_by, updated_by, created_at, updated_at';
                const ordersRes = await fetchLiveMaster(
                    'orders',
                    orderCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'po_date', ascending: false } }
                );

                let livePoReceived = [];
                let livePoIssued = [];
                if (!ordersRes.error && Array.isArray(ordersRes.data)) {
                    const verifiedOrders = ordersRes.data.filter(o =>
                        o.business_id && validBizIdSet.has(o.business_id) &&
                        (authPlantIds.includes(o.plant_id) || authPlantIds.includes(o['companyId']))
                    );
                    verifiedOrders.forEach(o => {
                        const norm = normalizeLiveOrder(o);
                        if (norm) {
                            if (o.order_type === 'received') livePoReceived.push(norm);
                            else if (o.order_type === 'issued') livePoIssued.push(norm);
                        }
                    });
                    state.data.poReceived = livePoReceived;
                    state.data.poIssued = livePoIssued;
                    if (state.liveMasterLoaded) {
                        state.liveMasterLoaded.poReceived = true;
                        state.liveMasterLoaded.poIssued = true;
                    }
                } else if (ordersRes.error) {
                    console.warn('[LiveMaster] Orders read error:', ordersRes.error);
                    if (state.liveMasterLoaded) {
                        state.liveMasterLoaded.poReceived = false;
                        state.liveMasterLoaded.poIssued = false;
                    }
                }

                // 20. Live GRN (public.grn & public.grn_items - Reconstructed with Child Items)
                const grnCols = 'id, grn_number, from_date, to_date, party_id, po_ref, order_id, condition, total_grn_weight, total_shortage, business_id, plant_id, "companyId", financial_year, created_by, updated_by, created_at, updated_at';
                const grnRes = await fetchLiveMaster(
                    'grn',
                    grnCols,
                    { in: { column: 'business_id', values: authBizIds }, order: { column: 'from_date', ascending: false } }
                );

                let liveGrn = [];
                if (!grnRes.error && Array.isArray(grnRes.data)) {
                    const verifiedGrns = grnRes.data.filter(g =>
                        g.business_id && validBizIdSet.has(g.business_id) &&
                        (authPlantIds.includes(g.plant_id) || authPlantIds.includes(g['companyId']))
                    );
                    const grnIds = verifiedGrns.map(g => g.id).filter(Boolean);
                    let itemsByGrnId = {};
                    if (grnIds.length > 0) {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                        if (client) {
                            const { data: itemRows, error: itemsErr } = await client
                                .from('grn_items')
                                .select('*')
                                .in('grn_id', grnIds);
                            if (!itemsErr && Array.isArray(itemRows)) {
                                itemRows.forEach(it => {
                                    const parentId = it.grn_id;
                                    if (!itemsByGrnId[parentId]) itemsByGrnId[parentId] = [];
                                    itemsByGrnId[parentId].push(it);
                                });
                            }
                        }
                    }
                    verifiedGrns.forEach(g => {
                        const norm = normalizeLiveGrn(g, itemsByGrnId[g.id] || []);
                        if (norm) liveGrn.push(norm);
                    });
                    state.data.grn = liveGrn;
                    if (state.liveMasterLoaded) {
                        state.liveMasterLoaded.grn = true;
                    }
                } else if (grnRes.error) {
                    console.warn('[LiveMaster] GRN read error:', grnRes.error);
                    if (state.liveMasterLoaded) {
                        state.liveMasterLoaded.grn = false;
                    }
                }

                // 21. Live Payroll Settings (public.payroll_settings - Statutory Configuration)
                const payrollSettingsCols = 'id, business_id, plant_id, working_days_basis, pf_employee_pct, pf_employer_pct, pf_eps_pct, pf_epf_pct, pf_wage_ceiling, pf_admin_pct, edli_pct, esi_employee_pct, esi_employer_pct, esi_wage_ceiling, ot_multiplier, pt_slabs, created_at, updated_at';
                const paysetRes = await fetchLiveMaster(
                    'payroll_settings',
                    payrollSettingsCols,
                    { in: { column: 'business_id', values: authBizIds } }
                );

                let livePayrollSettings = [];
                if (!paysetRes.error && Array.isArray(paysetRes.data)) {
                    const verifiedSettings = paysetRes.data.filter(s =>
                        s.business_id && validBizIdSet.has(s.business_id)
                    );
                    verifiedSettings.forEach(s => {
                        const norm = normalizeLivePayrollSettings(s);
                        if (norm) livePayrollSettings.push(norm);
                    });
                    state.liveMasters.payrollSettings = livePayrollSettings;
                    if (state.liveMasterLoaded) {
                        state.liveMasterLoaded.payrollSettings = true;
                    }
                    const activeSetting = typeof getLivePayrollSettings === 'function' ? getLivePayrollSettings(state.currentCompany) : null;
                    if (activeSetting) {
                        state.data.payrollSettings = [activeSetting];
                    } else {
                        state.data.payrollSettings = [];
                    }
                } else if (paysetRes.error) {
                    console.warn('[LiveMaster] Payroll settings read error:', paysetRes.error);
                    if (state.liveMasterLoaded) {
                        state.liveMasterLoaded.payrollSettings = false;
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
                    payrollSettings: livePayrollSettings
                };`);

    if (!text.includes(hydrateAssignmentTarget)) {
        throw new Error('Could not find hydrateAssignmentTarget');
    }
    text = text.replace(hydrateAssignmentTarget, hydrateAssignmentReplacement);

    // 7. Add helper getters and save processor right before // --- CORE SAVE RECORD ---
    const helpersTarget = toCRLF(`        // --- CORE SAVE RECORD ---`);

    const helpersReplacement = toCRLF(`        // =========================================================================
        // WAVE 12.0: CORE OPERATIONAL & FINANCIAL COMPLETION HELPERS
        // Orders/PO, GRN, and Payroll Statutory Settings Live Integration
        // =========================================================================

        function getLivePoReceived() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.poReceived) {
                return state.liveMasters.poReceived || [];
            }
            return state.data.poReceived || [];
        }

        function getLivePoIssued() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.poIssued) {
                return state.liveMasters.poIssued || [];
            }
            return state.data.poIssued || [];
        }

        function getLiveGrn() {
            if (state.liveMasterLoaded && state.liveMasterLoaded.grn) {
                return state.liveMasters.grn || [];
            }
            return state.data.grn || [];
        }

        function normalizeLivePayrollSettings(row) {
            if (!row || typeof row !== 'object') return null;
            return {
                id: row.id || 'PAYSET-1',
                db_id: row.id,
                businessId: row.business_id || null,
                business_id: row.business_id || null,
                plantId: row.plant_id || null,
                plant_id: row.plant_id || null,
                companyId: row.plant_id || null,
                workingDaysBasis: row.working_days_basis || 'Actual Days in Month',
                working_days_basis: row.working_days_basis || 'Actual Days in Month',
                pfEmployeePct: row.pf_employee_pct != null ? String(row.pf_employee_pct) : '12',
                pf_employee_pct: Number(row.pf_employee_pct) || 12,
                pfEmployerPct: row.pf_employer_pct != null ? String(row.pf_employer_pct) : '12',
                pf_employer_pct: Number(row.pf_employer_pct) || 12,
                pfEpsPct: row.pf_eps_pct != null ? String(row.pf_eps_pct) : '8.33',
                pf_eps_pct: Number(row.pf_eps_pct) || 8.33,
                pfEpfPct: row.pf_epf_pct != null ? String(row.pf_epf_pct) : '3.67',
                pf_epf_pct: Number(row.pf_epf_pct) || 3.67,
                pfWageCeiling: row.pf_wage_ceiling != null ? String(row.pf_wage_ceiling) : '15000',
                pf_wage_ceiling: Number(row.pf_wage_ceiling) || 15000,
                pfAdminPct: row.pf_admin_pct != null ? String(row.pf_admin_pct) : '0.5',
                pf_admin_pct: Number(row.pf_admin_pct) || 0.5,
                edliPct: row.edli_pct != null ? String(row.edli_pct) : '0.5',
                edli_pct: Number(row.edli_pct) || 0.5,
                esiEmployeePct: row.esi_employee_pct != null ? String(row.esi_employee_pct) : '0.75',
                esi_employee_pct: Number(row.esi_employee_pct) || 0.75,
                esiEmployerPct: row.esi_employer_pct != null ? String(row.esi_employer_pct) : '3.25',
                esi_employer_pct: Number(row.esi_employer_pct) || 3.25,
                esiWageCeiling: row.esi_wage_ceiling != null ? String(row.esi_wage_ceiling) : '21000',
                esi_wage_ceiling: Number(row.esi_wage_ceiling) || 21000,
                otMultiplier: row.ot_multiplier != null ? String(row.ot_multiplier) : '1.0',
                ot_multiplier: Number(row.ot_multiplier) || 1.0,
                ptSlabs: Array.isArray(row.pt_slabs) ? row.pt_slabs : (typeof row.pt_slabs === 'string' ? JSON.parse(row.pt_slabs) : []),
                pt_slabs: Array.isArray(row.pt_slabs) ? row.pt_slabs : (typeof row.pt_slabs === 'string' ? JSON.parse(row.pt_slabs) : []),
                createdAt: row.created_at || '',
                updatedAt: row.updated_at || '',
                _isLive: true
            };
        }

        function getLivePayrollSettings(plantId) {
            const list = (state.liveMasters && state.liveMasters.payrollSettings) || [];
            if (!list.length) {
                if (state.liveMasterLoaded && state.liveMasterLoaded.payrollSettings) {
                    return null;
                }
                const existing = (state.data.payrollSettings && state.data.payrollSettings[0]);
                if (existing && existing._isLive) return existing;
                return null;
            }
            const targetPlant = plantId || state.currentCompany;
            const plantSetting = list.find(s => s.plant_id === targetPlant || s.plantId === targetPlant || s.companyId === targetPlant);
            if (plantSetting) return plantSetting;
            const globalSetting = list.find(s => !s.plant_id && !s.plantId);
            if (globalSetting) return globalSetting;
            return list[0] || null;
        }

        function buildLivePayrollSettingsPayload(record) {
            const authBiz = (typeof getCurrentAuthorizedBusiness === 'function' ? getCurrentAuthorizedBusiness() : null) || state.currentBusiness;
            const authPlant = (typeof getCurrentAuthorizedPlant === 'function' ? getCurrentAuthorizedPlant() : null) || state.currentCompany;
            const bizId = typeof authBiz === 'object' && authBiz ? authBiz.id : authBiz;
            const plantId = typeof authPlant === 'object' && authPlant ? authPlant.id : authPlant;

            if (!bizId) throw new Error('Cannot save payroll settings: active business authorization missing.');

            const ptSlabs = Array.from(document.querySelectorAll('.ptslab-row')).map(row => ({
                from: parseFloat(row.querySelector('.ptslab-from')?.value) || 0,
                to: row.querySelector('.ptslab-to')?.value ? parseFloat(row.querySelector('.ptslab-to')?.value) : null,
                amount: parseFloat(row.querySelector('.ptslab-amount')?.value) || 0
            })).filter(s => s.amount >= 0);

            const payload = {
                working_days_basis: document.getElementById('field_workingDaysBasis')?.value || record.workingDaysBasis || 'Actual Days in Month',
                pf_employee_pct: parseFloat(document.getElementById('field_pfEmployeePct')?.value ?? record.pfEmployeePct ?? 12),
                pf_employer_pct: parseFloat(document.getElementById('field_pfEmployerPct')?.value ?? record.pfEmployerPct ?? 12),
                pf_eps_pct: parseFloat(document.getElementById('field_pfEpsPct')?.value ?? record.pfEpsPct ?? 8.33),
                pf_epf_pct: parseFloat(document.getElementById('field_pfEpfPct')?.value ?? record.pfEpfPct ?? 3.67),
                pf_wage_ceiling: parseFloat(document.getElementById('field_pfWageCeiling')?.value ?? record.pfWageCeiling ?? 15000),
                pf_admin_pct: parseFloat(document.getElementById('field_pfAdminPct')?.value ?? record.pfAdminPct ?? 0.5),
                edli_pct: parseFloat(document.getElementById('field_edliPct')?.value ?? record.edliPct ?? 0.5),
                esi_employee_pct: parseFloat(document.getElementById('field_esiEmployeePct')?.value ?? record.esiEmployeePct ?? 0.75),
                esi_employer_pct: parseFloat(document.getElementById('field_esiEmployerPct')?.value ?? record.esiEmployerPct ?? 3.25),
                esi_wage_ceiling: parseFloat(document.getElementById('field_esiWageCeiling')?.value ?? record.esiWageCeiling ?? 21000),
                ot_multiplier: parseFloat(document.getElementById('field_otMultiplier')?.value ?? record.otMultiplier ?? 1.0),
                pt_slabs: ptSlabs.length ? ptSlabs : (record.ptSlabs || []),
                business_id: bizId,
                plant_id: plantId || null
            };

            return payload;
        }

        async function processPayrollSettingsSave() {
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save payroll settings.', 'error');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }
            if (typeof hasPerm === 'function' && !hasPerm('payrollSettings', 'edit') && !hasPerm('payrollSettings', 'add')) {
                showToast('Unauthorized: You do not have permission to modify payroll settings.', 'error');
                return;
            }

            try {
                const payload = buildLivePayrollSettingsPayload({});
                const currentPlant = payload.plant_id;

                const existingList = (state.liveMasters && state.liveMasters.payrollSettings) || [];
                const existingSetting = existingList.find(s => s.plant_id === currentPlant || (!s.plant_id && !currentPlant));
                const liveId = existingSetting?.id;

                let data, error;
                if (liveId) {
                    const res = await client
                        .from('payroll_settings')
                        .update(payload)
                        .eq('id', liveId)
                        .select()
                        .single();
                    data = res.data;
                    error = res.error;
                } else {
                    payload.id = 'PAYSET-' + (currentPlant ? currentPlant.replace(/[^A-Za-z0-9]/g, '') : 'GLOBAL');
                    const res = await client
                        .from('payroll_settings')
                        .insert(payload)
                        .select()
                        .single();
                    data = res.data;
                    error = res.error;
                }

                if (error) {
                    console.error('[PayrollSettings] Save failed:', error);
                    showToast(\`Failed to save payroll settings: \${error.message || 'Database error'}\`, 'error');
                    return;
                }

                const normalizedRow = normalizeLivePayrollSettings(data);
                if (!state.liveMasters.payrollSettings) state.liveMasters.payrollSettings = [];
                const idx = state.liveMasters.payrollSettings.findIndex(s => s.id === normalizedRow.id);
                if (idx > -1) state.liveMasters.payrollSettings[idx] = normalizedRow;
                else state.liveMasters.payrollSettings.unshift(normalizedRow);

                state.data.payrollSettings = [normalizedRow];
                if (state.liveMasterLoaded) {
                    state.liveMasterLoaded.payrollSettings = true;
                }

                if (typeof logAudit === 'function') {
                    logAudit('payrollSettings', liveId ? 'Update' : 'Create', normalizedRow);
                }

                closeModal();
                if (state.currentModule === 'payrollSettings') {
                    renderTableModule('payrollSettings', document.getElementById('content-area'));
                }
                showToast('Payroll Statutory Settings saved successfully!', 'success');
            } catch (err) {
                console.error('[PayrollSettings] Save exception:', err);
                showToast(\`Error saving payroll settings: \${err.message || 'Unexpected error'}\`, 'error');
            }
        }

        // --- CORE SAVE RECORD ---`);

    if (!text.includes(helpersTarget)) {
        throw new Error('Could not find helpersTarget');
    }
    text = text.replace(helpersTarget, helpersReplacement);

    // 7b. Route saveRecord for payrollSettings
    const saveRouteTarget = toCRLF(`            if (moduleKey === 'payrollLedger') {
                return processPayrollLedgerSave();
            }
            const supportedMasters = [`);

    const saveRouteReplacement = toCRLF(`            if (moduleKey === 'payrollLedger') {
                return processPayrollLedgerSave();
            }
            if (moduleKey === 'payrollSettings') {
                return processPayrollSettingsSave();
            }
            const supportedMasters = [`);

    if (!text.includes(saveRouteTarget)) {
        throw new Error('Could not find saveRouteTarget');
    }
    text = text.replace(saveRouteTarget, saveRouteReplacement);

    // 8. Report updates: plantPerformance
    const plantPerfTarget = toCRLF(`                const openPoR = state.data.poReceived.filter(p => plantIds.includes(p.companyId) && p.status === 'Open');
                const openPoI = state.data.poIssued.filter(p => plantIds.includes(p.companyId) && p.status === 'Open');
                const grns = state.data.grn.filter(g => plantIds.includes(g.companyId) && inDateRange(g.fromDate, from, to));`);

    const plantPerfReplacement = toCRLF(`                const openPoR = (typeof getLivePoReceived === 'function' ? getLivePoReceived() : state.data.poReceived).filter(p => plantIds.includes(p.companyId) && p.status === 'Open');
                const openPoI = (typeof getLivePoIssued === 'function' ? getLivePoIssued() : state.data.poIssued).filter(p => plantIds.includes(p.companyId) && p.status === 'Open');
                const grns = (typeof getLiveGrn === 'function' ? getLiveGrn() : state.data.grn).filter(g => plantIds.includes(g.companyId) && inDateRange(g.fromDate, from, to));`);

    if (!text.includes(plantPerfTarget)) {
        throw new Error('Could not find plantPerfTarget');
    }
    text = text.replace(plantPerfTarget, plantPerfReplacement);

    // 9. Report updates: grnReport
    const grnRepTarget = toCRLF(`                    \${reportFilterField({ key: 'client', label: 'Client', options: state.data.partiesMaster.filter(p => (Array.isArray(p.type) ? p.type.includes('Client') : p.type === 'Client')).map(p => ({ value: p.name, label: p.name })) })}
                    \${reportFilterField({ key: 'po', label: 'PO', options: state.data.poReceived.map(p => ({ value: p.id, label: p.id })) })}
                    \${reportFilterField({ key: 'condition', label: 'Condition', options: ['Good', 'Damaged', 'Partial'].map(s => ({ value: s, label: s })) })}
                </div>\${reportActionBar('grnReport')}\`;

                const from = rf('from'), to = rf('to'), plant = rf('plant'), client = rf('client'), po = rf('po'), condition = rf('condition');
                const plantIds = plant ? [plant] : getAccessiblePlants().map(p => p.id);
                let grns = state.data.grn.filter(g => plantIds.includes(g.companyId) && inDateRange(g.fromDate, from, to));`);

    const grnRepReplacement = toCRLF(`                    \${reportFilterField({ key: 'client', label: 'Client', options: (typeof getLiveParties === 'function' ? getLiveParties() : state.data.partiesMaster).filter(p => (Array.isArray(p.type) ? p.type.includes('Client') : p.type === 'Client')).map(p => ({ value: p.name, label: p.name })) })}
                    \${reportFilterField({ key: 'po', label: 'PO', options: (typeof getLivePoReceived === 'function' ? getLivePoReceived() : state.data.poReceived).map(p => ({ value: p.id, label: p.id })) })}
                    \${reportFilterField({ key: 'condition', label: 'Condition', options: ['Good', 'Damaged', 'Partial'].map(s => ({ value: s, label: s })) })}
                </div>\${reportActionBar('grnReport')}\`;

                const from = rf('from'), to = rf('to'), plant = rf('plant'), client = rf('client'), po = rf('po'), condition = rf('condition');
                const plantIds = plant ? [plant] : getAccessiblePlants().map(p => p.id);
                let grns = (typeof getLiveGrn === 'function' ? getLiveGrn() : state.data.grn).filter(g => plantIds.includes(g.companyId) && inDateRange(g.fromDate, from, to));`);

    if (!text.includes(grnRepTarget)) {
        throw new Error('Could not find grnRepTarget');
    }
    text = text.replace(grnRepTarget, grnRepReplacement);

    // 10. Report updates: poReceivedFulfilment
    const poRecRepTarget = toCRLF(`                    \${reportFilterField({ key: 'customer', label: 'Customer', options: state.data.partiesMaster.filter(p => (Array.isArray(p.type) ? p.type.includes('Client') : p.type === 'Client')).map(p => ({ value: p.name, label: p.name })) })}
                    \${reportFilterField({ key: 'status', label: 'Status', options: ['Open', 'Overdue', 'Exhausted/Closed'].map(s => ({ value: s, label: s })) })}
                    \${reportFilterField({ key: 'item', label: 'Item', options: state.data.itemMaster.map(i => ({ value: i.name, label: i.name })) })}
                </div>\${reportActionBar('poReceivedFulfilment')}\`;

                const from = rf('from'), to = rf('to'), plant = rf('plant'), customer = rf('customer'), status = rf('status'), item = rf('item');
                const plantIds = plant ? [plant] : getAccessiblePlants().map(p => p.id);
                let pos = state.data.poReceived.filter(p => plantIds.includes(p.companyId) && inDateRange(p.date, from, to));`);

    const poRecRepReplacement = toCRLF(`                    \${reportFilterField({ key: 'customer', label: 'Customer', options: (typeof getLiveParties === 'function' ? getLiveParties() : state.data.partiesMaster).filter(p => (Array.isArray(p.type) ? p.type.includes('Client') : p.type === 'Client')).map(p => ({ value: p.name, label: p.name })) })}
                    \${reportFilterField({ key: 'status', label: 'Status', options: ['Open', 'Overdue', 'Exhausted/Closed'].map(s => ({ value: s, label: s })) })}
                    \${reportFilterField({ key: 'item', label: 'Item', options: (typeof getLiveItems === 'function' ? getLiveItems() : state.data.itemMaster).map(i => ({ value: i.name, label: i.name })) })}
                </div>\${reportActionBar('poReceivedFulfilment')}\`;

                const from = rf('from'), to = rf('to'), plant = rf('plant'), customer = rf('customer'), status = rf('status'), item = rf('item');
                const plantIds = plant ? [plant] : getAccessiblePlants().map(p => p.id);
                let pos = (typeof getLivePoReceived === 'function' ? getLivePoReceived() : state.data.poReceived).filter(p => plantIds.includes(p.companyId) && inDateRange(p.date, from, to));`);

    if (!text.includes(poRecRepTarget)) {
        throw new Error('Could not find poRecRepTarget');
    }
    text = text.replace(poRecRepTarget, poRecRepReplacement);

    // 11. Report updates: poIssuedCommitment
    const poIssRepTarget = toCRLF(`                    \${reportFilterField({ key: 'vendor', label: 'Vendor', options: state.data.partiesMaster.filter(p => (Array.isArray(p.type) ? (p.type.includes('Vendor') || p.type.includes('Supplier')) : (p.type === 'Vendor' || p.type === 'Supplier'))).map(p => ({ value: p.name, label: p.name })) })}
                    \${reportFilterField({ key: 'status', label: 'Status', options: ['Open', 'Overdue', 'Exhausted/Closed'].map(s => ({ value: s, label: s })) })}
                    \${reportFilterField({ key: 'item', label: 'Item', options: state.data.itemMaster.map(i => ({ value: i.name, label: i.name })) })}
                </div>\${reportActionBar('poIssuedCommitment')}\`;

                const from = rf('from'), to = rf('to'), plant = rf('plant'), vendor = rf('vendor'), status = rf('status'), item = rf('item');
                const plantIds = plant ? [plant] : getAccessiblePlants().map(p => p.id);
                let pos = state.data.poIssued.filter(p => plantIds.includes(p.companyId) && inDateRange(p.date, from, to));`);

    const poIssRepReplacement = toCRLF(`                    \${reportFilterField({ key: 'vendor', label: 'Vendor', options: (typeof getLiveParties === 'function' ? getLiveParties() : state.data.partiesMaster).filter(p => (Array.isArray(p.type) ? (p.type.includes('Vendor') || p.type.includes('Supplier')) : (p.type === 'Vendor' || p.type === 'Supplier'))).map(p => ({ value: p.name, label: p.name })) })}
                    \${reportFilterField({ key: 'status', label: 'Status', options: ['Open', 'Overdue', 'Exhausted/Closed'].map(s => ({ value: s, label: s })) })}
                    \${reportFilterField({ key: 'item', label: 'Item', options: (typeof getLiveItems === 'function' ? getLiveItems() : state.data.itemMaster).map(i => ({ value: i.name, label: i.name })) })}
                </div>\${reportActionBar('poIssuedCommitment')}\`;

                const from = rf('from'), to = rf('to'), plant = rf('plant'), vendor = rf('vendor'), status = rf('status'), item = rf('item');
                const plantIds = plant ? [plant] : getAccessiblePlants().map(p => p.id);
                let pos = (typeof getLivePoIssued === 'function' ? getLivePoIssued() : state.data.poIssued).filter(p => plantIds.includes(p.companyId) && inDateRange(p.date, from, to));`);

    if (!text.includes(poIssRepTarget)) {
        throw new Error('Could not find poIssRepTarget');
    }
    text = text.replace(poIssRepTarget, poIssRepReplacement);

    // 12. Report updates: materialMovement
    const matMoveTarget = toCRLF(`                    \${reportFilterField({ key: 'item', label: 'Item', options: state.data.itemMaster.map(i => ({ value: i.name, label: i.name })) })}`);
    const matMoveReplacement = toCRLF(`                    \${reportFilterField({ key: 'item', label: 'Item', options: (typeof getLiveItems === 'function' ? getLiveItems() : state.data.itemMaster).map(i => ({ value: i.name, label: i.name })) })}`);

    if (!text.includes(matMoveTarget)) {
        throw new Error('Could not find matMoveTarget');
    }
    text = text.replace(matMoveTarget, matMoveReplacement);

    return text;
}

const inputPath = 'frontend/app.js';
const original = fs.readFileSync(inputPath, 'utf8');
const modified = applyWave12(original);
fs.writeFileSync(inputPath, modified, 'utf8');
console.log('Successfully applied Wave 12.0 modifications to frontend/app.js!');
