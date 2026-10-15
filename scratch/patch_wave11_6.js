const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add window exports
const windowExportTarget = "        window.processGrnSave = processGrnSave;\r\n";
const windowExportTargetLF = "        window.processGrnSave = processGrnSave;\n";
const windowExportReplacement = `        window.processGrnSave = processGrnSave;
        window.buildLiveSalesInvoicePayload = buildLiveSalesInvoicePayload;
        window.buildLiveVendorInvoicePayload = buildLiveVendorInvoicePayload;
        window.processSalesInvoiceSave = processSalesInvoiceSave;
        window.processVendorInvoiceSave = processVendorInvoiceSave;
`;

if (content.includes(windowExportTarget)) {
    content = content.replace(windowExportTarget, windowExportReplacement.replace(/\n/g, '\r\n'));
    console.log('✓ Applied window exports (CRLF)');
} else if (content.includes(windowExportTargetLF)) {
    content = content.replace(windowExportTargetLF, windowExportReplacement);
    console.log('✓ Applied window exports (LF)');
} else {
    throw new Error('Could not find windowExportTarget in app.js');
}

// 2. Add processSalesInvoiceSave and processVendorInvoiceSave after processGrnSave
const grnSaveEndTarget = `                showToast(\`GRN \${normalizedRow.grnNumber || normalizedRow.id} updated successfully!\`, 'success');
            }
        }`;

const grnSaveEndTargetCRLF = grnSaveEndTarget.replace(/\n/g, '\r\n');

