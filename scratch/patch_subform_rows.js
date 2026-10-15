const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'frontend', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

const isCrlf = content.includes('\r\n');
const normalized = content.replace(/\r\n/g, '\n');

// 1. Update lines 7288-7298 (trip attachments in renderRecordModal)
const targetAttachmentsInModal = `                                <div class="flex gap-2 mb-2 items-center trip-attachment-row">
                                    <select class="trip-attachment-type p-1.5 border border-gray-200 rounded text-sm w-48">
                                        <option value="Weighment Slip" \${a.type === 'Weighment Slip' ? 'selected' : ''}>Weighment Slip</option>
                                        <option value="POD" \${a.type === 'POD' ? 'selected' : ''}>POD</option>
                                        <option value="Insurance Copy" \${a.type === 'Insurance Copy' ? 'selected' : ''}>Insurance Copy</option>
                                        <option value="Other" \${a.type === 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                    <input type="file" class="trip-attachment-file text-sm flex-1" onchange="handleTripAttachmentUpload(this)">
                                    <input type="hidden" class="trip-attachment-file-value" value="\${a.file || ''}">
                                    <button type="button" class="text-red-500 hover:text-red-700 px-2" onclick="this.closest('.trip-attachment-row').remove()"><i class="fa-solid fa-xmark"></i></button>
                                </div>`;

const replacementAttachmentsInModal = `                                <div class="flex flex-col sm:flex-row gap-2 mb-2 items-stretch sm:items-center trip-attachment-row border-b sm:border-b-0 pb-2 sm:pb-0">
                                    <select class="trip-attachment-type p-1.5 border border-gray-200 rounded text-sm w-full sm:w-48">
                                        <option value="Weighment Slip" \${a.type === 'Weighment Slip' ? 'selected' : ''}>Weighment Slip</option>
                                        <option value="POD" \${a.type === 'POD' ? 'selected' : ''}>POD</option>
                                        <option value="Insurance Copy" \${a.type === 'Insurance Copy' ? 'selected' : ''}>Insurance Copy</option>
                                        <option value="Other" \${a.type === 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                    <input type="file" class="trip-attachment-file text-sm flex-1" onchange="handleTripAttachmentUpload(this)">
                                    <input type="hidden" class="trip-attachment-file-value" value="\${a.file || ''}">
                                    <button type="button" class="text-red-500 hover:text-red-700 px-2 py-1 text-left sm:text-center" onclick="this.closest('.trip-attachment-row').remove()"><i class="fa-solid fa-xmark"></i> <span class="sm:hidden text-xs">Remove attachment</span></button>
                                </div>`;

// 2. Update addTripItemRow
const targetTripItemRow = `        function addTripItemRow() {
            const wrap = document.getElementById('trip-items-body');
            if (!wrap) return;
            const itemOptions = (state.data.itemMaster || []).map(i => \`<option value="\${i.name}">\${i.name}</option>\`).join('');
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-2 mb-2 trip-item-row items-center';
            row.innerHTML = \`
                <span class="col-span-1 text-xs text-gray-500">\${wrap.children.length + 1}.</span>
                <select class="col-span-4 trip-item-name p-1.5 border border-gray-200 rounded text-sm"><option value="">Select...</option>\${itemOptions}</select>
                <input type="text" class="col-span-4 trip-item-desc p-1.5 border border-gray-200 rounded text-sm" placeholder="Description">
                <input type="number" step="0.01" class="col-span-2 trip-item-weight p-1.5 border border-gray-200 rounded text-sm" placeholder="Weight(MT)">
                <button type="button" class="col-span-1 text-red-500 hover:text-red-700" onclick="this.closest('.trip-item-row').remove()"><i class="fa-solid fa-xmark"></i></button>\`;
            wrap.appendChild(row);
        }`;

const replacementTripItemRow = `        function addTripItemRow() {
            const wrap = document.getElementById('trip-items-body');
            if (!wrap) return;
            const itemOptions = (state.data.itemMaster || []).map(i => \`<option value="\${i.name}">\${i.name}</option>\`).join('');
            const row = document.createElement('div');
            row.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2 trip-item-row items-center border-b sm:border-b-0 pb-2 sm:pb-0';
            row.innerHTML = \`
                <span class="col-span-1 text-xs text-gray-500 font-bold sm:font-normal">\${wrap.children.length + 1}.</span>
                <select class="col-span-1 sm:col-span-4 trip-item-name p-1.5 border border-gray-200 rounded text-sm"><option value="">Select...</option>\${itemOptions}</select>
                <input type="text" class="col-span-1 sm:col-span-4 trip-item-desc p-1.5 border border-gray-200 rounded text-sm" placeholder="Description">
                <input type="number" step="0.01" class="col-span-1 sm:col-span-2 trip-item-weight p-1.5 border border-gray-200 rounded text-sm" placeholder="Weight(MT)">
                <button type="button" class="col-span-1 text-red-500 hover:text-red-700 py-1 text-left sm:text-center" onclick="this.closest('.trip-item-row').remove()"><i class="fa-solid fa-xmark"></i> <span class="sm:hidden text-xs">Remove item</span></button>\`;
            wrap.appendChild(row);
        }`;

