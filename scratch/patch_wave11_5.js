const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

// =========================================================================
// 1. ADD NORMALIZERS & PAYLOAD BUILDERS FOR ORDERS & GRN
// =========================================================================
const targetPayloadLocation = `            return {
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

const additionsPart1 = `${eol}${eol}        function normalizeLiveOrder(row) {
            if (!row || typeof row !== 'object') return null;
            const poNum = row.po_number || row.id || '';
            const dbId = row.id || '';
            const rawDate = row.po_date || row.date || '';
            const dateStr = rawDate ? (typeof rawDate === 'string' ? rawDate.split('T')[0] : String(rawDate)) : '';
            const rawDueDate = row.due_date || row.dueDate || '';
            const dueDateStr = rawDueDate ? (typeof rawDueDate === 'string' ? rawDueDate.split('T')[0] : String(rawDueDate)) : '';

            const liveParties = (typeof getLiveParties === 'function') ? getLiveParties() : (state.data?.partiesMaster || []);
            const partyObj = liveParties.find(p => p.id === row.party_id);
            const partyDisplay = partyObj ? (partyObj.name || partyObj.id) : (row.party || row.party_id || '');

            const liveItems = (typeof getLiveItems === 'function') ? getLiveItems() : (state.data?.itemMaster || []);
            const itemObj = liveItems.find(i => i.id === row.item_id);
            const itemDisplay = itemObj ? (itemObj.name || itemObj.id) : (row.itemName || row.item_id || '');

            const liveUnits = (typeof getLiveUnits === 'function') ? getLiveUnits() : (state.data?.unitMaster || []);
            const unitObj = liveUnits.find(u => u.id === row.unit_id);
            const unitDisplay = unitObj ? (unitObj.name || unitObj.id) : (row.unit || row.unit_id || '');

            return {
                id: poNum,
                dbId: dbId,
                poNumber: poNum,
                po_number: poNum,
                orderType: row.order_type || '',
                order_type: row.order_type || '',
                date: dateStr,
                po_date: dateStr,
                dueDate: dueDateStr,
                due_date: dueDateStr,
                poType: row.po_type_name || row.po_type_id || 'Regular',
                po_type_id: row.po_type_id || null,
                po_type_name: row.po_type_name || 'Regular',
                party: partyDisplay,
                partyId: row.party_id || '',
                party_id: row.party_id || '',
                deliveryLocation: row.delivery_location || '',
                delivery_location: row.delivery_location || '',
                contactPerson: row.contact_person || '',
                contact_person: row.contact_person || '',
                vendorCode: row.vendor_code || '',
                vendor_code: row.vendor_code || '',
                separateConsignorConsignee: Boolean(row.separate_consignor_consignee),
                separate_consignor_consignee: Boolean(row.separate_consignor_consignee),
                itemName: itemDisplay,
                itemId: row.item_id || '',
                item_id: row.item_id || '',
                itemDescription: row.item_description || '',
                item_description: row.item_description || '',
                itemQty: row.item_qty != null ? String(row.item_qty) : '0',
                item_qty: Number(row.item_qty) || 0,
                unit: unitDisplay,
                unitId: row.unit_id || '',
                unit_id: row.unit_id || '',
                itemRate: row.item_rate != null ? String(row.item_rate) : '0',
                item_rate: Number(row.item_rate) || 0,
                hsnCode: row.hsn_code || '',
                hsn_code: row.hsn_code || '',
                cgst: row.cgst_rate != null ? String(row.cgst_rate) : '0',
                cgst_rate: Number(row.cgst_rate) || 0,
                sgst: row.sgst_rate != null ? String(row.sgst_rate) : '0',
                sgst_rate: Number(row.sgst_rate) || 0,
                igst: row.igst_rate != null ? String(row.igst_rate) : '0',
                igst_rate: Number(row.igst_rate) || 0,
                ugst: row.ugst_rate != null ? String(row.ugst_rate) : '0',
                ugst_rate: Number(row.ugst_rate) || 0,
                totalQty: row.total_qty != null ? String(row.total_qty) : (row.item_qty != null ? String(row.item_qty) : '0'),
                total_qty: Number(row.total_qty) || Number(row.item_qty) || 0,
                consumedQty: row.consumed_qty != null ? String(row.consumed_qty) : '0.00',
                consumed_qty: Number(row.consumed_qty) || 0,
                balanceQty: row.balance_qty != null ? String(row.balance_qty) : '0.00',
                balance_qty: Number(row.balance_qty) || 0,
                paymentTermsDays: row.payment_terms_days != null ? Number(row.payment_terms_days) : 30,
                payment_terms_days: row.payment_terms_days != null ? Number(row.payment_terms_days) : 30,
                termsConditions: row.terms_conditions || '',
                terms_conditions: row.terms_conditions || '',
                comments: row.comments || '',
                attachment: row.attachment_url || '',
                attachment_url: row.attachment_url || '',
                status: row.status || 'Open',
                companyId: row['companyId'] || row.plant_id || '',
                plantId: row.plant_id || row['companyId'] || '',
                plant_id: row.plant_id || row['companyId'] || '',
                businessId: row.business_id || '',
                business_id: row.business_id || '',
                financialYear: row.financial_year || '',
                financial_year: row.financial_year || '',
                createdBy: row.created_by || '',
                created_by: row.created_by || '',
                updatedBy: row.updated_by || '',
                updated_by: row.updated_by || '',
                createdAt: row.created_at || '',
                created_at: row.created_at || '',
                updatedAt: row.updated_at || '',
                updated_at: row.updated_at || '',
                _isLive: true
            };
        }

        function normalizeLiveGrn(row, items) {
            if (!row || typeof row !== 'object') return null;
            const grnNum = row.grn_number || row.id || '';
            const dbId = row.id || '';
            const fromDateStr = row.from_date ? (typeof row.from_date === 'string' ? row.from_date.split('T')[0] : String(row.from_date)) : '';
            const toDateStr = row.to_date ? (typeof row.to_date === 'string' ? row.to_date.split('T')[0] : String(row.to_date)) : '';

            const liveParties = (typeof getLiveParties === 'function') ? getLiveParties() : (state.data?.partiesMaster || []);
            const partyObj = liveParties.find(p => p.id === row.party_id);
            const partyDisplay = partyObj ? (partyObj.name || partyObj.id) : (row.client || row.party_id || '');

            const tripItems = Array.isArray(items) ? items.map(item => ({
                id: item.id || '',
                tripId: item.trip_number || item.trip_uuid || '',
                tripUuid: item.trip_uuid || '',
                trip_uuid: item.trip_uuid || '',
                tripWeight: Number(item.trip_weight) || 0,
                receivedWeight: Number(item.received_weight) || 0,
                grnWeight: Number(item.grn_weight) || 0,
                shortage: Number(item.shortage) || 0,
                materialDocNumber: item.material_doc_num || ''
            })) : [];

            return {
                id: grnNum,
                dbId: dbId,
                grnNumber: grnNum,
                grn_number: grnNum,
                fromDate: fromDateStr,
                from_date: fromDateStr,
                toDate: toDateStr,
                to_date: toDateStr,
                client: partyDisplay,
                partyId: row.party_id || '',
                party_id: row.party_id || '',
                poRef: row.po_ref || '',
                po_ref: row.po_ref || '',
                orderId: row.order_id || null,
                order_id: row.order_id || null,
                condition: row.condition || 'Good',
                totalWeight: Number(row.total_grn_weight) || 0,
                total_grn_weight: Number(row.total_grn_weight) || 0,
                totalShortage: Number(row.total_shortage) || 0,
                total_shortage: Number(row.total_shortage) || 0,
                tripSelection: tripItems,
                companyId: row['companyId'] || row.plant_id || '',
                plantId: row.plant_id || row['companyId'] || '',
                plant_id: row.plant_id || row['companyId'] || '',
                businessId: row.business_id || '',
                business_id: row.business_id || '',
                financialYear: row.financial_year || '',
                financial_year: row.financial_year || '',
                createdBy: row.created_by || '',
                created_by: row.created_by || '',
                updatedBy: row.updated_by || '',
                updated_by: row.updated_by || '',
                createdAt: row.created_at || '',
                created_at: row.created_at || '',
                updatedAt: row.updated_at || '',
                updated_at: row.updated_at || '',
                _isLive: true
            };
        }

        function buildLiveOrderPayload(record, orderType) {
            if (!record) throw new Error('No record data provided');

            // 1. Order type: 'received' or 'issued'
            const validTypes = ['received', 'issued'];
            if (!orderType || !validTypes.includes(orderType)) {
                throw new Error(\`Invalid order type: \${orderType}\`);
            }

            // 2. PO Number (required)
            const poNumber = (record.id || record.po_number || record.poNumber || '').trim();
            if (!poNumber || poNumber === 'Auto-generated') {
                throw new Error('PO Number is required');
            }

            // 3. PO Date and Due Date (required)
            const poDate = (record.date || record.po_date || '').split('T')[0].trim();
            const dueDate = (record.dueDate || record.due_date || '').split('T')[0].trim();
            if (!poDate) throw new Error('PO Date is required');
            if (!dueDate) throw new Error('Due Date is required');

            // 4. Plant & Business authorization check
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

            // 5. Party resolution
            const rawParty = (record.party || record.client || record.party_id || '').trim();
            if (!rawParty) throw new Error('Party is required');
            const liveParties = (typeof getLiveParties === 'function') ? getLiveParties() : (state.data?.partiesMaster || []);
            const matchingParty = liveParties.find(p => p.id === rawParty || p.name === rawParty);
            if (!matchingParty) throw new Error(\`Selected party "\${rawParty}" not found in live parties\`);
            const partyId = matchingParty.id;

            // 6. Item resolution
            const rawItem = (record.itemName || record.item || record.item_id || '').trim();
            if (!rawItem) throw new Error('Item is required');
            const liveItems = (typeof getLiveItems === 'function') ? getLiveItems() : (state.data?.itemMaster || []);
            const matchingItem = liveItems.find(i => i.id === rawItem || i.name === rawItem);
            if (!matchingItem) throw new Error(\`Selected item "\${rawItem}" not found in live items\`);
            const itemId = matchingItem.id;

            // 7. Unit resolution
            const rawUnit = (record.unit || record.unit_id || '').trim();
            if (!rawUnit) throw new Error('Unit is required');
            const liveUnits = (typeof getLiveUnits === 'function') ? getLiveUnits() : (state.data?.unitMaster || []);
            const matchingUnit = liveUnits.find(u => u.id === rawUnit || u.name === rawUnit);
            if (!matchingUnit) throw new Error(\`Selected unit "\${rawUnit}" not found in live units\`);
            const unitId = matchingUnit.id;

            // 8. PO Type resolution (optional ID, preserve name)
            const rawPoType = (record.poType || record.po_type_name || record.po_type_id || '').trim();
            let poTypeId = null;
            let poTypeName = rawPoType || 'Regular';
            if (rawPoType) {
                const livePoTypes = (typeof getLivePoTypes === 'function') ? getLivePoTypes() : (state.data?.poTypeMaster || []);
                const matchingPoType = livePoTypes.find(pt => pt.id === rawPoType || pt.name === rawPoType);
                if (matchingPoType) {
                    poTypeId = matchingPoType.id;
                    poTypeName = matchingPoType.name;
                }
            }

            // 9. Quantities & rates
            const itemQty = parseFloat(record.itemQty != null ? record.itemQty : record.item_qty);
            if (isNaN(itemQty) || itemQty <= 0) throw new Error('Item quantity must be greater than 0');

            const itemRate = parseFloat(record.itemRate != null ? record.itemRate : record.item_rate);
            if (isNaN(itemRate) || itemRate < 0) throw new Error('Item rate cannot be negative');

            const totalQty = parseFloat(record.totalQty != null ? record.totalQty : record.total_qty) || itemQty;
            const consumedQty = parseFloat(record.consumedQty != null ? record.consumedQty : record.consumed_qty) || 0;
            const balanceQty = parseFloat(record.balanceQty != null ? record.balanceQty : record.balance_qty) || Math.max(0, totalQty - consumedQty);

            const cgst = parseFloat(record.cgst != null ? record.cgst : record.cgst_rate) || 0;
            const sgst = parseFloat(record.sgst != null ? record.sgst : record.sgst_rate) || 0;
            const igst = parseFloat(record.igst != null ? record.igst : record.igst_rate) || 0;
            const ugst = parseFloat(record.ugst != null ? record.ugst : record.ugst_rate) || 0;

            const paymentTerms = parseInt(record.paymentTermsDays != null ? record.paymentTermsDays : record.payment_terms_days, 10) || 30;

            // 10. Status
            let status = (record.status || 'Open').trim();
            const validStatuses = ['Open', 'Exhausted/Closed', 'Cancelled'];
            if (!validStatuses.includes(status)) status = 'Open';

            // 11. Financial year
            let financialYear = record.financialYear || record.financial_year || null;
            if (!financialYear && typeof getFinancialYear === 'function') {
                financialYear = getFinancialYear(poDate, plantId);
            }

            // 12. Actor
            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const actor = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || 'Commercial User';

            return {
                order_type: orderType,
                po_number: poNumber,
                po_date: poDate,
                due_date: dueDate,
                po_type_id: poTypeId,
                po_type_name: poTypeName,
                business_id: businessId,
                plant_id: plantId,
                "companyId": plantId,
                party_id: partyId,
                delivery_location: (record.deliveryLocation || record.delivery_location || '').trim() || null,
                contact_person: (record.contactPerson || record.contact_person || '').trim() || null,
                vendor_code: (record.vendorCode || record.vendor_code || '').trim() || null,
                separate_consignor_consignee: Boolean(record.separateConsignorConsignee),
                item_id: itemId,
                item_description: (record.itemDescription || record.item_description || '').trim() || null,
                item_qty: Number(itemQty.toFixed(2)),
                unit_id: unitId,
                item_rate: Number(itemRate.toFixed(2)),
                hsn_code: (record.hsnCode || record.hsn_code || matchingItem.hsnCode || '').trim() || null,
                cgst_rate: Number(cgst.toFixed(2)),
                sgst_rate: Number(sgst.toFixed(2)),
                igst_rate: Number(igst.toFixed(2)),
                ugst_rate: Number(ugst.toFixed(2)),
                total_qty: Number(totalQty.toFixed(2)),
                consumed_qty: Number(consumedQty.toFixed(2)),
                balance_qty: Number(balanceQty.toFixed(2)),
                payment_terms_days: paymentTerms,
                terms_conditions: (record.termsConditions || record.terms_conditions || '').trim() || null,
                comments: (record.comments || '').trim() || null,
                attachment_url: (record.attachment || record.attachment_url || '').trim() || null,
                status: status,
                financial_year: financialYear || null,
                created_by: actor,
                updated_by: actor
            };
        }

        function buildLiveGrnPayload(record) {
            if (!record) throw new Error('No record data provided');

            // 1. GRN Number (required)
            const grnNumber = (record.id || record.grn_number || record.grnNumber || (typeof generateId === 'function' ? generateId('GRN') : \`GRN-\${Date.now()}\`)).trim();

            // 2. Dates (required)
            const fromDate = (record.fromDate || record.from_date || '').split('T')[0].trim();
            const toDate = (record.toDate || record.to_date || '').split('T')[0].trim();
            if (!fromDate) throw new Error('From Date is required');
            if (!toDate) throw new Error('To Date is required');

            // 3. Plant & Business authorization check
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

            // 4. Party resolution
            const rawParty = (record.client || record.party || record.party_id || '').trim();
            if (!rawParty) throw new Error('Party / Client is required');
            const liveParties = (typeof getLiveParties === 'function') ? getLiveParties() : (state.data?.partiesMaster || []);
            const matchingParty = liveParties.find(p => p.id === rawParty || p.name === rawParty);
            if (!matchingParty) throw new Error(\`Selected party "\${rawParty}" not found in live parties\`);
            const partyId = matchingParty.id;

            // 5. PO reference and relational order_id resolution
            const poRef = (record.poRef || record.po_ref || '').trim();
            if (!poRef) throw new Error('PO reference is required');

            let liveOrderId = null;
            const liveOrders = (state.data?.poReceived || []).concat(state.data?.poIssued || []);
            const matchingPo = liveOrders.find(po => po.id === poRef || po.po_number === poRef || po.dbId === poRef);
            if (matchingPo) {
                const poPlant = matchingPo.plantId || matchingPo.plant_id || matchingPo.companyId;
                if (poPlant && poPlant !== plantId) {
                    throw new Error(\`Referenced PO "\${poRef}" belongs to plant "\${poPlant}", not active plant "\${plantId}"\`);
                }
                if (isUUID(matchingPo.dbId)) {
                    liveOrderId = matchingPo.dbId;
                } else if (isUUID(matchingPo.id)) {
                    liveOrderId = matchingPo.id;
                }
            }
            if (!liveOrderId && record.order_id && isUUID(record.order_id)) {
                liveOrderId = record.order_id;
            }

            // 6. Condition
            const condition = (record.condition || 'Good').trim();
            const validConditions = ['Good', 'Damaged', 'Partial'];
            const finalCondition = validConditions.includes(condition) ? condition : 'Good';

            // 7. Weights
            const totalWeight = parseFloat(record.totalWeight != null ? record.totalWeight : record.total_grn_weight) || 0;
            const totalShortage = parseFloat(record.totalShortage != null ? record.totalShortage : record.total_shortage) || 0;

            // 8. Financial Year
            let financialYear = record.financialYear || record.financial_year || null;
            if (!financialYear && typeof getFinancialYear === 'function') {
                financialYear = getFinancialYear(fromDate, plantId);
            }

            // 9. Actor
            const authUserUuid = (state.currentUser && state.currentUser.authUid) || (state.stage1AuthUser && state.stage1AuthUser.id) || (typeof activeAuthUid !== 'undefined' ? activeAuthUid : null);
            const actor = authUserUuid || (state.currentUser ? (state.currentUser.username || state.currentUser.name) : null) || 'Receiving Officer';

            return {
                grn_number: grnNumber,
                business_id: businessId,
                plant_id: plantId,
                "companyId": plantId,
                party_id: partyId,
                order_id: liveOrderId,
                po_ref: poRef,
                from_date: fromDate,
                to_date: toDate,
                condition: finalCondition,
                total_grn_weight: Number(totalWeight.toFixed(2)),
                total_shortage: Number(totalShortage.toFixed(2)),
                financial_year: financialYear || null,
                created_by: actor,
                updated_by: actor
            };
        }`.replace(/\n/g, eol);

if (!content.includes(targetPayloadLocation)) {
    console.error('Target for order & GRN payload builders not found!');
    process.exit(1);
}
content = content.replace(targetPayloadLocation, targetPayloadLocation + additionsPart1);
console.log('✓ Normalizers and payload builders for Orders & GRN added.');

// =========================================================================
// 2. ADD WINDOW EXPORTS
// =========================================================================
const targetExports = `        window.processTripSave = processTripSave;`.replace(/\n/g, eol);
const additionsExports = `${eol}        window.buildLiveOrderPayload = buildLiveOrderPayload;${eol}        window.buildLiveGrnPayload = buildLiveGrnPayload;${eol}        window.normalizeLiveOrder = normalizeLiveOrder;${eol}        window.normalizeLiveGrn = normalizeLiveGrn;${eol}        window.processOrderSave = processOrderSave;${eol}        window.processGrnSave = processGrnSave;`.replace(/\n/g, eol);

if (!content.includes(targetExports)) {
    console.error('Target for window exports not found!');
    process.exit(1);
}
content = content.replace(targetExports, targetExports + additionsExports);
console.log('✓ Window exports updated for Orders & GRN.');

// =========================================================================
// 3. ADD processOrderSave() AND processGrnSave()
// =========================================================================
const targetHandlerLocation = `        function applySmartGST(moduleKey) {`.replace(/\n/g, eol);

const additionsHandlers = `        async function processOrderSave(moduleKey) {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast(\`Authentication required to save \${moduleKey === 'poReceived' ? 'PO Received' : 'PO Issued'}.\`, 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm(moduleKey, 'add')) {
                showToast(\`Unauthorized: You do not have permission to add \${moduleKey}.\`, 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm(moduleKey, 'edit')) {
                showToast(\`Unauthorized: You do not have permission to edit \${moduleKey}.\`, 'error');
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
                showToast(\`Cannot persist PO: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist PO: no authorized plant found.', 'error');
                return;
            }

            // 4. Gather form values
            const poNumberVal = (document.getElementById('field_id')?.value || '').trim();
            const dateVal = document.getElementById('field_date')?.value || '';
            const dueDateVal = document.getElementById('field_dueDate')?.value || '';
            const poTypeVal = document.getElementById('field_poType')?.value || '';
            const partyVal = document.getElementById('field_party')?.value || '';
            const deliveryLocationVal = document.getElementById('field_deliveryLocation')?.value || '';
            const contactPersonVal = document.getElementById('field_contactPerson')?.value || '';
            const vendorCodeVal = document.getElementById('field_vendorCode')?.value || '';
            const separateConsignorConsigneeVal = document.getElementById('field_separateConsignorConsignee')?.checked;
            const itemNameVal = document.getElementById('field_itemName')?.value || '';
            const itemDescriptionVal = document.getElementById('field_itemDescription')?.value || '';
            const itemQtyVal = document.getElementById('field_itemQty')?.value || '';
            const unitVal = document.getElementById('field_unit')?.value || '';
            const itemRateVal = document.getElementById('field_itemRate')?.value || '';
            const hsnCodeVal = document.getElementById('field_hsnCode')?.value || '';
            const cgstVal = document.getElementById('field_cgst')?.value || '0';
            const sgstVal = document.getElementById('field_sgst')?.value || '0';
            const igstVal = document.getElementById('field_igst')?.value || '0';
            const ugstVal = document.getElementById('field_ugst')?.value || '0';
            const totalQtyVal = document.getElementById('field_totalQty')?.value || itemQtyVal;
            const consumedQtyVal = document.getElementById('field_consumedQty')?.value || '0';
            const balanceQtyVal = document.getElementById('field_balanceQty')?.value || '';
            const paymentTermsDaysVal = document.getElementById('field_paymentTermsDays')?.value || '30';
            const termsConditionsVal = document.getElementById('field_termsConditions')?.value || '';
            const commentsVal = document.getElementById('field_comments')?.value || '';
            const statusVal = document.getElementById('field_status')?.value || 'Open';

            const orderType = moduleKey === 'poReceived' ? 'received' : 'issued';

            const rawRecord = {
                id: poNumberVal,
                date: dateVal,
                dueDate: dueDateVal,
                poType: poTypeVal,
                party: partyVal,
                deliveryLocation: deliveryLocationVal,
                contactPerson: contactPersonVal,
                vendorCode: vendorCodeVal,
                separateConsignorConsignee: separateConsignorConsigneeVal,
                itemName: itemNameVal,
                itemDescription: itemDescriptionVal,
                itemQty: itemQtyVal,
                unit: unitVal,
                itemRate: itemRateVal,
                hsnCode: hsnCodeVal,
                cgst: cgstVal,
                sgst: sgstVal,
                igst: igstVal,
                ugst: ugstVal,
                totalQty: totalQtyVal,
                consumedQty: consumedQtyVal,
                balanceQty: balanceQtyVal,
                paymentTermsDays: paymentTermsDaysVal,
                termsConditions: termsConditionsVal,
                comments: commentsVal,
                status: statusVal,
                plantId: authPlant.id,
                companyId: authPlant.id
            };

            let payload;
            try {
                payload = buildLiveOrderPayload(rawRecord, orderType);
            } catch (payloadErr) {
                showToast(payloadErr.message || 'Failed to construct order payload', 'error');
                return;
            }

            if (!isEditing) {
                // --- INSERT PATH ---
                try {
                    const { data, error } = await client
                        .from('orders')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[Orders] Insert failed:', error);
                        showToast(\`Failed to save \${moduleKey === 'poReceived' ? 'PO Received' : 'PO Issued'}: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveOrder(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize saved order row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters[moduleKey])) {
                        state.liveMasters[moduleKey].unshift(normalizedRow);
                    }
                    if (!Array.isArray(state.data[moduleKey])) {
                        state.data[moduleKey] = [];
                    }
                    state.data[moduleKey].unshift(normalizedRow);

                    if (typeof logAudit === 'function') {
                        logAudit(moduleKey, 'Create', normalizedRow);
                    }

                    closeModal();
                    if (state.currentModule === moduleKey) {
                        renderTableModule(moduleKey, document.getElementById('content-area'));
                    }
                    showToast(\`PO \${normalizedRow.poNumber || normalizedRow.id} saved successfully!\`, 'success');
                } catch (insertErr) {
                    console.error('[Orders] Insert exception:', insertErr);
                    showToast(\`Error saving PO: \${insertErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            } else {
                // --- UPDATE PATH ---
                const existingList = state.data[moduleKey] || [];
                const existingRecord = existingList.find(r => r.id === state.editingId || r.dbId === state.editingId || r.poNumber === state.editingId);

                const liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update order: No valid live database UUID found.', 'error');
                    return;
                }

                const orderPlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || authPlant.id;
                if (orderPlant !== authPlant.id) {
                    showToast(\`Cannot edit order belonging to plant "\${orderPlant}" while active on plant "\${authPlant.id}".\`, 'error');
                    return;
                }

                // Mutable update payload
                const updatePayload = {
                    po_date: payload.po_date,
                    due_date: payload.due_date,
                    po_type_id: payload.po_type_id,
                    po_type_name: payload.po_type_name,
                    party_id: payload.party_id,
                    delivery_location: payload.delivery_location,
                    contact_person: payload.contact_person,
                    vendor_code: payload.vendor_code,
                    separate_consignor_consignee: payload.separate_consignor_consignee,
                    item_id: payload.item_id,
                    item_description: payload.item_description,
                    item_qty: payload.item_qty,
                    unit_id: payload.unit_id,
                    item_rate: payload.item_rate,
                    hsn_code: payload.hsn_code,
                    cgst_rate: payload.cgst_rate,
                    sgst_rate: payload.sgst_rate,
                    igst_rate: payload.igst_rate,
                    ugst_rate: payload.ugst_rate,
                    total_qty: payload.total_qty,
                    consumed_qty: payload.consumed_qty,
                    balance_qty: payload.balance_qty,
                    payment_terms_days: payload.payment_terms_days,
                    terms_conditions: payload.terms_conditions,
                    comments: payload.comments,
                    attachment_url: payload.attachment_url,
                    status: payload.status,
                    updated_by: payload.updated_by
                };

                try {
                    const { data, error } = await client
                        .from('orders')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[Orders] Update failed:', error);
                        showToast(\`Failed to update PO: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }

                    const normalizedRow = normalizeLiveOrder(data);
                    if (!normalizedRow) {
                        showToast('Failed to normalize updated order row.', 'error');
                        return;
                    }

                    // Synchronize state
                    if (state.liveMasters && Array.isArray(state.liveMasters[moduleKey])) {
                        const idx = state.liveMasters[moduleKey].findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) state.liveMasters[moduleKey][idx] = normalizedRow;
                        else state.liveMasters[moduleKey].unshift(normalizedRow);
                    }
                    if (Array.isArray(state.data[moduleKey])) {
                        const idx = state.data[moduleKey].findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                        if (idx > -1) state.data[moduleKey][idx] = normalizedRow;
                        else state.data[moduleKey].unshift(normalizedRow);
                    }

                    if (typeof logAudit === 'function') {
                        logAudit(moduleKey, 'Update', normalizedRow);
                    }

                    // Recalculate PO consumption
                    if (typeof recomputePoConsumption === 'function') {
                        recomputePoConsumption(normalizedRow.poNumber || normalizedRow.id);
                    }

                    closeModal();
                    state.editingId = null;
                    if (state.currentModule === moduleKey) {
                        renderTableModule(moduleKey, document.getElementById('content-area'));
                    }
                    showToast(\`PO \${normalizedRow.poNumber || normalizedRow.id} updated successfully!\`, 'success');
                } catch (updateErr) {
                    console.error('[Orders] Update exception:', updateErr);
                    showToast(\`Error updating PO: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }
            }
        }

        async function processGrnSave() {
            // 1. Require authenticated session
            if (!state.authAuthorized || !state.currentUser) {
                showToast('Authentication required to save GRN.', 'error');
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
            if (!client) {
                showToast('Database connection unavailable.', 'error');
                return;
            }

            const isEditing = Boolean(state.editingId);

            // 2. Role / permission enforcement
            if (!isEditing && typeof hasPerm === 'function' && !hasPerm('grn', 'add')) {
                showToast('Unauthorized: You do not have permission to add GRN.', 'error');
                return;
            }
            if (isEditing && typeof hasPerm === 'function' && !hasPerm('grn', 'edit')) {
                showToast('Unauthorized: You do not have permission to edit GRN.', 'error');
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
                showToast(\`Cannot persist GRN: active plant has invalid business UUID (\${businessId}).\`, 'error');
                return;
            }
            if (!authPlant || !authPlant.id) {
                showToast('Cannot persist GRN: no authorized plant found.', 'error');
                return;
            }

            // 4. Gather form values
            const grnIdVal = (document.getElementById('field_id')?.value || '').trim();
            const clientVal = document.getElementById('field_client')?.value || '';
            const poRefVal = document.getElementById('field_poRef')?.value || '';
            const fromDateVal = document.getElementById('field_fromDate')?.value || '';
            const toDateVal = document.getElementById('field_toDate')?.value || '';
            const conditionVal = document.getElementById('field_condition')?.value || 'Good';
            const totalWeightVal = document.getElementById('field_totalWeight')?.value || '0';
            const totalShortageVal = document.getElementById('field_totalShortage')?.value || '0';

            // Gather selected trips
            const selectedTrips = Array.from(document.querySelectorAll('.grn-trip-row')).filter(row => row.querySelector('.grn-trip-checkbox').checked).map(row => {
                const recvWt = parseFloat(row.dataset.recvWt) || 0;
                const grnWt = parseFloat(row.querySelector('.grn-weight-input').value) || 0;
                return {
                    tripId: row.dataset.tripId,
                    tripWeight: parseFloat(row.dataset.tripWt) || 0,
                    receivedWeight: recvWt,
                    grnWeight: grnWt,
                    shortage: (recvWt - grnWt),
                    materialDocNumber: row.querySelector('.grn-docno-input')?.value || ''
                };
            });

            // Validate all trips against live trips and plant context
            const liveTrips = (typeof getLiveTrips === 'function') ? getLiveTrips() : (state.data?.trips || []);
            for (const item of selectedTrips) {
                const matchingTrip = liveTrips.find(t => t.id === item.tripId || t.tripNumber === item.tripId || t.dbId === item.tripId);
                if (!matchingTrip) {
                    showToast(\`Selected trip "\${item.tripId}" not found in live trips.\`, 'error');
                    return;
                }
                const tripPlant = matchingTrip.plantId || matchingTrip.plant_id || matchingTrip.companyId;
                if (tripPlant && tripPlant !== authPlant.id) {
                    showToast(\`Selected trip belongs to plant "\${tripPlant}", not active plant "\${authPlant.id}".\`, 'error');
                    return;
                }
                const tripUuid = matchingTrip.dbId || (isUUID(matchingTrip.id) ? matchingTrip.id : null);
                if (!tripUuid || !isUUID(tripUuid)) {
                    showToast(\`Selected trip "\${item.tripId}" does not have a valid live database UUID. Write aborted.\`, 'error');
                    return;
                }
                item.trip_uuid = tripUuid;
            }

            const rawRecord = {
                id: grnIdVal,
                client: clientVal,
                poRef: poRefVal,
                fromDate: fromDateVal,
                toDate: toDateVal,
                condition: conditionVal,
                totalWeight: totalWeightVal,
                totalShortage: totalShortageVal,
                plantId: authPlant.id,
                companyId: authPlant.id
            };

            let headerPayload;
            try {
                headerPayload = buildLiveGrnPayload(rawRecord);
            } catch (payloadErr) {
                showToast(payloadErr.message || 'Failed to construct GRN payload', 'error');
                return;
            }

            if (!isEditing) {
                // --- INSERT PATH ---
                let savedHeader;
                try {
                    const { data, error } = await client
                        .from('grn')
                        .insert(headerPayload)
                        .select()
                        .single();

                    if (error) {
                        console.error('[GRN] Header insert failed:', error);
                        showToast(\`Failed to save GRN: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }
                    savedHeader = data;
                } catch (headerErr) {
                    console.error('[GRN] Header insert exception:', headerErr);
                    showToast(\`Error saving GRN: \${headerErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }

                // Insert GRN line items
                let savedItems = [];
                if (selectedTrips.length > 0) {
                    const grnItemsPayload = selectedTrips.map(item => ({
                        grn_id: savedHeader.id,
                        plant_id: authPlant.id,
                        trip_uuid: item.trip_uuid,
                        trip_number: item.tripId,
                        trip_weight: Number(item.tripWeight.toFixed(2)),
                        received_weight: Number(item.receivedWeight.toFixed(2)),
                        grn_weight: Number(item.grnWeight.toFixed(2)),
                        shortage: Number(item.shortage.toFixed(2)),
                        material_doc_num: item.materialDocNumber ? item.materialDocNumber.trim() : null
                    }));

                    try {
                        const { data: itemRows, error: itemError } = await client
                            .from('grn_items')
                            .insert(grnItemsPayload)
                            .select();

                        if (itemError) {
                            console.error('[GRN] Item lines insert failed:', itemError);
                            // Rollback header to avoid orphaned GRN
                            await client.from('grn').delete().eq('id', savedHeader.id);
                            showToast(\`Failed to save GRN line items: \${itemError.message || 'Database error'}. GRN creation rolled back.\`, 'error');
                            return;
                        }
                        savedItems = itemRows || [];
                    } catch (linesErr) {
                        console.error('[GRN] Line items exception:', linesErr);
                        await client.from('grn').delete().eq('id', savedHeader.id);
                        showToast(\`Error saving GRN line items: \${linesErr.message || 'Unexpected error'}. GRN creation rolled back.\`, 'error');
                        return;
                    }
                }

                const normalizedRow = normalizeLiveGrn(savedHeader, savedItems);
                if (!normalizedRow) {
                    showToast('Failed to normalize saved GRN row.', 'error');
                    return;
                }

                // Synchronize state
                if (state.liveMasters && Array.isArray(state.liveMasters.grn)) {
                    state.liveMasters.grn.unshift(normalizedRow);
                }
                if (!Array.isArray(state.data.grn)) {
                    state.data.grn = [];
                }
                state.data.grn.unshift(normalizedRow);

                // Link trips in state
                selectedTrips.forEach(t => {
                    const matched = (state.data.trips || []).find(tr => tr.id === t.tripId || tr.tripNumber === t.tripId || tr.dbId === t.tripId);
                    if (matched) matched.grnId = normalizedRow.grnNumber || normalizedRow.id;
                });

                if (typeof logAudit === 'function') {
                    logAudit('grn', 'Create', normalizedRow);
                }

                closeModal();
                if (state.currentModule === 'grn') {
                    renderTableModule('grn', document.getElementById('content-area'));
                }
                showToast(\`GRN \${normalizedRow.grnNumber || normalizedRow.id} created successfully!\`, 'success');
            } else {
                // --- UPDATE PATH ---
                const existingRecord = (state.data?.grn || []).find(r => r.id === state.editingId || r.dbId === state.editingId || r.grnNumber === state.editingId);
                const liveDbId = existingRecord?.dbId || (isUUID(existingRecord?.id) ? existingRecord.id : (isUUID(state.editingId) ? state.editingId : null));

                if (!liveDbId || !isUUID(liveDbId)) {
                    showToast('Cannot update GRN: No valid live database UUID found.', 'error');
                    return;
                }

                const grnPlant = existingRecord?.plantId || existingRecord?.plant_id || existingRecord?.companyId || authPlant.id;
                if (grnPlant !== authPlant.id) {
                    showToast(\`Cannot edit GRN belonging to plant "\${grnPlant}" while active on plant "\${authPlant.id}".\`, 'error');
                    return;
                }

                const updatePayload = {
                    from_date: headerPayload.from_date,
                    to_date: headerPayload.to_date,
                    condition: headerPayload.condition,
                    total_grn_weight: headerPayload.total_grn_weight,
                    total_shortage: headerPayload.total_shortage,
                    updated_by: headerPayload.updated_by
                };

                let updatedHeader;
                try {
                    const { data, error } = await client
                        .from('grn')
                        .update(updatePayload)
                        .eq('id', liveDbId)
                        .select()
                        .single();

                    if (error) {
                        console.error('[GRN] Update header failed:', error);
                        showToast(\`Failed to update GRN: \${error.message || error.details || 'Database error'}\`, 'error');
                        return;
                    }
                    updatedHeader = data;
                } catch (updateErr) {
                    console.error('[GRN] Update exception:', updateErr);
                    showToast(\`Error updating GRN: \${updateErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }

                // Update items: delete existing lines and re-insert
                let savedItems = [];
                try {
                    await client.from('grn_items').delete().eq('grn_id', liveDbId);

                    if (selectedTrips.length > 0) {
                        const grnItemsPayload = selectedTrips.map(item => ({
                            grn_id: liveDbId,
                            plant_id: authPlant.id,
                            trip_uuid: item.trip_uuid,
                            trip_number: item.tripId,
                            trip_weight: Number(item.tripWeight.toFixed(2)),
                            received_weight: Number(item.receivedWeight.toFixed(2)),
                            grn_weight: Number(item.grnWeight.toFixed(2)),
                            shortage: Number(item.shortage.toFixed(2)),
                            material_doc_num: item.materialDocNumber ? item.materialDocNumber.trim() : null
                        }));

                        const { data: itemRows, error: itemError } = await client
                            .from('grn_items')
                            .insert(grnItemsPayload)
                            .select();

                        if (itemError) {
                            console.error('[GRN] Line items update failed:', itemError);
                            showToast(\`Failed to update GRN items: \${itemError.message}\`, 'error');
                            return;
                        }
                        savedItems = itemRows || [];
                    }
                } catch (linesErr) {
                    console.error('[GRN] Lines update exception:', linesErr);
                    showToast(\`Error updating GRN line items: \${linesErr.message || 'Unexpected error'}\`, 'error');
                    return;
                }

                const normalizedRow = normalizeLiveGrn(updatedHeader, savedItems);
                if (!normalizedRow) {
                    showToast('Failed to normalize updated GRN row.', 'error');
                    return;
                }

                // Update state
                if (state.liveMasters && Array.isArray(state.liveMasters.grn)) {
                    const idx = state.liveMasters.grn.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                    if (idx > -1) state.liveMasters.grn[idx] = normalizedRow;
                    else state.liveMasters.grn.unshift(normalizedRow);
                }
                if (Array.isArray(state.data.grn)) {
                    const idx = state.data.grn.findIndex(r => r.dbId === liveDbId || r.id === state.editingId || r.id === liveDbId);
                    if (idx > -1) state.data.grn[idx] = normalizedRow;
                    else state.data.grn.unshift(normalizedRow);
                }

                // Update trip linkage
                const updatedGrnId = normalizedRow.grnNumber || normalizedRow.id;
                const selectedTripIds = selectedTrips.map(t => t.tripId);
                (state.data.trips || []).forEach(t => {
                    if (t.grnId === updatedGrnId && !selectedTripIds.includes(t.id)) t.grnId = null;
                });
                (state.data.trips || []).forEach(t => {
                    if (selectedTripIds.includes(t.id)) t.grnId = updatedGrnId;
                });

                if (typeof logAudit === 'function') {
                    logAudit('grn', 'Update', normalizedRow);
                }

                closeModal();
                state.editingId = null;
                if (state.currentModule === 'grn') {
                    renderTableModule('grn', document.getElementById('content-area'));
                }
                showToast(\`GRN \${normalizedRow.grnNumber || normalizedRow.id} updated successfully!\`, 'success');
            }
        }`.replace(/\n/g, eol);

if (!content.includes(targetHandlerLocation)) {
    console.error('Target for processOrderSave & processGrnSave not found!');
    process.exit(1);
}
content = content.replace(targetHandlerLocation, additionsHandlers + `${eol}${eol}        function applySmartGST(moduleKey) {`.replace(/\n/g, eol));
console.log('✓ Handlers processOrderSave & processGrnSave added.');

// =========================================================================
// 4. ROUTE saveRecord() FOR poReceived, poIssued, grn
// =========================================================================
const targetSaveRecord = `            if (moduleKey === 'trips') {
                return processTripSave();
            }`.replace(/\n/g, eol);

const additionsSaveRoute = `            if (moduleKey === 'trips') {
                return processTripSave();
            }
            if (moduleKey === 'poReceived' || moduleKey === 'poIssued') {
                return processOrderSave(moduleKey);
            }
            if (moduleKey === 'grn') {
                return processGrnSave();
            }`.replace(/\n/g, eol);

if (!content.includes(targetSaveRecord)) {
    console.error('Target for saveRecord routing not found!');
    process.exit(1);
}
content = content.replace(targetSaveRecord, additionsSaveRoute);
console.log('✓ saveRecord() routed for poReceived, poIssued, grn.');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched frontend/app.js for Wave 11.5!');