const saveHandlers = `

        async function processSalesInvoiceSave() {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save Sales Invoice.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('invoices', 'add')) {
                showToast('Unauthorized: You do not have permission to add Sales Invoices.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('invoices', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit Sales Invoices.', 'error');
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
                showToast(\`Cannot persist Sales Invoice: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist Sales Invoice: no authorized plant found.', 'error');
                return;
            }

            // 4. Gather form values
            const invoiceNumberVal = (document.getElementById('field_id')?.value || '').trim();
            const clientVal = (document.getElementById('field_client')?.value || '').trim();
            const poRefVal = (document.getElementById('field_poRef')?.value || '').trim();
            const dateVal = document.getElementById('field_date')?.value || '';
            const createWithGrnVal = document.getElementById('field_createWithGrn')?.checked;
            const grnRefVal = (document.getElementById('field_grnRef')?.value || '').trim();
            const paymentTermsDaysVal = document.getElementById('field_paymentTermsDays')?.value || '30';
            const commentsVal = (document.getElementById('field_comments')?.value || '').trim();
            const totalQtyVal = document.getElementById('field_totalQty')?.value || '0';
            const amountVal = document.getElementById('field_amount')?.value || '0';
            const taxAmountVal = document.getElementById('field_taxAmount')?.value || '0';
            const totalAmountVal = document.getElementById('field_totalAmount')?.value || '0';
            const statusVal = document.getElementById('field_status')?.value || 'Proforma';

            const rawRecord = {
                id: invoiceNumberVal,
                invoice_number: invoiceNumberVal,
                client: clientVal,
                party: clientVal,
                poRef: poRefVal,
                po_ref: poRefVal,
                date: dateVal,
                invoice_date: dateVal,
                createWithGrn: Boolean(createWithGrnVal),
                grnRef: grnRefVal,
                paymentTermsDays: paymentTermsDaysVal,
                comments: commentsVal,
                notes: commentsVal,
                totalQty: totalQtyVal,
                amount: amountVal,
                taxable_amount: amountVal,
                taxAmount: taxAmountVal,
                totalAmount: totalAmountVal,
                total_amount: totalAmountVal,
                status: statusVal,
                plantId: authPlant.id,
                companyId: authPlant.id
            };

            let payload;
            try {
                payload = buildLiveSalesInvoicePayload(rawRecord);
            } catch (payloadErr) {
                showToast(payloadErr.message || 'Failed to construct sales invoice payload', 'error');
                return;
            }

            if (!isEditing) {
                // --- INSERT PATH ---
                try {
                    const { data, error } = await client
                        .from('sales_invoices')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[SalesInvoice] Insert failed:', error);
                        showToast(\`Failed to save Sales Invoice: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveInvoice(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved sales invoice row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters.invoices)) {
                        state.liveMasters.invoices.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.invoices)) {
                        state.data.invoices = [];
                    }
                    state.data.invoices.unshift(normalizedRow);

                    // Update GRN linking in local state
                    if (normalizedRow.grnRef) {
                        const newInvId = normalizedRow.invoice_number || normalizedRow.id;
                        (state.data.grn || []).forEach(g => {
                            if (g.id === normalizedRow.grnRef || g.grnNumber === normalizedRow.grnRef) {
                                g.invoiceId = newInvId;
                            }
                        });
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('invoices', 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'invoices') {
                        renderTableModule('invoices', document.getElementById('content-area'));
                    }
                    showToast(\`Sales Invoice \${normalizedRow.invoice_number || normalizedRow.id} saved successfully!\`, 'success');
                } catch (insertErr) {
                    console.error('[SalesInvoice] Insert exception:', insertErr);
                    showToast(\`Error saving Sales Invoice: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // --- UPDATE PATH ---
                const existingList = state.data.invoices || [];
                const existingRecord = existingList.find(r => r.id === state.editingId || r.db_id === state.editingId || r.uuid === state.editingId || r.invoice_number === state.editingId);
                const liveDbId = existingRecord?.db_id || existingRecord?.uuid || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update Sales Invoice: No valid live database UUID found.', 'error');
                    return;
                }

                const invoicePlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || authPlant.id;
                if (invoicePlant !== authPlant.id) {
                    showToast(\`Cannot edit invoice belonging to plant "\${invoicePlant}" while active on plant "\${authPlant.id}".\`, 'error');
                    return;
                }

                // If invoice is already Issued or Paid, statutory details are frozen by DB trigger
                const updatePayload = {
                    payment_terms_days: payload.payment_terms_days,
                    due_date: payload.due_date,
                    status: payload.status,
                    notes: payload.notes,
                    terms_conditions: payload.terms_conditions,
                    reverse_charge: payload.reverse_charge,
                    vehicle_no: payload.vehicle_no,
                    place_of_supply: payload.place_of_supply,
                    eway_bill_no: payload.eway_bill_no,
                    eway_bill_date: payload.eway_bill_date,
                    paid_amount: payload.paid_amount,
                    updated_by: payload.updated_by
                };

                // Only allow updating financial and statutory fields if current DB status is Draft
                const isDraft = !existingRecord.db_status || existingRecord.db_status === 'Draft' || existingRecord.status === 'Proforma';
                if (isDraft) {
                    updatePayload.invoice_date = payload.invoice_date;
                    updatePayload.party_id = payload.party_id;
                    updatePayload.order_id = payload.order_id;
                    updatePayload.po_ref = payload.po_ref;
                    updatePayload.grn_id = payload.grn_id;
                    updatePayload.grn_ref = payload.grn_ref;
                    updatePayload.items = payload.items;
                    updatePayload.taxable_amount = payload.taxable_amount;
                    updatePayload.cgst_amount = payload.cgst_amount;
                    updatePayload.sgst_amount = payload.sgst_amount;
                    updatePayload.igst_amount = payload.igst_amount;
                    updatePayload.round_off = payload.round_off;
                    updatePayload.total_amount = payload.total_amount;
                    updatePayload.balance_amount = payload.balance_amount;
                }

                try {
                    const { data, error } = await client
                        .from('sales_invoices')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[SalesInvoice] Update failed:', error);
                        showToast(\`Failed to update Sales Invoice: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveInvoice(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated sales invoice row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters.invoices)) {
                        const idx = state.liveMasters.invoices.findIndex(r => r.db_id === liveDbId || r.id === state.editingId || r.uuid === liveDbId);
                        if (idx > -1) state.liveMasters.invoices[idx] = normalizedRow;
                        else state.liveMasters.invoices.unshift(normalizedRow);
                    }
                    if (Array.isArray(state.data.invoices)) {
                        const idx = state.data.invoices.findIndex(r => r.db_id === liveDbId || r.id === state.editingId || r.uuid === liveDbId);
                        if (idx > -1) state.data.invoices[idx] = normalizedRow;
                        else state.data.invoices.unshift(normalizedRow);
                    }

                    // Update GRN linking in local state
                    const newInvId = normalizedRow.invoice_number || normalizedRow.id;
                    (state.data.grn || []).forEach(g => {
                        if (g.invoiceId === newInvId && g.id !== normalizedRow.grnRef) g.invoiceId = null;
                        if (g.id === normalizedRow.grnRef || g.grnNumber === normalizedRow.grnRef) g.invoiceId = newInvId;
                    });

                    if (typeof logAudit === 'function') {
                        logAudit('invoices', 'Update', normalizedRow);
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === 'invoices') {
                        renderTableModule('invoices', document.getElementById('content-area'));
                    }
                    showToast(\`Sales Invoice \${normalizedRow.invoice_number || normalizedRow.id} updated successfully!\`, 'success');
                } catch (updateErr) {
                    console.error('[SalesInvoice] Update exception:', updateErr);
                    showToast(\`Error updating Sales Invoice: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }

        async function processVendorInvoiceSave() {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save Vendor Invoice.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('receivedInvoice', 'add')) {
                showToast('Unauthorized: You do not have permission to add Received Invoices.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('receivedInvoice', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit Received Invoices.', 'error');
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
                showToast(\`Cannot persist Vendor Invoice: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist Vendor Invoice: no authorized plant found.', 'error');
                return;
            }

            // 4. Gather form values
            const invoiceNumberVal = (document.getElementById('field_id')?.value || '').trim();
            const vendorVal = (document.getElementById('field_vendor')?.value || '').trim();
            const poRefVal = (document.getElementById('field_poRef')?.value || '').trim();
            const dateVal = document.getElementById('field_date')?.value || '';
            const dueDateVal = document.getElementById('field_dueDate')?.value || '';
            const vendorInvoiceNumberVal = (document.getElementById('field_vendorInvoiceNumber')?.value || invoiceNumberVal).trim();
            const qtyVal = document.getElementById('field_qty')?.value || '0';
            const rateVal = document.getElementById('field_rate')?.value || '0';
            const amountVal = document.getElementById('field_amount')?.value || '0';
            const taxAmountVal = document.getElementById('field_taxAmount')?.value || '0';
            const totalAmountVal = document.getElementById('field_totalAmount')?.value || '0';
            const statusVal = document.getElementById('field_status')?.value || 'Pending';

            const rawRecord = {
                id: invoiceNumberVal,
                vendor_invoice_no: vendorInvoiceNumberVal,
                vendorInvoiceNumber: vendorInvoiceNumberVal,
                vendor: vendorVal,
                party: vendorVal,
                poRef: poRefVal,
                po_ref: poRefVal,
                date: dateVal,
                invoice_date: dateVal,
                dueDate: dueDateVal,
                due_date: dueDateVal,
                qty: qtyVal,
                rate: rateVal,
                amount: amountVal,
                taxable_amount: amountVal,
                taxAmount: taxAmountVal,
                totalAmount: totalAmountVal,
                total_amount: totalAmountVal,
                status: statusVal,
                plantId: authPlant.id,
                companyId: authPlant.id
            };

            let payload;
            try {
                payload = buildLiveVendorInvoicePayload(rawRecord);
            } catch (payloadErr) {
                showToast(payloadErr.message || 'Failed to construct vendor invoice payload', 'error');
                return;
            }

            if (!isEditing) {
                // --- INSERT PATH ---
                try {
                    const { data, error } = await client
                        .from('vendor_invoices')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[VendorInvoice] Insert failed:', error);
                        showToast(\`Failed to save Vendor Invoice: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveReceivedInvoice(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved vendor invoice row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters.receivedInvoice)) {
                        state.liveMasters.receivedInvoice.unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data.receivedInvoice)) {
                        state.data.receivedInvoice = [];
                    }
                    state.data.receivedInvoice.unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit('receivedInvoice', 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === 'receivedInvoice') {
                        renderTableModule('receivedInvoice', document.getElementById('content-area'));
                    }
                    showToast(\`Vendor Invoice \${normalizedRow.vendorInvoiceNumber || normalizedRow.id} saved successfully!\`, 'success');
                } catch (insertErr) {
                    console.error('[VendorInvoice] Insert exception:', insertErr);
                    showToast(\`Error saving Vendor Invoice: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // --- UPDATE PATH ---
                const existingList = state.data.receivedInvoice || [];
                const existingRecord = existingList.find(r => r.id === state.editingId || r.db_id === state.editingId || r.uuid === state.editingId || r.vendorInvoiceNumber === state.editingId || r.vendor_invoice_no === state.editingId);
                const liveDbId = existingRecord?.db_id || existingRecord?.uuid || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update Vendor Invoice: No valid live database UUID found.', 'error');
                    return;
                }

                const invoicePlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || authPlant.id;
                if (invoicePlant !== authPlant.id) {
                    showToast(\`Cannot edit vendor invoice belonging to plant "\${invoicePlant}" while active on plant "\${authPlant.id}".\`, 'error');
                    return;
                }

                const updatePayload = {
                    party_id: payload.party_id,
                    order_id: payload.order_id,
                    po_issued_ref: payload.po_issued_ref,
                    grn_id: payload.grn_id,
                    grn_ref: payload.grn_ref,
                    invoice_date: payload.invoice_date,
                    due_date: payload.due_date,
                    items: payload.items,
                    taxable_amount: payload.taxable_amount,
                    cgst_amount: payload.cgst_amount,
                    sgst_amount: payload.sgst_amount,
                    igst_amount: payload.igst_amount,
                    total_amount: payload.total_amount,
                    paid_amount: payload.paid_amount,
                    balance_amount: payload.balance_amount,
                    status: payload.status,
                    attachment_url: payload.attachment_url,
                    updated_by: payload.updated_by
                };

                try {
                    const { data, error } = await client
                        .from('vendor_invoices')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[VendorInvoice] Update failed:', error);
                        showToast(\`Failed to update Vendor Invoice: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveReceivedInvoice(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated vendor invoice row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters.receivedInvoice)) {
                        const idx = state.liveMasters.receivedInvoice.findIndex(r => r.db_id === liveDbId || r.id === state.editingId || r.uuid === liveDbId);
                        if (idx > -1) state.liveMasters.receivedInvoice[idx] = normalizedRow;
                        else state.liveMasters.receivedInvoice.unshift(normalizedRow);
                    }
                    if (Array.isArray(state.data.receivedInvoice)) {
                        const idx = state.data.receivedInvoice.findIndex(r => r.db_id === liveDbId || r.id === state.editingId || r.uuid === liveDbId);
                        if (idx > -1) state.data.receivedInvoice[idx] = normalizedRow;
                        else state.data.receivedInvoice.unshift(normalizedRow);
                    }

                    if (typeof logAudit === 'function') {
                        logAudit('receivedInvoice', 'Update', normalizedRow);
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === 'receivedInvoice') {
                        renderTableModule('receivedInvoice', document.getElementById('content-area'));
                    }
                    showToast(\`Vendor Invoice \${normalizedRow.vendorInvoiceNumber || normalizedRow.id} updated successfully!\`, 'success');
                } catch (updateErr) {
                    console.error('[VendorInvoice] Update exception:', updateErr);
                    showToast(\`Error updating Vendor Invoice: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }`;

