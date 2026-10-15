const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

const target = `        function updateVendorCode(partyName, moduleKey) {
            const party = getLiveParties().find(p => p.name === partyName || p.id === partyName);
            const vendorCodeField = document.getElementById('field_vendorCode');
            const deliveryLocationField = document.getElementById('field_deliveryLocation');
            const contactPersonField = document.getElementById('field_contactPerson');
            if (party) {
                if (vendorCodeField) vendorCodeField.value = party.vendorCode || '';

                if (deliveryLocationField) {
                    const primaryAddr = [party.street1, party.city, party.state].filter(Boolean).join(', ');
                    const addresses = [primaryAddr, ...(party.additionalAddresses || [])].filter(Boolean);
                    deliveryLocationField.innerHTML = '<option value="">Select...</option>' + addresses.map(a => \`<option value="\${a}">\${a}</option>\`).join('');
                }
                if (contactPersonField) {
                    const primaryContact = party.contactName ? \`\${party.contactName}\${party.contactNumber ? ' - ' + party.contactNumber : ''}\` : '';
                    const contacts = [primaryContact, ...(party.additionalContacts || [])].filter(Boolean);
                    contactPersonField.innerHTML = '<option value="">Select...</option>' + contacts.map(c => \`<option value="\${c}">\${c}</option>\`).join('');
                }
            }
        }`;

const replacement = `        function updateVendorCode(partyName, moduleKey) {
            const liveParties = getLiveParties();
            let party = (liveParties || []).find(p => p.name === partyName || p.id === partyName);
            // Fallback to partiesMaster if live party has empty contact/address
            const masterParty = (state.data && state.data.partiesMaster ? state.data.partiesMaster : []).find(p => p.name === partyName || p.id === partyName);
            if (masterParty) {
                party = Object.assign({}, masterParty, party || {});
                if (masterParty.contactName && !party.contactName) party.contactName = masterParty.contactName;
                if (masterParty.contactNumber && !party.contactNumber) party.contactNumber = masterParty.contactNumber;
                if (masterParty.address && !party.address) party.address = masterParty.address;
            }
            const vendorCodeField = document.getElementById('field_vendorCode');
            const deliveryLocationField = document.getElementById('field_deliveryLocation');
            const contactPersonField = document.getElementById('field_contactPerson');
            if (party) {
                if (vendorCodeField) vendorCodeField.value = party.vendorCode || party.vendor_code || '';

                if (deliveryLocationField) {
                    const primaryAddr = [party.street1 || party.address, party.city, party.state].filter(Boolean).join(', ') || party.address || party.city || party.primary_address || '';
                    const addresses = [primaryAddr, ...(party.additionalAddresses || [])].filter(Boolean);
                    if (addresses.length > 0) {
                        deliveryLocationField.innerHTML = addresses.map((a, idx) => \`<option value="\${a}" \${idx === 0 ? 'selected' : ''}>\${a}</option>\`).join('');
                        deliveryLocationField.value = addresses[0];
                    } else {
                        deliveryLocationField.innerHTML = '<option value="">Select...</option>';
                    }
                }
                if (contactPersonField) {
                    const cName = party.contactName || party.primary_contact_name || party.contact_person || party.primaryContactName || '';
                    const cPhone = party.contactNumber || party.primary_contact_phone || party.phone || party.mobile || '';
                    const primaryContact = cName ? (cPhone ? \`\${cName} - \${cPhone}\` : cName) : '';
                    const contacts = [primaryContact, ...(party.additionalContacts || [])].filter(Boolean);
                    if (contacts.length > 0) {
                        contactPersonField.innerHTML = contacts.map((c, idx) => \`<option value="\${c}" \${idx === 0 ? 'selected' : ''}>\${c}</option>\`).join('');
                        contactPersonField.value = contacts[0];
                    } else {
                        contactPersonField.innerHTML = '<option value="">Select...</option>';
                    }
                }
            }
        }`;

const isCrlf = code.includes('\r\n');
const norm = str => isCrlf ? str.replace(/\n/g, '\r\n') : str.replace(/\r\n/g, '\n');

if (code.includes(norm(target))) {
    code = code.replace(norm(target), norm(replacement));
    fs.writeFileSync('frontend/app.js', code, 'utf8');
    console.log('Successfully updated updateVendorCode to auto-select contactPerson and deliveryLocation!');
} else {
    console.error('Target not found in frontend/app.js!');
    process.exit(1);
}
