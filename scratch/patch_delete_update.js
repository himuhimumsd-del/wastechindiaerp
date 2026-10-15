const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

// 1. Patch deleteRecord to support real deletion for operational modules
const deleteTarget = `            if (moduleKey === 'trips') {
                showToast('Trip records are operational logistics records and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'gateVerification') {
                showToast('Gate security verification entries are permanent audit records and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'poReceived' || moduleKey === 'poIssued') {
                showToast('Purchase and sales orders are commercial legal contracts and cannot be deleted.', 'warning');
                return;
            }
            if (moduleKey === 'grn') {
                showToast('Goods Receipt Notes are statutory inventory receipts and cannot be deleted.', 'warning');
                return;
            }`;

const deleteReplacement = `            if (moduleKey === 'poReceived' || moduleKey === 'poIssued') {
                if (!confirm(\`Are you sure you want to delete PO \${recordId}?\`)) return;
                (async () => {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                    if (client) {
                        try {
                            const rec = ((state.data && state.data[moduleKey]) || []).find(r => r.id === recordId) ||
                                        ((state.liveMasters && state.liveMasters[moduleKey]) || []).find(r => r.id === recordId);
                            const dbId = rec?.dbId || (isUUID(recordId) ? recordId : null);
                            let delError;
                            if (dbId) {
                                const res = await client.from('orders').delete().eq('id', dbId);
                                delError = res.error;
                            } else {
                                const res = await client.from('orders').delete().eq('po_number', recordId);
                                delError = res.error;
                            }
                            if (delError) {
                                console.error('[Orders] Delete error:', delError);
                                showToast(\`Failed to delete PO: \${delError.message || 'Linked records exist'}\`, 'error');
                                return;
                            }
                        } catch (e) {
                            console.error('[Orders] Delete exception:', e);
                        }
                    }
                    if (state.data && state.data[moduleKey]) state.data[moduleKey] = state.data[moduleKey].filter(r => r.id !== recordId);
                    if (state.liveMasters && state.liveMasters[moduleKey]) state.liveMasters[moduleKey] = state.liveMasters[moduleKey].filter(r => r.id !== recordId);
                    if (typeof logAudit === 'function') logAudit(moduleKey, 'Delete', { id: recordId });
                    renderTableModule(moduleKey, document.getElementById('content-area'));
                    showToast(\`PO \${recordId} deleted successfully.\`, 'success');
                })();
                return;
            }
            if (moduleKey === 'trips') {
                if (!confirm(\`Are you sure you want to delete Trip \${recordId}?\`)) return;
                (async () => {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                    if (client) {
                        try {
                            const rec = ((state.data && state.data.trips) || []).find(r => r.id === recordId);
                            const dbId = rec?.dbId || (isUUID(recordId) ? recordId : null);
                            if (dbId) await client.from('trips').delete().eq('id', dbId);
                            else await client.from('trips').delete().eq('trip_number', recordId);
                        } catch (e) {
                            console.error('[Trips] Delete exception:', e);
                        }
                    }
                    if (state.data && state.data.trips) state.data.trips = state.data.trips.filter(r => r.id !== recordId);
                    if (state.liveMasters && state.liveMasters.trips) state.liveMasters.trips = state.liveMasters.trips.filter(r => r.id !== recordId);
                    renderTableModule('trips', document.getElementById('content-area'));
                    showToast(\`Trip \${recordId} deleted successfully.\`, 'success');
                })();
                return;
            }
            if (moduleKey === 'grn') {
                if (!confirm(\`Are you sure you want to delete GRN \${recordId}?\`)) return;
                (async () => {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                    if (client) {
                        try {
                            const rec = ((state.data && state.data.grn) || []).find(r => r.id === recordId);
                            const dbId = rec?.dbId || (isUUID(recordId) ? recordId : null);
                            if (dbId) {
                                await client.from('grn_items').delete().eq('grn_id', dbId);
                                await client.from('grn').delete().eq('id', dbId);
                            } else {
                                await client.from('grn').delete().eq('grn_number', recordId);
                            }
                        } catch (e) {
                            console.error('[GRN] Delete exception:', e);
                        }
                    }
                    if (state.data && state.data.grn) state.data.grn = state.data.grn.filter(r => r.id !== recordId);
                    if (state.liveMasters && state.liveMasters.grn) state.liveMasters.grn = state.liveMasters.grn.filter(r => r.id !== recordId);
                    renderTableModule('grn', document.getElementById('content-area'));
                    showToast(\`GRN \${recordId} deleted successfully.\`, 'success');
                })();
                return;
            }
            if (moduleKey === 'invoices') {
                if (!confirm(\`Are you sure you want to delete Invoice \${recordId}?\`)) return;
                (async () => {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
                    if (client) {
                        try {
                            const rec = (typeof getLiveInvoices === 'function' ? getLiveInvoices() : []).find(r => r.id === recordId || r.db_id === recordId);
                            const dbId = rec?.db_id || (isUUID(recordId) ? recordId : null);
                            if (dbId) await client.from('sales_invoices').delete().eq('id', dbId);
                            else await client.from('sales_invoices').delete().eq('invoice_number', recordId);
                        } catch (e) {
                            console.error('[Invoices] Delete exception:', e);
                        }
                    }
                    if (state.data && state.data.invoices) state.data.invoices = state.data.invoices.filter(r => r.id !== recordId);
                    if (state.liveMasters && state.liveMasters.invoices) state.liveMasters.invoices = state.liveMasters.invoices.filter(r => r.id !== recordId);
                    renderTableModule('invoices', document.getElementById('content-area'));
                    showToast(\`Invoice \${recordId} deleted successfully.\`, 'success');
                })();
                return;
            }`;

// 2. Patch processOrderSave update path to resolve liveDbId from DB if missing in memory
const updateTarget = `                const existingList = state.data[moduleKey] || [];
                const existingRecord = existingList.find(r => r.id === state.editingId || r.dbId === state.editingId || r.poNumber === state.editingId);

                const liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update order: No valid live database UUID found.', 'error');
                    return;
                }`;

const updateReplacement = `                const existingList = (state.data[moduleKey] || []).concat((state.liveMasters && state.liveMasters[moduleKey]) || []);
                const existingRecord = existingList.find(r => r.id === state.editingId || r.dbId === state.editingId || r.poNumber === state.editingId);

                let liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    try {
                        const { data: dbOrder } = await client.from('orders').select('id, plant_id').match({
                            business_id: businessId,
                            order_type: orderType,
                            po_number: state.editingId
                        }).maybeSingle();
                        if (dbOrder && dbOrder.id) {
                            liveDbId = dbOrder.id;
                        }
                    } catch (dbFindErr) {
                        console.warn('[Orders] DB lookup for update failed:', dbFindErr);
                    }
                }

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update order: No valid live database UUID found.', 'error');
                    return;
                }`;

const isCrlf = code.includes('\r\n');
const norm = str => isCrlf ? str.replace(/\n/g, '\r\n') : str.replace(/\r\n/g, '\n');

if (code.includes(norm(deleteTarget))) {
    code = code.replace(norm(deleteTarget), norm(deleteReplacement));
    console.log('1. Successfully patched deleteRecord for PO, Trips, GRN, and Invoices!');
} else {
    console.warn('1. deleteTarget not found in app.js');
}

if (code.includes(norm(updateTarget))) {
    code = code.replace(norm(updateTarget), norm(updateReplacement));
    console.log('2. Successfully patched update path in processOrderSave!');
} else {
    console.warn('2. updateTarget not found in app.js');
}

fs.writeFileSync('frontend/app.js', code, 'utf8');
console.log('Done patching frontend/app.js!');