if (content.includes(grnSaveEndTargetCRLF)) {
    content = content.replace(grnSaveEndTargetCRLF, grnSaveEndTargetCRLF + saveHandlers.replace(/\n/g, '\r\n'));
    console.log('✓ Added processSalesInvoiceSave & processVendorInvoiceSave (CRLF)');
} else if (content.includes(grnSaveEndTarget)) {
    content = content.replace(grnSaveEndTarget, grnSaveEndTarget + saveHandlers);
    console.log('✓ Added processSalesInvoiceSave & processVendorInvoiceSave (LF)');
} else {
    throw new Error('Could not find grnSaveEndTarget in app.js');
}

// 3. Dispatch in saveRecord()
const saveRecordDispatchTarget = `            if (moduleKey === 'grn') {
                return processGrnSave();
            }`;

const saveRecordDispatchReplacement = `            if (moduleKey === 'grn') {
                return processGrnSave();
            }
            if (moduleKey === 'invoices') {
                return processSalesInvoiceSave();
            }
            if (moduleKey === 'receivedInvoice') {
                return processVendorInvoiceSave();
            }`;

if (content.includes(saveRecordDispatchTarget.replace(/\n/g, '\r\n'))) {
    content = content.replace(saveRecordDispatchTarget.replace(/\n/g, '\r\n'), saveRecordDispatchReplacement.replace(/\n/g, '\r\n'));
    console.log('✓ Wired saveRecord dispatcher (CRLF)');
} else if (content.includes(saveRecordDispatchTarget)) {
    content = content.replace(saveRecordDispatchTarget, saveRecordDispatchReplacement);
    console.log('✓ Wired saveRecord dispatcher (LF)');
} else {
    throw new Error('Could not find saveRecordDispatchTarget in app.js');
}

