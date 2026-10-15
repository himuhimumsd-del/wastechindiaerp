const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

const target = `                    if (error) {
                        // Auto-delete old record and re-insert if already exists (409 Conflict)
                        if (error.code === '23505' || String(error.message).includes('unique constraint') || String(error.details).includes('already exists')) {
                            console.warn('[Orders] Conflict detected. Deleting old order and inserting new one...');
                            await client.from('orders').delete().match({
                                business_id: payload.business_id,
                                order_type: payload.order_type,
                                po_number: payload.po_number
                            });
                            const retryRes = await client.from('orders').insert(payload).select().single();
                            if (!retryRes.error && retryRes.data) {
                                const normalizedRow = normalizeLiveOrder(retryRes.data);
                                if (normalizedRow) {
                                    if (state.liveMasters && Array.isArray(state.liveMasters[moduleKey])) {
                                        const idx = state.liveMasters[moduleKey].findIndex(r => r.id === normalizedRow.id);
                                        if (idx > -1) state.liveMasters[moduleKey].splice(idx, 1);
                                        state.liveMasters[moduleKey].unshift(normalizedRow);
                                    }
                                    if (state.data && Array.isArray(state.data[moduleKey])) {
                                        const dIdx = state.data[moduleKey].findIndex(r => r.id === normalizedRow.id);
                                        if (dIdx > -1) state.data[moduleKey].splice(dIdx, 1);
                                        state.data[moduleKey].unshift(normalizedRow);
                                    }
                                    showToast(\`\${moduleKey === 'poReceived' ? 'PO Received' : 'PO Issued'} saved (old record replaced)!\`);
                                    closeModal();
                                    renderTable(moduleKey);
                                    return;
                                }
                            }
                        }
                        console.error('[Orders] Insert failed:', error);
                        showToast(\`Failed to save \${moduleKey === 'poReceived' ? 'PO Received' : 'PO Issued'}: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }`;

const replacement = `                    if (error) {
                        // Smart in-place update if already exists (409 Conflict)
                        if (error.code === '23505' || String(error.message).includes('unique constraint') || String(error.details).includes('already exists')) {
                            console.warn('[Orders] Conflict detected. Updating existing order in-place...');
                            const updateRes = await client.from('orders').update(payload).match({
                                business_id: payload.business_id,
                                order_type: payload.order_type,
                                po_number: payload.po_number
                            }).select().single();

                            if (!updateRes.error && updateRes.data) {
                                const normalizedRow = normalizeLiveOrder(updateRes.data);
                                if (normalizedRow) {
                                    if (state.liveMasters && Array.isArray(state.liveMasters[moduleKey])) {
                                        const idx = state.liveMasters[moduleKey].findIndex(r => r.id === normalizedRow.id);
                                        if (idx > -1) state.liveMasters[moduleKey][idx] = normalizedRow;
                                        else state.liveMasters[moduleKey].unshift(normalizedRow);
                                    }
                                    if (state.data && Array.isArray(state.data[moduleKey])) {
                                        const dIdx = state.data[moduleKey].findIndex(r => r.id === normalizedRow.id);
                                        if (dIdx > -1) state.data[moduleKey][dIdx] = normalizedRow;
                                        else state.data[moduleKey].unshift(normalizedRow);
                                    }
                                    showToast(\`\${moduleKey === 'poReceived' ? 'PO Received' : 'PO Issued'} updated successfully!\`);
                                    closeModal();
                                    renderTable(moduleKey);
                                    return;
                                }
                            }
                        }
                        console.error('[Orders] Insert failed:', error);
                        showToast(\`Failed to save \${moduleKey === 'poReceived' ? 'PO Received' : 'PO Issued'}: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }`;

const isCrlf = code.includes('\r\n');
const normalizedTarget = isCrlf ? target.replace(/\n/g, '\r\n') : target.replace(/\r\n/g, '\n');
const normalizedReplacement = isCrlf ? replacement.replace(/\n/g, '\r\n') : replacement.replace(/\r\n/g, '\n');

if (code.includes(normalizedTarget)) {
    code = code.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync('frontend/app.js', code, 'utf8');
    console.log('Successfully updated frontend/app.js with smart in-place update!');
} else {
    console.error('Target not found in frontend/app.js');
    process.exit(1);
}
