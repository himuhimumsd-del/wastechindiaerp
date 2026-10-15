const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

const target = `        function filterPOsByClient(clientName) {
            const poReceivedSelect = document.getElementById('field_poReceived');
            const poIssuedSelect = document.getElementById('field_poIssued');
            const transportPOReceivedSelect = document.getElementById('field_transportPOReceived');
            const linkedTransportPOIssuedSelect = document.getElementById('field_linkedTransportPOIssued');

            // Precompute so we can safely reuse for multiple selects below (prevents ReferenceError)
            const clientPOs = (state.data.poReceived || []).filter(
                po => po.party === clientName && po.companyId === state.currentCompany
            );
            const vendorPOs = (state.data.poIssued || []).filter(
                po => po.party === clientName && po.companyId === state.currentCompany
            );
            
            if (poReceivedSelect) {
                poReceivedSelect.innerHTML = '<option value="">Select...</option>' + 
                    clientPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.itemName || po.item}</option>\`).join('');
            }
            
            if (poIssuedSelect) {
                poIssuedSelect.innerHTML = '<option value="">Select...</option>' + 
                    vendorPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.itemName || po.item}</option>\`).join('');
            }
            
            if (transportPOReceivedSelect) {
                transportPOReceivedSelect.innerHTML = '<option value="">Select...</option>' + 
                    clientPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.itemName || po.item}</option>\`).join('');
            }
            
            if (linkedTransportPOIssuedSelect) {
                linkedTransportPOIssuedSelect.innerHTML = '<option value="">Select...</option>' + 
                    vendorPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.itemName || po.item}</option>\`).join('');
            }
        }`;

const replacement = `        function filterPOsByClient(clientName) {
            const poReceivedSelect = document.getElementById('field_poReceived');
            const poIssuedSelect = document.getElementById('field_poIssued');
            const transportPOReceivedSelect = document.getElementById('field_transportPOReceived');
            const linkedTransportPOIssuedSelect = document.getElementById('field_linkedTransportPOIssued');

            // 1. Client POs: Received POs from this client
            const allPoReceived = (state.data.poReceived || []).concat((state.liveMasters && state.liveMasters.poReceived) || []);
            const clientPOs = allPoReceived.filter(
                po => (!clientName || po.party === clientName) && (!state.currentCompany || po.companyId === state.currentCompany) && (po.status === 'Open' || !po.status)
            );

            // 2. Vendor POs: Issued POs to Suppliers (Shows all active Purchase POs so cross-docking / direct supply trips can link the supplier PO!)
            const allPoIssued = (state.data.poIssued || []).concat((state.liveMasters && state.liveMasters.poIssued) || []);
            const vendorPOs = allPoIssued.filter(
                po => (!state.currentCompany || po.companyId === state.currentCompany) && (po.status === 'Open' || !po.status)
            );
            
            if (poReceivedSelect) {
                const prevVal = poReceivedSelect.value;
                poReceivedSelect.innerHTML = '<option value="">Select...</option>' + 
                    clientPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.itemName || po.item || 'Material'}</option>\`).join('');
                if (prevVal) poReceivedSelect.value = prevVal;
            }
            
            if (poIssuedSelect) {
                const prevVal = poIssuedSelect.value;
                poIssuedSelect.innerHTML = '<option value="">Select...</option>' + 
                    vendorPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.party || 'Vendor'} (\${po.itemName || po.item || 'Material'})\</option>\`).join('');
                if (prevVal) poIssuedSelect.value = prevVal;
            }
            
            if (transportPOReceivedSelect) {
                transportPOReceivedSelect.innerHTML = '<option value="">Select...</option>' + 
                    clientPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.itemName || po.item || 'Material'}</option>\`).join('');
            }
            
            if (linkedTransportPOIssuedSelect) {
                linkedTransportPOIssuedSelect.innerHTML = '<option value="">Select...</option>' + 
                    vendorPOs.map(po => \`<option value="\${po.id}">\${po.id} - \${po.party || 'Vendor'} (\${po.itemName || po.item || 'Material'})\</option>\`).join('');
            }
        }`;

const isCrlf = code.includes('\r\n');
const norm = str => isCrlf ? str.replace(/\n/g, '\r\n') : str.replace(/\r\n/g, '\n');

if (code.includes(norm(target))) {
    code = code.replace(norm(target), norm(replacement));
    fs.writeFileSync('frontend/app.js', code, 'utf8');
    console.log('Successfully patched filterPOsByClient to allow linking both Issued & Received POs!');
} else {
    console.error('Target not found in frontend/app.js!');
    process.exit(1);
}
