const fs = require('fs');
const path = require('path');
const vm = require('vm');

const originalMasters = JSON.parse(fs.readFileSync('scratch/original_masters.json', 'utf8'));

function getNewGenerateDummyDataCode() {
    return `function generateDummyData() {
            const data = {};
            const today = new Date().toISOString().split('T')[0];
            const dummyPodSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' font-weight='bold' fill='%2364748b'%3EDriver POD Uploaded%3C/text%3E%3C/svg%3E";
            const dummySignSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Cpath d='M10,30 Q20,10 30,30 T50,30 T70,20 T90,30' fill='none' stroke='%23000080' stroke-width='2'/%3E%3C/svg%3E";

            // 1. Company Master
            data['companyMaster'] = [
                { id: 'COMP-1', name: 'GG WASTECH PVT LTD', tradeName: 'GG WASTECH (HQ Raipur)', phone: '8821937000', cin: 'U12345CT2020PTC001122', pan: 'ABCDE1234F', gstin: '22AAICG8184C1ZP', state: 'Chhattisgarh', spcb: 'SPCB/CT/2020/01', epr: 'EPR-12345', address: 'Plot 45, Industrial Area, Raipur, Chhattisgarh 492001', bankName: 'HDFC Bank', accNo: '50200012345678', ifsc: 'HDFC0001234', logo: '', plantLat: '21.2514', plantLng: '81.6296', geofenceRadius: '500', geofenceEnabled: true, attendanceSelfieRequired: true, fyStartMonth: 'April' },
                { id: 'COMP-2', name: 'GG WASTECH PVT LTD', tradeName: 'Bhilai Processing Plant', cin: 'U12345CT2020PTC001122', pan: 'ABCDE1234F', gstin: '22AAICG8184C1ZP', state: 'Chhattisgarh', spcb: 'SPCB/CT/2021/88', epr: 'EPR-12345', address: 'Phase 2, Heavy Industrial Estate, Bhilai, Chhattisgarh 490001', bankName: 'HDFC Bank', accNo: '50200012345678', ifsc: 'HDFC0001234', logo: '', plantLat: '21.1938', plantLng: '81.3509', geofenceRadius: '500', geofenceEnabled: true, attendanceSelfieRequired: true, fyStartMonth: 'April' }
            ];

            // 2. System Settings
            data['systemSettings'] = [{ id: 'SET-1', plantLat: '21.2514', plantLng: '81.6296', geofenceRadius: '500' }];

            // 3. Templates Master
            data['templatesMaster'] = [
                { id: 'TMP-1', name: 'Standard LR Terms', type: 'Lorry Receipt (LR)', content: '1. This is a digitally generated LR copy.\\n2. All disputes are subjected to Raipur jurisdiction.' },
                { id: 'TMP-2', name: 'Standard DC Terms', type: 'Delivery Challan (DC)', content: '1. This is a digitally generated DC copy.\\n2. All disputes are subjected to Raipur jurisdiction.' }
            ];

            // 4. Signatures
            data['signatureMaster'] = [{ id: 'SIGN-1', authName: 'Director A', signImage: dummySignSVG }];

            // 5. Machinery Master
            data['machineryMaster'] = [
                { id: 'MAC-1', name: 'Shredder X1', type: 'Shredder', fuelType: 'Electric', capacity: '5 Ton/hr', status: 'Active' },
                { id: 'MAC-2', name: 'DG Set 125 KVA', type: 'DG Set (Generator)', fuelType: 'Diesel', capacity: '125 KVA', status: 'Active' },
                { id: 'MAC-3', name: 'Hydraulic Baler B-50', type: 'Baler', fuelType: 'Electric', capacity: '3 Ton/hr', status: 'Active' },
                { id: 'MAC-4', name: 'Trommel Screen TS-1', type: 'Separator', fuelType: 'Electric', capacity: '10 Ton/hr', status: 'Active' }
            ];

            // 6. Consumables Master
            data['consumablesMaster'] = [
                { id: 'CON-1', name: 'Shredder Blade Set', category: 'Spare Part', unit: 'Nos.', reorderLevel: '2', lastPrice: '4500', currentStock: 8, status: 'Active', companyId: 'COMP-1' },
                { id: 'CON-2', name: 'Hydraulic Oil (20L)', category: 'Consumable', unit: 'litre', reorderLevel: '40', lastPrice: '180', currentStock: 120, status: 'Active', companyId: 'COMP-1' },
                { id: 'CON-3', name: 'Conveyor Fasteners', category: 'Spare Part', unit: 'packet', reorderLevel: '5', lastPrice: '650', currentStock: 25, status: 'Active', companyId: 'COMP-1' },
                { id: 'CON-4', name: 'Industrial Grease EP-2', category: 'Consumable', unit: 'kg', reorderLevel: '15', lastPrice: '320', currentStock: 45, status: 'Active', companyId: 'COMP-1' },
                { id: 'CON-5', name: 'Safety PPE Kit (Gloves/Helmets)', category: 'Safety Equipment', unit: 'set', reorderLevel: '10', lastPrice: '450', currentStock: 30, status: 'Active', companyId: 'COMP-1' }
            ];

            // 7. Vehicle Master
            data['vehicleMaster'] = [
                { id: 'VEH-1', party: 'FAST LOGISTICS', vehicleNo: 'CG04NF4358', companyId: 'COMP-1' },
                { id: 'VEH-2', party: 'FAST LOGISTICS', vehicleNo: 'CG04MS9722', companyId: 'COMP-1' },
                { id: 'VEH-3', party: 'FAST LOGISTICS', vehicleNo: 'CG07ZZ1122', companyId: 'COMP-2' },
                { id: 'VEH-4', party: 'KAMLESH SAHU', vehicleNo: 'CG04JB8841', companyId: 'COMP-1' },
                { id: 'VEH-5', party: 'DEEPAK BHAIYA', vehicleNo: 'CG04KU1290', companyId: 'COMP-1' },
                { id: 'VEH-6', party: 'GGL DPR', vehicleNo: 'CG04LR7733', companyId: 'COMP-2' }
            ];

            // 8. Unit Master
            data['unitMaster'] = [
                { id: 'UOM-1', name: 'MT' },
                { id: 'UOM-2', name: 'KG' },
                { id: 'UOM-3', name: 'Nos.' },
                { id: 'UOM-4', name: 'litre' },
                { id: 'UOM-5', name: 'BUNDLE' },
                { id: 'UOM-6', name: 'MTR' },
                { id: 'UOM-7', name: 'BOX' },
                { id: 'UOM-8', name: 'packet' },
                { id: 'UOM-9', name: 'set' }
            ];

            // 9. PO Type Master
            data['poTypeMaster'] = [
                { id: 'POT-1', name: 'Regular' },
                { id: 'POT-2', name: 'Open / Blanket Order' },
                { id: 'POT-3', name: 'Job Work / Processing' },
                { id: 'POT-4', name: 'Rate Contract' }
            ];

            // 10. Shifts Master
            data['shiftsMaster'] = [
                { id: 'SHIFT-1', name: 'General Day Shift', startTime: '09:00', endTime: '18:00', gracePeriod: '15', minHoursFullDay: '8.00', minHoursHalfDay: '4.00' },
                { id: 'SHIFT-2', name: 'Night Shift', startTime: '20:00', endTime: '08:00', gracePeriod: '15', minHoursFullDay: '8.00', minHoursHalfDay: '4.00' }
            ];

            // 11. Payroll Settings
            data['payrollSettings'] = [{
                id: 'PAYSET-1',
                workingDaysBasis: 'Calendar Month Days (Excl. Weekly Offs)',
                pfEmployeePct: '12', pfEmployerPct: '12', pfEpsPct: '8.33', pfEpfPct: '3.67', pfWageCeiling: '15000', pfAdminPct: '0.5', edliPct: '0.5',
                esiEmployeePct: '0.75', esiEmployerPct: '3.25', esiWageCeiling: '21000', otMultiplier: '2.0',
                ptSlabs: 'Up to 15000: Nil, 15001-20000: 150, Above 20000: 200'
            }];

            // 12. Employees
            data['employees'] = [
                { id: 'EMP-1', name: 'Super Admin User', department: 'Management', shiftId: 'General Day Shift', doj: '2023-01-15', basicPay: '30000', hra: '15000', allowances: '5000', pfApplicable: 'Yes', esiApplicable: 'No', advance: '0', otRate: '200', leaves: '12', bankName: 'SBI', accountNo: '30012345678', ifsc: 'SBIN0001234', pan: 'ABCDE1234F', uan: '100012345678', status: 'Active', companyId: 'COMP-1' },
                { id: 'EMP-2', name: 'Ramesh (Guard Raipur)', department: 'Security', shiftId: 'Night Shift', doj: '2024-06-01', basicPay: '12000', hra: '3000', allowances: '1000', pfApplicable: 'Yes', esiApplicable: 'Yes', advance: '500', otRate: '100', leaves: '6', bankName: 'HDFC', accountNo: '50100123456', ifsc: 'HDFC0001234', pan: 'XYZDE1234F', uan: '100087654321', status: 'Active', companyId: 'COMP-1' },
                { id: 'EMP-3', name: 'Suresh (Guard Bhilai)', department: 'Security', shiftId: 'General Day Shift', doj: '2024-06-15', basicPay: '12000', hra: '3000', allowances: '1000', pfApplicable: 'Yes', esiApplicable: 'Yes', advance: '0', otRate: '100', leaves: '6', bankName: 'ICICI', accountNo: '001122334455', ifsc: 'ICIC0000011', pan: 'LMNPE1234F', uan: '100099887766', status: 'Active', companyId: 'COMP-2' },
                { id: 'EMP-4', name: 'Dilip Sahu (Machine Operator)', department: 'Operations', shiftId: 'General Day Shift', doj: '2024-02-10', basicPay: '15000', hra: '3500', allowances: '1500', pfApplicable: 'Yes', esiApplicable: 'Yes', advance: '0', otRate: '120', leaves: '8', bankName: 'PNB', accountNo: '4455667788', ifsc: 'PUNB0123400', pan: 'DFGHE5678J', uan: '100044556677', status: 'Active', companyId: 'COMP-1' },
                { id: 'EMP-5', name: 'Santosh Verma (Weighbridge In-charge)', department: 'Logistics', shiftId: 'General Day Shift', doj: '2023-11-01', basicPay: '18000', hra: '4000', allowances: '2000', pfApplicable: 'Yes', esiApplicable: 'Yes', advance: '0', otRate: '150', leaves: '10', bankName: 'SBI', accountNo: '30099887766', ifsc: 'SBIN0001234', pan: 'MNBVC1234X', uan: '100066778899', status: 'Active', companyId: 'COMP-1' }
            ];

            // 13. Parties Master (Complete 17 verified parties)
            data['partiesMaster'] = ${JSON.stringify(originalMasters.partiesMaster, null, 16).trim()};

            // 14. Item Master (Complete 33 verified items)
            data['itemMaster'] = ${JSON.stringify(originalMasters.itemMaster, null, 16).trim()};

            // 15. Purchase Orders Issued (Procurement from Suppliers)
            data['poIssued'] = [
                {
                    id: '260300265', date: '2026-03-28', dueDate: '2026-04-28', poType: 'Regular', party: 'MP WASTE MGT', deliveryLocation: 'Pithampur Industrial Area', contactPerson: 'Suresh Sharma', vendorCode: 'VC002', separateConsignorConsignee: false,
                    itemName: 'EPR Credit Cat 2', itemDescription: 'EPR certified plastic waste category 2', itemQty: '109', unit: 'MT', itemRate: '1463', hsnCode: '998599', cgst: '0', sgst: '0', igst: '18', ugst: '0', totalQty: '109', consumedQty: '32.29', balanceQty: '76.71', paymentTermsDays: '30', comments: 'Quality certification required.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-ISS-2601', date: '2026-09-16', dueDate: '2026-10-31', poType: 'Regular', party: 'DELHI MSW RAIPUR', deliveryLocation: 'GG WASTECH Raipur Plant', contactPerson: 'Rajeev Bhatia', vendorCode: 'MSW20', separateConsignorConsignee: false,
                    itemName: 'MSW', itemDescription: 'Municipal Solid Waste raw material for RDF processing', itemQty: '600', unit: 'MT', itemRate: '850', hsnCode: '3825', cgst: '2.5', sgst: '2.5', igst: '0', ugst: '0', totalQty: '600', consumedQty: '342.80', balanceQty: '257.20', paymentTermsDays: '15', comments: 'Segregated non-hazardous solid waste only.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-ISS-2602', date: '2026-09-18', dueDate: '2026-10-25', poType: 'Regular', party: 'SLV WASTE MANAGEMENT PRIVATE LIMITED', deliveryLocation: 'GG WASTECH Raipur Plant', contactPerson: 'Sanjay Reddy', vendorCode: 'SLV17', separateConsignorConsignee: false,
                    itemName: 'PLASTIC WASTE', itemDescription: 'Mixed industrial plastic waste clean lot', itemQty: '300', unit: 'MT', itemRate: '14500', hsnCode: '3925', cgst: '9', sgst: '9', igst: '0', ugst: '0', totalQty: '300', consumedQty: '184.20', balanceQty: '115.80', paymentTermsDays: '30', comments: 'Moisture deduction above 2% will be deducted from weight.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-ISS-2603', date: '2026-09-20', dueDate: '2026-10-20', poType: 'Regular', party: 'MP WASTE MGT', deliveryLocation: 'GG WASTECH Raipur Plant', contactPerson: 'Suresh Sharma', vendorCode: 'VC002', separateConsignorConsignee: false,
                    itemName: 'AGRO WASTE', itemDescription: 'Paddy straw and husks agro briquette biomass input', itemQty: '250', unit: 'MT', itemRate: '2800', hsnCode: '1213', cgst: '0', sgst: '0', igst: '5', ugst: '0', totalQty: '250', consumedQty: '250.00', balanceQty: '0.00', paymentTermsDays: '21', comments: 'Direct supply from MP farms.', status: 'Closed', companyId: 'COMP-1'
                },
                {
                    id: 'PO-ISS-2604', date: '2026-09-25', dueDate: '2026-11-05', poType: 'Regular', party: 'HBMCPL AND EOWS JV', deliveryLocation: 'Bhilai Processing Plant', contactPerson: 'Manoj Tiwari', vendorCode: 'HBM19', separateConsignorConsignee: false,
                    itemName: 'PLYWOOD WASTE', itemDescription: 'Plywood and timber trimming waste', itemQty: '400', unit: 'MT', itemRate: '1950', hsnCode: '4707', cgst: '2.5', sgst: '2.5', igst: '0', ugst: '0', totalQty: '400', consumedQty: '215.60', balanceQty: '184.40', paymentTermsDays: '30', comments: 'Dry material only, no nails or iron scraps.', status: 'Open', companyId: 'COMP-2'
                },
                {
                    id: 'PO-ISS-2605', date: '2026-10-02', dueDate: '2026-10-30', poType: 'Regular', party: 'GG WASTECH PRIVATE LIMITED', deliveryLocation: 'GG WASTECH Raipur Plant', contactPerson: 'Prabin Sharma', vendorCode: 'GGWST10', separateConsignorConsignee: false,
                    itemName: 'PAPER WASTE', itemDescription: 'Old corrugated cartons and mixed paper waste', itemQty: '150', unit: 'MT', itemRate: '6200', hsnCode: '4707', cgst: '2.5', sgst: '2.5', igst: '0', ugst: '0', totalQty: '150', consumedQty: '94.50', balanceQty: '55.50', paymentTermsDays: '15', comments: 'Pressed bales preferred.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-ISS-2606', date: '2026-10-08', dueDate: '2026-11-15', poType: 'Regular', party: 'Ajay Singh', deliveryLocation: 'GG WASTECH Raipur Plant', contactPerson: 'Ajay Singh', vendorCode: 'AJAY18', separateConsignorConsignee: false,
                    itemName: 'PLASTIC WASTE', itemDescription: 'Scrap plastic bottles and films', itemQty: '100', unit: 'MT', itemRate: '13800', hsnCode: '3925', cgst: '9', sgst: '9', igst: '0', ugst: '0', totalQty: '100', consumedQty: '42.30', balanceQty: '57.70', paymentTermsDays: '7', comments: 'Weekly payment settlement against weighbridge slip.', status: 'Open', companyId: 'COMP-1'
                }
            ];

            // 16. Commercial Sales Orders Received (Sales to Clients)
            data['poReceived'] = [
                {
                    id: '1110503346', date: '2026-03-30', dueDate: '2026-04-30', poType: 'Regular', party: 'TIKAM CHAND JAIN', deliveryLocation: 'Industrial Area, Raipur', contactPerson: 'Ramesh Kumar', vendorCode: 'VC001', separateConsignorConsignee: false,
                    itemName: 'AGRO WASTE', itemDescription: 'Agricultural waste from farms', itemQty: '100', unit: 'MT', itemRate: '3000', hsnCode: '1213', cgst: '9', sgst: '9', igst: '0', ugst: '0', totalQty: '100', consumedQty: '32.29', balanceQty: '67.71', paymentTermsDays: '30', comments: 'Free from contamination.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-REC-3101', date: '2026-09-15', dueDate: '2026-11-15', poType: 'Regular', party: 'ACC LIMITED (Jamul)', deliveryLocation: 'Jamul Cement Works, Jamul', contactPerson: 'Rangesh Gupta', vendorCode: '916005447', separateConsignorConsignee: false,
                    itemName: 'SHREDDED RDF', itemDescription: 'High-calorific value shredded refuse derived fuel (GCV > 3200 kcal/kg)', itemQty: '800', unit: 'MT', itemRate: '3600', hsnCode: '3825', cgst: '9', sgst: '9', igst: '0', ugst: '0', totalQty: '800', consumedQty: '468.50', balanceQty: '331.50', paymentTermsDays: '30', comments: 'Chlorine < 0.8%, Moisture < 15%.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-REC-3102', date: '2026-09-18', dueDate: '2026-10-31', poType: 'Regular', party: 'DALMIA CEMENT (BHARAT) LIMITED', deliveryLocation: 'Banjari Works, Rohtas, Bihar', contactPerson: 'Anil Roy', vendorCode: 'DALMIA13', separateConsignorConsignee: false,
                    itemName: 'RDF', itemDescription: 'Refuse Derived Fuel for Alternative Fuel Feeding (AFR)', itemQty: '500', unit: 'MT', itemRate: '3250', hsnCode: '3825', cgst: '0', sgst: '0', igst: '18', ugst: '0', totalQty: '500', consumedQty: '286.20', balanceQty: '213.80', paymentTermsDays: '45', comments: 'Inter-state dispatch with e-Way Bill mandatory.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-REC-3103', date: '2026-09-22', dueDate: '2026-11-30', poType: 'Regular', party: 'SHREE RAIPUR CEMENT PLANT', deliveryLocation: 'Simga Plant, Baloda Bazar', contactPerson: 'Vikas Dubey', vendorCode: 'SHREE14', separateConsignorConsignee: false,
                    itemName: 'SHREDDED RDF', itemDescription: 'Shredded RDF for pre-calciner firing', itemQty: '600', unit: 'MT', itemRate: '3550', hsnCode: '3825', cgst: '9', sgst: '9', igst: '0', ugst: '0', totalQty: '600', consumedQty: '315.40', balanceQty: '284.60', paymentTermsDays: '30', comments: 'Direct plant gate weighment will be final.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-REC-3104', date: '2026-09-26', dueDate: '2026-10-25', poType: 'Regular', party: 'TIKAM CHAND JAIN', deliveryLocation: 'Transport Nagar, Raipur', contactPerson: 'Ramesh Kumar', vendorCode: 'VC001', separateConsignorConsignee: false,
                    itemName: 'AGRO WASTE', itemDescription: 'Dry agro briquettes / biomass', itemQty: '200', unit: 'MT', itemRate: '3400', hsnCode: '1213', cgst: '2.5', sgst: '2.5', igst: '0', ugst: '0', totalQty: '200', consumedQty: '200.00', balanceQty: '0.00', paymentTermsDays: '15', comments: 'Contract completed successfully.', status: 'Closed', companyId: 'COMP-1'
                },
                {
                    id: 'PO-REC-3105', date: '2026-10-01', dueDate: '2026-11-15', poType: 'Regular', party: 'MP WASTE MGT', deliveryLocation: 'Pithampur, Indore', contactPerson: 'Suresh Sharma', vendorCode: 'VC002', separateConsignorConsignee: false,
                    itemName: 'EPR Credit Cat 2', itemDescription: 'EPR Plastic Recycling Certificates', itemQty: '150', unit: 'MT', itemRate: '1800', hsnCode: '998599', cgst: '0', sgst: '0', igst: '18', ugst: '0', totalQty: '150', consumedQty: '85.00', balanceQty: '65.00', paymentTermsDays: '30', comments: 'CPCB EPR Portal portal transfer required.', status: 'Open', companyId: 'COMP-1'
                },
                {
                    id: 'PO-REC-3106', date: '2026-10-05', dueDate: '2026-11-20', poType: 'Regular', party: 'ACC LIMITED (Jamul)', deliveryLocation: 'Jamul Plant, Durg', contactPerson: 'Rangesh Gupta', vendorCode: '916005447', separateConsignorConsignee: false,
                    itemName: 'PAPER WASTE', itemDescription: 'Clean Baled Paper & OCC scrap', itemQty: '250', unit: 'MT', itemRate: '7800', hsnCode: '4707', cgst: '2.5', sgst: '2.5', igst: '0', ugst: '0', totalQty: '250', consumedQty: '98.50', balanceQty: '151.50', paymentTermsDays: '30', comments: 'Packaging raw material lot.', status: 'Open', companyId: 'COMP-2' }
            ];

            // 17. 30 Days of Operational Trips (Logistics, Gate Entry & Weighbridge)
            // Preserving original 36422655, 4581123, 9999999 and adding 25 more trips spanning 2026-09-16 to 2026-10-15
            const tripRows = [
                // Original trips preserved
                {
                    id: '36422655', tripType: 'Outward (Sales)', date: today, client: 'TIKAM CHAND JAIN', poReceived: '1110503346', poIssued: '', transportPOReceived: '', linkedTransportPOIssued: '', vehicle: 'CG04NF4358', transportBy: 'By Road', tripDate: today, freightPaidBy: 'Consignor', billType: 'To Bill', insurance: 'Yes', insurancePolicyDetails: 'Policy #INS123456', originCity: 'Raipur', originState: 'Chhattisgarh', destinationCity: 'Raipur', destinationState: 'Chhattisgarh', ewbNumber: 'EWB123456789', taxInvoiceNumber: 'INV-1', lrNumber: 'LR-1001', challanNumber: 'DC-1001', separateConsignorConsignee: false, clientTransportationCharge: '5000', transporterTransportationCharge: '4500', termsConditions: 'Standard transportation terms apply', driverName: 'Ustad Ramu', driverPhone: '9876500011', acceptanceStatus: 'Delivered', netWeight: '32.72', receivedWeight: '32.29', podPhoto: dummyPodSvg, status: 'Completed', grnId: 'GRN-1', invoiceId: 'INV-1', companyId: 'COMP-1'
                },
                {
                    id: '4581123', tripType: 'Inward (Purchase)', date: today, client: 'MP WASTE MGT', poReceived: '', poIssued: '260300265', transportPOReceived: '', linkedTransportPOIssued: '', vehicle: 'CG04MS9722', transportBy: 'By Road', tripDate: today, freightPaidBy: 'Consignee', billType: 'To Pay', insurance: 'No', insurancePolicyDetails: '', originCity: 'Indore', originState: 'Madhya Pradesh', destinationCity: 'Raipur', destinationState: 'Chhattisgarh', ewbNumber: 'EWB987654321', taxInvoiceNumber: '', lrNumber: 'LR-1002', challanNumber: 'DC-1002', separateConsignorConsignee: false, clientTransportationCharge: '8000', transporterTransportationCharge: '7500', termsConditions: 'Standard inward terms apply', driverName: 'Ustad Shyam', driverPhone: '9876500022', acceptanceStatus: 'In Transit', netWeight: '120.50', receivedWeight: '0', podPhoto: '', status: 'In Progress', grnId: '', invoiceId: '', companyId: 'COMP-1'
                },
                {
                    id: '9999999', tripType: 'Inward (Purchase)', date: today, client: 'Ajay Singh', poReceived: '', poIssued: '', transportPOReceived: '', linkedTransportPOIssued: '', vehicle: 'CG07ZZ1122', transportBy: 'By Road', tripDate: today, freightPaidBy: 'Consignor', billType: 'To Pay', insurance: 'Yes', insurancePolicyDetails: 'Local transport coverage', originCity: 'Bhilai', originState: 'Chhattisgarh', destinationCity: 'Bhilai', destinationState: 'Chhattisgarh', ewbNumber: '', taxInvoiceNumber: '', lrNumber: 'LR-1003', challanNumber: 'DC-1003', separateConsignorConsignee: false, clientTransportationCharge: '3000', transporterTransportationCharge: '2500', termsConditions: 'Local vendor terms apply', driverName: 'Raju Yadav', driverPhone: '9876500033', acceptanceStatus: 'Pending Acceptance', netWeight: '45.00', receivedWeight: '0', podPhoto: '', status: 'In Progress', grnId: '', invoiceId: '', companyId: 'COMP-2'
                }
            ];

            const extraTripDefs = [
                ['2026-09-16', 'Inward (Purchase)', 'DELHI MSW RAIPUR', '', 'PO-ISS-2601', '32.50', 'CG04NF4358', 'Ustad Ramu', 'Raipur', 'Raipur', 'EWB260901', '', 'GRN-101', 'Completed', 'COMP-1'],
                ['2026-09-17', 'Outward (Sales)', 'ACC LIMITED (Jamul)', 'PO-REC-3101', '', '28.40', 'CG04MS9722', 'Ustad Shyam', 'Raipur', 'Jamul', 'EWB260902', 'INV-2026-001', '', 'Completed', 'COMP-1'],
                ['2026-09-18', 'Inward (Purchase)', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', '', 'PO-ISS-2602', '24.60', 'CG04JB8841', 'Raju Yadav', 'Raipur', 'Raipur', 'EWB260903', '', 'GRN-102', 'Completed', 'COMP-1'],
                ['2026-09-19', 'Outward (Sales)', 'DALMIA CEMENT (BHARAT) LIMITED', 'PO-REC-3102', '', '31.20', 'CG04KU1290', 'Santosh Verma', 'Raipur', 'Rohtas', 'EWB260904', 'INV-2026-002', '', 'Completed', 'COMP-1'],
                ['2026-09-21', 'Inward (Purchase)', 'MP WASTE MGT', '', 'PO-ISS-2603', '27.80', 'CG04NF4358', 'Ustad Ramu', 'Indore', 'Raipur', 'EWB260905', '', 'GRN-103', 'Completed', 'COMP-1'],
                ['2026-09-22', 'Outward (Sales)', 'SHREE RAIPUR CEMENT PLANT', 'PO-REC-3103', '', '29.50', 'CG04MS9722', 'Ustad Shyam', 'Raipur', 'Baloda Bazar', 'EWB260906', 'INV-2026-003', '', 'Completed', 'COMP-1'],
                ['2026-09-23', 'Inward (Purchase)', 'DELHI MSW RAIPUR', '', 'PO-ISS-2601', '34.10', 'CG04JB8841', 'Raju Yadav', 'Raipur', 'Raipur', 'EWB260907', '', 'GRN-104', 'Completed', 'COMP-1'],
                ['2026-09-24', 'Outward (Sales)', 'ACC LIMITED (Jamul)', 'PO-REC-3101', '', '30.10', 'CG04LR7733', 'Dilip Sahu', 'Raipur', 'Jamul', 'EWB260908', 'INV-2026-004', '', 'Completed', 'COMP-1'],
                ['2026-09-25', 'Inward (Purchase)', 'HBMCPL AND EOWS JV', '', 'PO-ISS-2604', '22.80', 'CG07ZZ1122', 'Kamlesh Sahu', 'Raipur', 'Bhilai', 'EWB260909', '', 'GRN-105', 'Completed', 'COMP-2'],
                ['2026-09-26', 'Outward (Sales)', 'TIKAM CHAND JAIN', 'PO-REC-3104', '', '33.20', 'CG04NF4358', 'Ustad Ramu', 'Raipur', 'Raipur', 'EWB260910', 'INV-2026-005', '', 'Completed', 'COMP-1'],
                ['2026-09-28', 'Inward (Purchase)', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', '', 'PO-ISS-2602', '26.40', 'CG04MS9722', 'Ustad Shyam', 'Raipur', 'Raipur', 'EWB260911', '', 'GRN-106', 'Completed', 'COMP-1'],
                ['2026-09-29', 'Outward (Sales)', 'DALMIA CEMENT (BHARAT) LIMITED', 'PO-REC-3102', '', '32.60', 'CG04KU1290', 'Santosh Verma', 'Raipur', 'Rohtas', 'EWB260912', 'INV-2026-006', '', 'Completed', 'COMP-1'],
                ['2026-09-30', 'Inward (Purchase)', 'DELHI MSW RAIPUR', '', 'PO-ISS-2601', '33.90', 'CG04JB8841', 'Raju Yadav', 'Raipur', 'Raipur', 'EWB260913', '', 'GRN-107', 'Completed', 'COMP-1'],
                ['2026-10-01', 'Outward (Sales)', 'ACC LIMITED (Jamul)', 'PO-REC-3101', '', '31.80', 'CG04NF4358', 'Ustad Ramu', 'Raipur', 'Jamul', 'EWB261001', 'INV-2026-007', '', 'Completed', 'COMP-1'],
                ['2026-10-02', 'Inward (Purchase)', 'GG WASTECH PRIVATE LIMITED', '', 'PO-ISS-2605', '25.30', 'CG04MS9722', 'Ustad Shyam', 'Raipur', 'Raipur', 'EWB261002', '', 'GRN-108', 'Completed', 'COMP-1'],
                ['2026-10-03', 'Outward (Sales)', 'SHREE RAIPUR CEMENT PLANT', 'PO-REC-3103', '', '30.40', 'CG04LR7733', 'Dilip Sahu', 'Raipur', 'Baloda Bazar', 'EWB261003', 'INV-2026-008', '', 'Completed', 'COMP-1'],
                ['2026-10-05', 'Inward (Purchase)', 'HBMCPL AND EOWS JV', '', 'PO-ISS-2604', '28.10', 'CG07ZZ1122', 'Kamlesh Sahu', 'Raipur', 'Bhilai', 'EWB261004', '', 'GRN-109', 'Completed', 'COMP-2'],
                ['2026-10-06', 'Outward (Sales)', 'ACC LIMITED (Jamul)', 'PO-REC-3106', '', '26.50', 'CG04NF4358', 'Ustad Ramu', 'Bhilai', 'Jamul', 'EWB261005', 'INV-2026-009', '', 'Completed', 'COMP-2'],
                ['2026-10-07', 'Inward (Purchase)', 'DELHI MSW RAIPUR', '', 'PO-ISS-2601', '35.00', 'CG04JB8841', 'Raju Yadav', 'Raipur', 'Raipur', 'EWB261006', '', 'GRN-110', 'Completed', 'COMP-1'],
                ['2026-10-08', 'Outward (Sales)', 'DALMIA CEMENT (BHARAT) LIMITED', 'PO-REC-3102', '', '33.80', 'CG04KU1290', 'Santosh Verma', 'Raipur', 'Rohtas', 'EWB261007', 'INV-2026-010', '', 'Completed', 'COMP-1'],
                ['2026-10-09', 'Inward (Purchase)', 'Ajay Singh', '', 'PO-ISS-2606', '19.50', 'CG04MS9722', 'Ustad Shyam', 'Raipur', 'Raipur', 'EWB261008', '', 'GRN-111', 'Completed', 'COMP-1'],
                ['2026-10-10', 'Outward (Sales)', 'ACC LIMITED (Jamul)', 'PO-REC-3101', '', '32.10', 'CG04NF4358', 'Ustad Ramu', 'Raipur', 'Jamul', 'EWB261009', 'INV-2026-011', '', 'Completed', 'COMP-1'],
                ['2026-10-12', 'Inward (Purchase)', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', '', 'PO-ISS-2602', '27.50', 'CG04JB8841', 'Raju Yadav', 'Raipur', 'Raipur', 'EWB261010', '', 'GRN-112', 'Completed', 'COMP-1'],
                ['2026-10-13', 'Outward (Sales)', 'SHREE RAIPUR CEMENT PLANT', 'PO-REC-3103', '', '28.90', 'CG04LR7733', 'Dilip Sahu', 'Raipur', 'Baloda Bazar', 'EWB261011', 'INV-2026-012', '', 'Completed', 'COMP-1'],
                ['2026-10-14', 'Inward (Purchase)', 'DELHI MSW RAIPUR', '', 'PO-ISS-2601', '33.50', 'CG04MS9722', 'Ustad Shyam', 'Raipur', 'Raipur', 'EWB261012', '', 'GRN-113', 'Completed', 'COMP-1'],
                ['2026-10-14', 'Outward (Sales)', 'ACC LIMITED (Jamul)', 'PO-REC-3101', '', '31.40', 'CG04NF4358', 'Ustad Ramu', 'Raipur', 'Jamul', 'EWB261013', 'INV-2026-013', '', 'Completed', 'COMP-1'],
                ['2026-10-15', 'Outward (Sales)', 'DALMIA CEMENT (BHARAT) LIMITED', 'PO-REC-3102', '', '32.50', 'CG04KU1290', 'Santosh Verma', 'Raipur', 'Rohtas', 'EWB261014', 'INV-2026-014', '', 'In Transit', 'COMP-1']
            ];

            extraTripDefs.forEach((t, idx) => {
                const tripId = (36422700 + idx).toString();
                const [date, tripType, client, poReceived, poIssued, netWeight, vehicle, driverName, originCity, destinationCity, ewbNumber, invoiceId, grnId, status, companyId] = t;
                const isOutward = tripType.includes('Outward');
                const originState = 'Chhattisgarh';
                const destinationState = destinationCity.includes('Rohtas') ? 'Bihar' : (originCity.includes('Indore') ? 'Madhya Pradesh' : 'Chhattisgarh');
                const freight = isOutward ? '5500' : '4500';

                tripRows.push({
                    id: tripId,
                    tripType,
                    date,
                    client,
                    poReceived,
                    poIssued,
                    transportPOReceived: '',
                    linkedTransportPOIssued: '',
                    vehicle,
                    transportBy: 'By Road',
                    tripDate: date,
                    freightPaidBy: isOutward ? 'Consignor' : 'Consignee',
                    billType: 'To Bill',
                    insurance: 'Yes',
                    insurancePolicyDetails: 'Policy #INS-' + (882100 + idx),
                    originCity,
                    originState,
                    destinationCity,
                    destinationState,
                    ewbNumber,
                    taxInvoiceNumber: invoiceId || '',
                    lrNumber: 'LR-2026-' + (500 + idx),
                    challanNumber: 'DC-2026-' + (700 + idx),
                    separateConsignorConsignee: false,
                    clientTransportationCharge: freight,
                    transporterTransportationCharge: (parseInt(freight) - 500).toString(),
                    termsConditions: 'Standard industrial transportation terms apply.',
                    driverName,
                    driverPhone: '98765000' + (10 + (idx % 10)),
                    acceptanceStatus: status === 'Completed' ? 'Delivered' : (status === 'In Transit' ? 'In Transit' : 'At Weighbridge'),
                    netWeight,
                    receivedWeight: status === 'Completed' ? (parseFloat(netWeight) * 0.99).toFixed(2) : '0',
                    podPhoto: status === 'Completed' ? dummyPodSvg : '',
                    status,
                    invoiceId: invoiceId || '',
                    grnId: grnId || '',
                    companyId
                });
            });

            data['trips'] = tripRows;

            // 18. Gate Verification Records (Matching All Trips)
            data['gateVerification'] = data['trips'].map((t, idx) => ({
                id: 'GATE-' + (1001 + idx),
                tripId: t.id,
                type: t.tripType.includes('Inward') ? 'Inward (Entering Plant)' : 'Outward (Leaving Plant)',
                vehicleNo: t.vehicle,
                driverName: t.driverName,
                driverPhone: t.driverPhone,
                status: t.status === 'Completed' ? 'Approved' : 'Verified',
                photoFront: dummyPodSvg,
                photoBack: dummyPodSvg,
                remarks: 'Physical vehicle inspection completed at gate entry.',
                companyId: t.companyId
            }));

            // 19. Goods Receipt Notes (GRN for Inward Trips)
            // Preserving original GRN-1 and adding GRNs for the past month
            data['grn'] = [
                {
                    id: 'GRN-1', fromDate: today, toDate: today, client: 'TIKAM CHAND JAIN', poRef: '1110503346', itemDisplay: 'AGRO WASTE', condition: 'Good',
                    tripSelection: [{ tripId: '36422655', tripWeight: 32.72, receivedWeight: 32.29, grnWeight: 32.29, shortage: 0, materialDocNumber: 'DOC-1001' }],
                    totalWeight: 32.29, totalShortage: 0, invoiceId: 'INV-1', companyId: 'COMP-1'
                }
            ];

            const inwardCompleted = data['trips'].filter(t => t.tripType.includes('Inward') && t.status === 'Completed' && t.grnId && t.grnId !== 'GRN-1');
            inwardCompleted.forEach((t, idx) => {
                const wt = parseFloat(t.netWeight);
                const shortage = parseFloat((wt * 0.015).toFixed(2));
                const accepted = (wt - shortage).toFixed(2);
                data['grn'].push({
                    id: t.grnId || ('GRN-' + (101 + idx)),
                    client: t.client,
                    poRef: t.poIssued,
                    itemDisplay: 'Industrial Scrap Input (' + t.client + ')',
                    fromDate: t.date,
                    toDate: t.date,
                    condition: 'Moisture Deducted / Quality Passed',
                    tripSelection: [
                        {
                            tripId: t.id,
                            tripWeight: wt,
                            receivedWeight: accepted,
                            grnWeight: accepted,
                            shortage,
                            materialDocNumber: 'DOC-' + (9000 + idx)
                        }
                    ],
                    totalWeight: accepted,
                    totalShortage: shortage,
                    invoiceId: '',
                    companyId: t.companyId
                });
            });

            // 20. Sales Invoices (GST Tax Invoices for Outward Trips)
            // Preserving original INV-1 and generating for completed dispatches
            data['invoices'] = [
                {
                    id: 'INV-1', date: today, client: 'TIKAM CHAND JAIN', poRef: '1110503346', createWithGrn: true, grnRef: 'GRN-1', paymentTermsDays: '30',
                    comments: 'Initial demo tax invoice', totalQty: 32.29, amount: 96870, taxAmount: 4843.5, totalAmount: 101713.5, status: 'Proforma', companyId: 'COMP-1'
                }
            ];

            const outwardWithInv = data['trips'].filter(t => t.tripType.includes('Outward') && t.invoiceId && t.invoiceId !== 'INV-1');
            outwardWithInv.forEach((t, idx) => {
                const isInterState = t.destinationState !== 'Chhattisgarh';
                const po = data['poReceived'].find(p => p.id === t.poReceived);
                const rate = po ? parseFloat(po.itemRate) : 3500;
                const qty = parseFloat(t.netWeight);
                const amount = Math.round(qty * rate);
                const taxRate = 0.18; // 18% GST (CGST+SGST or IGST)
                const taxAmount = Math.round(amount * taxRate);
                const totalAmount = amount + taxAmount;
                const isOld = t.date < '2026-10-05';

                data['invoices'].push({
                    id: t.invoiceId,
                    client: t.client,
                    poRef: t.poReceived,
                    date: t.date,
                    createWithGrn: false,
                    grnRef: '',
                    paymentTermsDays: '30',
                    comments: 'GST Tax Invoice against Outward Weighbridge Ticket #' + t.id,
                    totalQty: qty,
                    amount,
                    taxAmount,
                    totalAmount,
                    status: isOld ? 'Paid' : 'Sent',
                    companyId: t.companyId
                });
            });

            // Proforma invoice for today's in-transit dispatch
            data['invoices'].push({
                id: 'INV-2026-014', client: 'DALMIA CEMENT (BHARAT) LIMITED', poRef: 'PO-REC-3102', date: '2026-10-15', createWithGrn: false, grnRef: '',
                paymentTermsDays: '45', comments: 'Proforma Tax Invoice for In-Transit Consignment EWB261014', totalQty: 32.50,
                amount: Math.round(32.50 * 3250), taxAmount: Math.round(32.50 * 3250 * 0.18), totalAmount: Math.round(32.50 * 3250 * 1.18), status: 'Proforma', companyId: 'COMP-1'
            });

            // 21. Received Invoices (Vendor Bills for Raw Materials)
            data['receivedInvoice'] = inwardCompleted.map((t, idx) => {
                const po = data['poIssued'].find(p => p.id === t.poIssued);
                const rate = po ? parseFloat(po.itemRate) : 850;
                const qty = parseFloat(t.netWeight);
                const amount = Math.round(qty * rate);
                const taxAmount = Math.round(amount * 0.05); // 5% GST on waste/scrap
                const totalAmount = amount + taxAmount;
                const isOld = t.date < '2026-10-05';

                return {
                    id: 'REC-INV-' + (2001 + idx),
                    vendor: t.client,
                    poRef: t.poIssued,
                    date: t.date,
                    dueDate: '2026-11-15',
                    vendorInvoiceNumber: 'BILL/' + t.client.substring(0, 3).toUpperCase() + '/' + (500 + idx),
                    qty,
                    rate,
                    amount,
                    taxAmount,
                    totalAmount,
                    status: isOld ? 'Paid' : 'Pending',
                    companyId: t.companyId
                };
            });

            // 22. Daily Machine Logs (Full 30 Days: 2026-09-16 to 2026-10-15)
            data['machineLogs'] = [];
            let shredderHours = 1450.00;
            let dgHours = 820.00;
            let dgDiesel = 95.00;

            function addDailyMachineLogs(dateStr) {
                // Shredder X1 (Electric)
                const runHrs1 = (7.0 + (dateStr.charCodeAt(dateStr.length - 1) % 4) * 0.5).toFixed(2);
                const open1 = shredderHours.toFixed(2);
                shredderHours += parseFloat(runHrs1);
                const close1 = shredderHours.toFixed(2);
                const kwh = Math.round(parseFloat(runHrs1) * 28.5);

                data['machineLogs'].push({
                    id: 'ML-SHR-' + dateStr,
                    date: dateStr,
                    machine: 'Shredder X1',
                    shift: 'General Day Shift',
                    operator: 'Dilip Sahu',
                    openingReading: open1,
                    openingTime: '09:00',
                    openingDieselReading: '0.00',
                    closingReading: close1,
                    closingTime: '17:30',
                    closingDieselReading: '0.00',
                    dieselFilled: '0.00',
                    dieselFillingTime: '',
                    dieselFillingTimeReading: '0.00',
                    dieselShowAfterFilling: '0.00',
                    hourReadingAtFilling: '0.00',
                    runningHours: runHrs1,
                    dieselConsumed: '0.00',
                    avgLtrPerHour: '0.00',
                    elecUsed: kwh.toString(),
                    remarks: 'Smooth operation, shredding input scrap to < 50mm.',
                    companyId: 'COMP-1'
                });

                // DG Set 125 KVA (Diesel) - runs every other day
                const dayNum = parseInt(dateStr.split('-')[2]);
                if (dayNum % 2 === 0) {
                    const runHrs2 = (2.5 + (dayNum % 3) * 0.5).toFixed(2);
                    const open2 = dgHours.toFixed(2);
                    dgHours += parseFloat(runHrs2);
                    const close2 = dgHours.toFixed(2);
                    const consumed = (parseFloat(runHrs2) * 12.8).toFixed(2);
                    let filled = '0.00';
                    if (dgDiesel < 40) {
                        filled = '80.00';
                        dgDiesel += 80;
                    }
                    const openDiesel = dgDiesel.toFixed(2);
                    dgDiesel -= parseFloat(consumed);
                    const closeDiesel = dgDiesel.toFixed(2);

                    data['machineLogs'].push({
                        id: 'ML-DG-' + dateStr,
                        date: dateStr,
                        machine: 'DG Set 125 KVA',
                        shift: 'General Day Shift',
                        operator: 'Ramesh Kumar',
                        openingReading: open2,
                        openingTime: '14:00',
                        openingDieselReading: openDiesel,
                        closingReading: close2,
                        closingTime: '17:00',
                        closingDieselReading: closeDiesel,
                        dieselFilled: filled,
                        dieselFillingTime: filled !== '0.00' ? '13:30' : '',
                        dieselFillingTimeReading: filled !== '0.00' ? open2 : '0.00',
                        dieselShowAfterFilling: (parseFloat(openDiesel) + parseFloat(filled)).toFixed(2),
                        hourReadingAtFilling: open2,
                        runningHours: runHrs2,
                        dieselConsumed: consumed,
                        avgLtrPerHour: '12.80',
                        elecUsed: '0',
                        remarks: 'Backup generator engaged during grid feeder maintenance.',
                        companyId: 'COMP-1'
                    });
                }
            }

            for (let day = 16; day <= 30; day++) {
                addDailyMachineLogs('2026-09-' + (day < 10 ? '0' + day : day));
            }
            for (let day = 1; day <= 15; day++) {
                addDailyMachineLogs('2026-10-' + (day < 10 ? '0' + day : day));
            }

            // 23. Consumable Logs (Movements across 30 Days)
            // Preserving original CL-1 to CL-4 and adding full month logs
            data['consumableLogs'] = [
                { id: 'CL-1', date: today, consumable: 'CON-1', movementType: 'Purchased (In)', quantity: '5', pricePerUnit: '4500', totalAmount: '22500', issuedTo: '', machine: '', remarks: 'Bulk purchase for quarter', companyId: 'COMP-1' },
                { id: 'CL-2', date: today, consumable: 'CON-1', movementType: 'Issued (Out)', quantity: '2', pricePerUnit: '4500', totalAmount: '9000', issuedTo: 'EMP-4', machine: 'MAC-1', remarks: 'Blade replacement', companyId: 'COMP-1' },
                { id: 'CL-3', date: today, consumable: 'CON-2', movementType: 'Purchased (In)', quantity: '80', pricePerUnit: '180', totalAmount: '14400', issuedTo: '', machine: '', remarks: 'Hydraulic oil drums', companyId: 'COMP-1' },
                { id: 'CL-4', date: today, consumable: 'CON-2', movementType: 'Issued (Out)', quantity: '20', pricePerUnit: '180', totalAmount: '3600', issuedTo: 'EMP-4', machine: 'MAC-2', remarks: 'DG Set servicing', companyId: 'COMP-1' },
                { id: 'CL-05', date: '2026-09-16', consumable: 'CON-1', movementType: 'Purchased (In)', quantity: '10', pricePerUnit: '4500', totalAmount: '45000', issuedTo: '', machine: '', remarks: 'Stock replenishment from tool supplier', companyId: 'COMP-1' },
                { id: 'CL-06', date: '2026-09-18', consumable: 'CON-1', movementType: 'Issued (Out)', quantity: '2', pricePerUnit: '4500', totalAmount: '9000', issuedTo: 'EMP-4', machine: 'MAC-1', remarks: 'Shredder blade replacement set 1', companyId: 'COMP-1' },
                { id: 'CL-07', date: '2026-09-20', consumable: 'CON-2', movementType: 'Purchased (In)', quantity: '100', pricePerUnit: '180', totalAmount: '18000', issuedTo: '', machine: '', remarks: 'Hydraulic oil barrel received', companyId: 'COMP-1' },
                { id: 'CL-08', date: '2026-09-22', consumable: 'CON-2', movementType: 'Issued (Out)', quantity: '20', pricePerUnit: '180', totalAmount: '3600', issuedTo: 'EMP-4', machine: 'MAC-3', remarks: 'Hydraulic baler oil top-up', companyId: 'COMP-1' },
                { id: 'CL-09', date: '2026-09-25', consumable: 'CON-3', movementType: 'Purchased (In)', quantity: '20', pricePerUnit: '650', totalAmount: '13000', issuedTo: '', machine: '', remarks: 'Conveyor fasteners stock', companyId: 'COMP-1' },
                { id: 'CL-10', date: '2026-09-28', consumable: 'CON-4', movementType: 'Purchased (In)', quantity: '30', pricePerUnit: '320', totalAmount: '9600', issuedTo: '', machine: '', remarks: 'High temperature grease bucket', companyId: 'COMP-1' },
                { id: 'CL-11', date: '2026-09-29', consumable: 'CON-4', movementType: 'Issued (Out)', quantity: '5', pricePerUnit: '320', totalAmount: '1600', issuedTo: 'EMP-4', machine: 'MAC-1', remarks: 'Main bearing greasing', companyId: 'COMP-1' },
                { id: 'CL-12', date: '2026-10-02', consumable: 'CON-5', movementType: 'Purchased (In)', quantity: '25', pricePerUnit: '450', totalAmount: '11250', issuedTo: '', machine: '', remarks: 'Quarterly PPE replacement kits', companyId: 'COMP-1' },
                { id: 'CL-13', date: '2026-10-03', consumable: 'CON-5', movementType: 'Issued (Out)', quantity: '10', pricePerUnit: '450', totalAmount: '4500', issuedTo: 'EMP-2', machine: '', remarks: 'Issued to security & sorting staff', companyId: 'COMP-1' },
                { id: 'CL-14', date: '2026-10-06', consumable: 'CON-2', movementType: 'Issued (Out)', quantity: '15', pricePerUnit: '180', totalAmount: '2700', issuedTo: 'EMP-4', machine: 'MAC-1', remarks: 'Gearbox lubrication', companyId: 'COMP-1' },
                { id: 'CL-15', date: '2026-10-10', consumable: 'CON-1', movementType: 'Issued (Out)', quantity: '2', pricePerUnit: '4500', totalAmount: '9000', issuedTo: 'EMP-4', machine: 'MAC-1', remarks: 'Blade rotation maintenance', companyId: 'COMP-1' },
                { id: 'CL-16', date: '2026-10-14', consumable: 'CON-3', movementType: 'Issued (Out)', quantity: '4', pricePerUnit: '650', totalAmount: '2600', issuedTo: 'EMP-4', machine: 'MAC-4', remarks: 'Trommel feed belt joint repair', companyId: 'COMP-1' }
            ];

            // 24. Daily Attendance (Complete 30 Days: 2026-09-16 to 2026-10-15)
            data['attendance'] = [];
            const empList = [
                { id: 'EMP-1', comp: 'COMP-1', in: '09:05', out: '18:15', hrs: '9.15' },
                { id: 'EMP-2', comp: 'COMP-1', in: '20:00', out: '08:00', hrs: '12.00' },
                { id: 'EMP-3', comp: 'COMP-2', in: '08:55', out: '18:00', hrs: '9.10' },
                { id: 'EMP-4', comp: 'COMP-1', in: '09:00', out: '17:45', hrs: '8.75' },
                { id: 'EMP-5', comp: 'COMP-1', in: '08:45', out: '18:30', hrs: '9.75' }
            ];

            function addDailyAttendance(dateStr) {
                const d = new Date(dateStr);
                const isSunday = d.getDay() === 0;

                empList.forEach(emp => {
                    const attId = 'ATT-' + emp.id + '-' + dateStr;
                    if (isSunday) {
                        data['attendance'].push({
                            id: attId,
                            date: dateStr,
                            empId: emp.id,
                            punchTime: '',
                            punchPhoto: '',
                            punchLat: '',
                            punchLng: '',
                            punchGeofence: 'Yes',
                            punchOutTime: '',
                            punchOutPhoto: '',
                            punchOutLat: '',
                            punchOutLng: '',
                            punchOutGeofence: '',
                            totalHours: '0.00',
                            status: 'Weekly Off',
                            companyId: emp.comp
                        });
                    } else {
                        data['attendance'].push({
                            id: attId,
                            date: dateStr,
                            empId: emp.id,
                            punchTime: emp.in,
                            punchPhoto: dummyPodSvg,
                            punchLat: '21.2514',
                            punchLng: '81.6296',
                            punchGeofence: 'Yes',
                            punchOutTime: emp.out,
                            punchOutPhoto: dummyPodSvg,
                            punchOutLat: '21.2514',
                            punchOutLng: '81.6296',
                            punchOutGeofence: 'Yes',
                            totalHours: emp.hrs,
                            status: 'Present',
                            companyId: emp.comp
                        });
                    }
                });
            }

            for (let day = 16; day <= 30; day++) {
                addDailyAttendance('2026-09-' + (day < 10 ? '0' + day : day));
            }
            for (let day = 1; day <= 15; day++) {
                addDailyAttendance('2026-10-' + (day < 10 ? '0' + day : day));
            }

            // Also ensure ATT-1 and ATT-2 exist for backwards test compatibility
            if (!data['attendance'].find(a => a.id === 'ATT-1')) {
                data['attendance'].unshift({ id: 'ATT-1', date: today, empId: 'EMP-2', status: 'Present', companyId: 'COMP-1', punchTime: '09:05', totalHours: '9.00' });
            }
            if (!data['attendance'].find(a => a.id === 'ATT-2')) {
                data['attendance'].unshift({ id: 'ATT-2', date: today, empId: 'EMP-3', status: 'Present', companyId: 'COMP-2', punchTime: '08:50', totalHours: '9.25' });
            }

            // 25. Monthly Payroll Ledger (September 2026 Paid + October 2026 Draft)
            data['payrollLedger'] = [
                {
                    id: 'PAY-2026-09-EMP-1', monthYear: '2026-09', empId: 'EMP-1', payableDays: 30, presentDays: 26, halfDays: 0, lateDays: 1, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 4, holidayDays: 0, missingPunchDays: 0, otHours: 0, otAmount: 0,
                    grossEarned: 50000, pfDeduction: 1800, esiDeduction: 0, ptDeduction: 200, advance: 0, totalDeductions: 2000, employerPF: 1800, employerESI: 0, netSalary: 48000, status: 'Paid', companyId: 'COMP-1'
                },
                {
                    id: 'PAY-2026-09-EMP-2', monthYear: '2026-09', empId: 'EMP-2', payableDays: 30, presentDays: 26, halfDays: 0, lateDays: 0, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 4, holidayDays: 0, missingPunchDays: 0, otHours: 12, otAmount: 1200,
                    grossEarned: 17200, pfDeduction: 1440, esiDeduction: 129, ptDeduction: 150, advance: 500, totalDeductions: 2219, employerPF: 1440, employerESI: 559, netSalary: 14981, status: 'Paid', companyId: 'COMP-1'
                },
                {
                    id: 'PAY-2026-09-EMP-3', monthYear: '2026-09', empId: 'EMP-3', payableDays: 30, presentDays: 26, halfDays: 0, lateDays: 2, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 4, holidayDays: 0, missingPunchDays: 0, otHours: 8, otAmount: 800,
                    grossEarned: 16800, pfDeduction: 1440, esiDeduction: 126, ptDeduction: 150, advance: 0, totalDeductions: 1716, employerPF: 1440, employerESI: 546, netSalary: 15084, status: 'Paid', companyId: 'COMP-2'
                },
                {
                    id: 'PAY-2026-09-EMP-4', monthYear: '2026-09', empId: 'EMP-4', payableDays: 30, presentDays: 25, halfDays: 0, lateDays: 1, absentDays: 0, paidLeaveDays: 1, unpaidLeaveDays: 0, weeklyOffDays: 4, holidayDays: 0, missingPunchDays: 0, otHours: 10, otAmount: 1200,
                    grossEarned: 21200, pfDeduction: 1800, esiDeduction: 159, ptDeduction: 200, advance: 0, totalDeductions: 2159, employerPF: 1800, employerESI: 689, netSalary: 19041, status: 'Paid', companyId: 'COMP-1'
                },
                {
                    id: 'PAY-2026-09-EMP-5', monthYear: '2026-09', empId: 'EMP-5', payableDays: 30, presentDays: 26, halfDays: 0, lateDays: 0, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 4, holidayDays: 0, missingPunchDays: 0, otHours: 15, otAmount: 2250,
                    grossEarned: 26250, pfDeduction: 1800, esiDeduction: 197, ptDeduction: 200, advance: 0, totalDeductions: 2197, employerPF: 1800, employerESI: 853, netSalary: 24053, status: 'Paid', companyId: 'COMP-1'
                },
                {
                    id: 'PAY-2026-10-EMP-1', monthYear: '2026-10', empId: 'EMP-1', payableDays: 15, presentDays: 13, halfDays: 0, lateDays: 0, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 2, holidayDays: 0, missingPunchDays: 0, otHours: 0, otAmount: 0,
                    grossEarned: 25000, pfDeduction: 900, esiDeduction: 0, ptDeduction: 100, advance: 0, totalDeductions: 1000, employerPF: 900, employerESI: 0, netSalary: 24000, status: 'Draft', companyId: 'COMP-1'
                },
                {
                    id: 'PAY-2026-10-EMP-2', monthYear: '2026-10', empId: 'EMP-2', payableDays: 15, presentDays: 13, halfDays: 0, lateDays: 0, absentDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, weeklyOffDays: 2, holidayDays: 0, missingPunchDays: 0, otHours: 6, otAmount: 600,
                    grossEarned: 8600, pfDeduction: 720, esiDeduction: 65, ptDeduction: 75, advance: 0, totalDeductions: 860, employerPF: 720, employerESI: 280, netSalary: 7740, status: 'Draft', companyId: 'COMP-1' }
            ];

            // 26. Roles Master
            let adminPerms = {};
            Object.keys(modulesConfig).forEach(k => { if (!modulesConfig[k].hideFromMatrix) adminPerms[k] = { view: true, add: true, edit: true, delete: true }; });
            data['rolesMaster'] = [
                { id: 'ROLE-ADMIN', roleName: 'Super Administrator', desc: 'Full unrestricted system access to all plants and modules.', permissions: adminPerms },
                { id: 'ROLE-SECURITY', roleName: 'Gate Security', desc: 'Gate verification, driver details, and camera capture access.', permissions: { gateVerification: { view: true, add: true, edit: true, delete: false }, trips: { view: true, add: true, edit: false, delete: false }, attendance: { view: true, add: true, edit: false, delete: false } } }
            ];

            // 27. Users Master
            data['usersMaster'] = [
                { id: 'USER-001', username: 'admin', password: 'password', empId: 'EMP-1', roleId: 'Super Administrator', companyId: 'COMP-1', status: 'Active' },
                { id: 'USER-002', username: 'guard_hq', password: 'password', empId: 'EMP-2', roleId: 'Gate Security', companyId: 'COMP-1', status: 'Active' },
                { id: 'USER-003', username: 'guard_bhilai', password: 'password', empId: 'EMP-3', roleId: 'Gate Security', companyId: 'COMP-2', status: 'Active' }
            ];

            // 28. Audit Logs
            data['auditLogs'] = [
                { id: 'AUD-001', timestamp: '2026-09-16 09:30:15', user: 'admin', role: 'Super Administrator', action: 'CREATE', module: 'poIssued', details: 'Created PO-ISS-2601 for DELHI MSW RAIPUR (600 MT)', companyId: 'COMP-1' },
                { id: 'AUD-002', timestamp: '2026-09-17 11:20:45', user: 'admin', role: 'Super Administrator', action: 'CREATE', module: 'invoices', details: 'Generated GST Tax Invoice INV-2026-001 for ACC LIMITED (28.40 MT)', companyId: 'COMP-1' },
                { id: 'AUD-003', timestamp: '2026-09-20 18:45:00', user: 'guard_hq', role: 'Gate Security', action: 'CREATE', module: 'gateVerification', details: 'Approved Inward Vehicle CG04NF4358 at Gate #1', companyId: 'COMP-1' },
                { id: 'AUD-004', timestamp: '2026-10-01 10:15:30', user: 'admin', role: 'Super Administrator', action: 'UPDATE', module: 'payrollLedger', details: 'Processed and finalized September 2026 Payroll for 5 employees', companyId: 'COMP-1' },
                { id: 'AUD-005', timestamp: '2026-10-15 08:50:00', user: 'admin', role: 'Super Administrator', action: 'CREATE', module: 'trips', details: 'Dispatched Outward Consignment #36422726 to Dalmia Cement', companyId: 'COMP-1' }
            ];

            Object.keys(modulesConfig).forEach(k => { if (!data[k]) data[k] = []; });
            return data;
        }`;
}

module.exports = { getNewGenerateDummyDataCode };