// 4. Update deleteRecord() to protect against invoice deletion
const deleteRecordTarget = `        function deleteRecord(moduleKey, recordId) {
            if (moduleKey === 'consumableLogs') {
                showToast('Consumable movement logs are immutable audit records and cannot be deleted.', 'warning');
                return;
            }`;

const deleteRecordReplacement = `        function deleteRecord(moduleKey, recordId) {
            if (moduleKey === 'consumableLogs') {
                showToast('Consumable movement logs are immutable audit records and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'invoices') {
                showToast('Sales invoices are statutory financial documents and cannot be deleted once created.', 'warning');
                return;
            }
            if (moduleKey === 'receivedInvoice') {
                showToast('Vendor invoice deletion is restricted to protect purchase orders and GRN audit integrity.', 'warning');
                return;
            }`;

if (content.includes(deleteRecordTarget.replace(/\n/g, '\r\n'))) {
    content = content.replace(deleteRecordTarget.replace(/\n/g, '\r\n'), deleteRecordReplacement.replace(/\n/g, '\r\n'));
    console.log('✓ Updated deleteRecord protections (CRLF)');
} else if (content.includes(deleteRecordTarget)) {
    content = content.replace(deleteRecordTarget, deleteRecordReplacement);
    console.log('✓ Updated deleteRecord protections (LF)');
} else {
    throw new Error('Could not find deleteRecordTarget in app.js');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: frontend/app.js successfully patched for Wave 11.6!');