// 3. Update addTripAttachmentRow
const targetTripAttachmentRow = `        function addTripAttachmentRow() {
            const wrap = document.getElementById('trip-attachments-body');
            if (!wrap) return;
            const row = document.createElement('div');
            row.className = 'flex gap-2 mb-2 items-center trip-attachment-row';
            row.innerHTML = \`
                <select class="trip-attachment-type p-1.5 border border-gray-200 rounded text-sm w-48">
                    <option value="Weighment Slip">Weighment Slip</option>
                    <option value="POD">POD</option>
                    <option value="Insurance Copy">Insurance Copy</option>
                    <option value="Other">Other</option>
                </select>
                <input type="file" class="trip-attachment-file text-sm flex-1" onchange="handleTripAttachmentUpload(this)">
                <input type="hidden" class="trip-attachment-file-value" value="">
                <button type="button" class="text-red-500 hover:text-red-700 px-2" onclick="this.closest('.trip-attachment-row').remove()"><i class="fa-solid fa-xmark"></i></button>\`;
            wrap.appendChild(row);
        }`;

const replacementTripAttachmentRow = `        function addTripAttachmentRow() {
            const wrap = document.getElementById('trip-attachments-body');
            if (!wrap) return;
            const row = document.createElement('div');
            row.className = 'flex flex-col sm:flex-row gap-2 mb-2 items-stretch sm:items-center trip-attachment-row border-b sm:border-b-0 pb-2 sm:pb-0';
            row.innerHTML = \`
                <select class="trip-attachment-type p-1.5 border border-gray-200 rounded text-sm w-full sm:w-48">
                    <option value="Weighment Slip">Weighment Slip</option>
                    <option value="POD">POD</option>
                    <option value="Insurance Copy">Insurance Copy</option>
                    <option value="Other">Other</option>
                </select>
                <input type="file" class="trip-attachment-file text-sm flex-1" onchange="handleTripAttachmentUpload(this)">
                <input type="hidden" class="trip-attachment-file-value" value="">
                <button type="button" class="text-red-500 hover:text-red-700 px-2 py-1 text-left sm:text-center" onclick="this.closest('.trip-attachment-row').remove()"><i class="fa-solid fa-xmark"></i> <span class="sm:hidden text-xs">Remove attachment</span></button>\`;
            wrap.appendChild(row);
        }`;

// 4. Update addPtSlabRow
const targetPtSlabRow = `        function addPtSlabRow() {
            const wrap = document.getElementById('field_ptSlabs_body');
            if (!wrap) return;
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-2 mb-1.5 ptslab-row items-center';
            row.innerHTML = \`
                <input type="number" class="col-span-4 ptslab-from p-1.5 border border-gray-200 rounded text-sm" placeholder="0">
                <input type="number" class="col-span-4 ptslab-to p-1.5 border border-gray-200 rounded text-sm" placeholder="999999">
                <input type="number" class="col-span-3 ptslab-amount p-1.5 border border-gray-200 rounded text-sm" placeholder="0">
                <button type="button" class="col-span-1 text-red-500 hover:text-red-700" onclick="this.closest('.ptslab-row').remove()"><i class="fa-solid fa-xmark"></i></button>\`;
            wrap.appendChild(row);
        }`;

const replacementPtSlabRow = `        function addPtSlabRow() {
            const wrap = document.getElementById('field_ptSlabs_body');
            if (!wrap) return;
            const row = document.createElement('div');
            row.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2 sm:mb-1.5 ptslab-row items-center border-b sm:border-b-0 pb-2 sm:pb-0';
            row.innerHTML = \`
                <div class="col-span-1 sm:col-span-4"><label class="sm:hidden block text-[10px] text-gray-500 font-bold mb-0.5">Salary From (₹)</label><input type="number" class="w-full ptslab-from p-1.5 border border-gray-200 rounded text-sm" placeholder="0"></div>
                <div class="col-span-1 sm:col-span-4"><label class="sm:hidden block text-[10px] text-gray-500 font-bold mb-0.5">Salary To (₹)</label><input type="number" class="w-full ptslab-to p-1.5 border border-gray-200 rounded text-sm" placeholder="999999"></div>
                <div class="col-span-1 sm:col-span-3"><label class="sm:hidden block text-[10px] text-gray-500 font-bold mb-0.5">PT / month (₹)</label><input type="number" class="w-full ptslab-amount p-1.5 border border-gray-200 rounded text-sm" placeholder="0"></div>
                <button type="button" class="col-span-1 text-red-500 hover:text-red-700 py-1 text-left sm:text-center" onclick="this.closest('.ptslab-row').remove()"><i class="fa-solid fa-xmark"></i> <span class="sm:hidden text-xs">Remove slab</span></button>\`;
            wrap.appendChild(row);
        }`;

let modified = normalized;

function checkAndReplace(target, replacement, label) {
    if (!modified.includes(target)) {
        console.error('Target not found for: ' + label);
        return false;
    }
    modified = modified.replace(target, replacement);
    console.log('Successfully replaced: ' + label);
    return true;
}

const ok1 = checkAndReplace(targetAttachmentsInModal, replacementAttachmentsInModal, 'attachmentsInModal');
const ok2 = checkAndReplace(targetTripItemRow, replacementTripItemRow, 'addTripItemRow');
const ok3 = checkAndReplace(targetTripAttachmentRow, replacementTripAttachmentRow, 'addTripAttachmentRow');
const ok4 = checkAndReplace(targetPtSlabRow, replacementPtSlabRow, 'addPtSlabRow');

if (ok1 && ok2 && ok3 && ok4) {
    const finalContent = isCrlf ? modified.replace(/\n/g, '\r\n') : modified;
    fs.writeFileSync(appJsPath, finalContent, 'utf8');
    console.log('Successfully wrote updated app.js!');
} else {
    console.error('Aborting update due to missing matches.');
    process.exit(1);
}
