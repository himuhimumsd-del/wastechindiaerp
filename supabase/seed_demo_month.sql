-- ==============================================================================
-- ECOMANAGE ERP: OPERATIONAL WORKFLOW DEMO SEED
-- Scope: PO Issued & Received -> Fleet & Gate Security -> Weighbridge Trips -> GRN -> Sales Invoices
-- Period: 2026-09-16 to 2026-10-15 (1 Month of Realistic Operations)
-- ==============================================================================

-- 0. PREREQUISITE REFERENCES (Safety guards: Ensure foreign keys exist with ON CONFLICT DO NOTHING)

-- 0.1 PO Types
INSERT INTO public.po_types (id, name, is_active)
VALUES
    ('POT-1', 'Raw Material Purchase', true),
    ('POT-2', 'Finished Goods Sale', true),
    ('POT-3', 'Transport Service', true)
ON CONFLICT (id) DO NOTHING;

-- 0.2 Measurement Units
INSERT INTO public.units (id, name, symbol, is_active)
VALUES
    ('UNT-1', 'Metric Ton', 'MT', true),
    ('UNT-2', 'Kilogram', 'KG', true),
    ('UNT-3', 'Pieces', 'PCS', true),
    ('UNT-4', 'Litre', 'LTR', true)
ON CONFLICT (id) DO NOTHING;

-- 0.3 Items Master
INSERT INTO public.items (id, name, code, category, default_unit_id, is_active)
VALUES
    ('ITM-1', 'RDF Raw', 'RM001', 'Raw Material', 'UNT-1', true),
    ('ITM-2', 'RDF', 'FG001', 'Finished Goods', 'UNT-1', true),
    ('ITM-3', 'PLYWOOD WASTE', 'RM002', 'Raw Material', 'UNT-1', true),
    ('ITM-4', 'SHREDDED RDF', 'FG002', 'Finished Goods', 'UNT-1', true),
    ('ITM-5', 'PLASTIC WASTE', 'RM003', 'Raw Material', 'UNT-1', true),
    ('ITM-6', 'HYDRAULIC OIL 68', 'CON001', 'Consumables', 'UNT-4', true),
    ('ITM-7', 'AGRO WASTE', 'RM004', 'Raw Material', 'UNT-1', true),
    ('ITM-8', 'EPR Credit Cat 2', 'EPR001', 'Services', 'UNT-1', true),
    ('ITM-9', 'MSW', 'RM005', 'Raw Material', 'UNT-1', true),
    ('ITM-10', 'PAPER WASTE', 'RM006', 'Raw Material', 'UNT-1', true),
    ('ITM-11', 'MIXED PLASTIC SCRAP', 'RM007', 'Raw Material', 'UNT-1', true),
    ('ITM-12', 'CARDBOARD BALES', 'FG003', 'Finished Goods', 'UNT-1', true)
ON CONFLICT (id) DO NOTHING;

-- 0.4 Parties Directory (Guarantees foreign keys for Vehicles, Orders, Trips, GRN, Invoices)
INSERT INTO public.parties (id, name, party_types, not_gst_payer, gstin, pan, city, state, is_active)
VALUES
    ('PAR-1', 'TIKAM CHAND JAIN', ARRAY['Supplier']::TEXT[], false, '22AABCT1234F1Z5', 'AABCT1234F', 'Raipur', 'Chhattisgarh', true),
    ('PAR-2', 'MP WASTE MGT', ARRAY['Client']::TEXT[], false, '23AAICG8184C1ZP', 'FGHIE5678J', 'Indore', 'Madhya Pradesh', true),
    ('PAR-3', 'FAST LOGISTICS', ARRAY['Transporter']::TEXT[], true, NULL, 'LMNOP9012K', 'Raipur', 'Chhattisgarh', true),
    ('PAR-9', 'ACC LIMITED (Jamul)', ARRAY['Client']::TEXT[], false, '22AAACT1507C1Z7', 'AAACT1507C1', 'Jamul', 'Chhattisgarh', true),
    ('PAR-10', 'GG WASTECH PRIVATE LIMITED', ARRAY['Supplier', 'Transporter']::TEXT[], false, '22AAICG8184C1ZP', 'AAICG8184C1', 'Raipur', 'Chhattisgarh', true),
    ('PAR-11', 'GG ORGANICS', ARRAY['Supplier', 'Transporter']::TEXT[], false, '22AAGFG4433K1Z1', 'AAGFG4433K', 'Raipur', 'Chhattisgarh', true),
    ('PAR-13', 'DALMIA CEMENT (BHARAT) LIMITED', ARRAY['Client']::TEXT[], false, '10AAACD0149G1Z8', 'AAACD0149G', 'Banjari', 'Bihar', true),
    ('PAR-14', 'SHREE RAIPUR CEMENT PLANT', ARRAY['Client']::TEXT[], false, '22AAACS0598K1ZB', 'AAACS0598K', 'Baloda Bazar', 'Chhattisgarh', true),
    ('PAR-15', 'KAMLESH SAHU', ARRAY['Supplier', 'Transporter']::TEXT[], true, NULL, 'ABCPS1234K', 'Raipur', 'Chhattisgarh', true),
    ('PAR-16', 'DEEPAK BHAIYA', ARRAY['Supplier', 'Transporter']::TEXT[], true, NULL, 'XYZPD5678L', 'Raipur', 'Chhattisgarh', true),
    ('PAR-17', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', ARRAY['Supplier']::TEXT[], false, '29AAGCS3321M1Z4', 'AAGCS3321M', 'Bengaluru', 'Karnataka', true),
    ('PAR-18', 'Ajay Singh', ARRAY['Supplier']::TEXT[], true, NULL, 'BCDPS9988N', 'Raipur', 'Chhattisgarh', true),
    ('PAR-19', 'HBMCPL AND EOWS JV', ARRAY['Supplier']::TEXT[], false, '22AABCH9911P1Z2', 'AABCH9911P', 'Bhilai', 'Chhattisgarh', true),
    ('PAR-20', 'DELHI MSW RAIPUR', ARRAY['Supplier']::TEXT[], false, '22AAGCD5544L1Z9', 'AAGCD5544L', 'Raipur', 'Chhattisgarh', true),
    ('PAR-21', 'RAMNIWAS INFRA BUILD PVT LTD', ARRAY['Client']::TEXT[], false, '22AAACR7766N1Z7', 'AAACR7766N', 'Raipur', 'Chhattisgarh', true),
    ('PAR-22', 'SLV WASTE MANAGEMENT PVT LTD', ARRAY['Supplier']::TEXT[], false, '29AAGCS3321M1Z4', 'AAGCS3321M', 'Bengaluru', 'Karnataka', true),
    ('PAR-23', 'GGL DPR', ARRAY['Supplier', 'Transporter']::TEXT[], true, NULL, 'GGLDP1122Q', 'Raipur', 'Chhattisgarh', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    state = EXCLUDED.state,
    is_active = true;

-- 1. VEHICLES (Shared Transport Fleet Master)
INSERT INTO public.vehicles (id, business_id, plant_id, vehicle_no, party_name, party_id, is_active)
VALUES
    ('VEH-1', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04NF4358', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-2', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04MS9722', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-3', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG07ZZ1122', 'FAST LOGISTICS', 'PAR-3', true),
    ('VEH-4', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04JB8841', 'KAMLESH SAHU', 'PAR-15', true),
    ('VEH-5', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04KU1290', 'DEEPAK BHAIYA', 'PAR-16', true),
    ('VEH-6', (SELECT business_id FROM public.plants LIMIT 1), NULL, 'CG04LR7733', 'GGL DPR', 'PAR-23', true)
ON CONFLICT (id) DO UPDATE SET
    vehicle_no = EXCLUDED.vehicle_no,
    party_name = EXCLUDED.party_name,
    party_id = EXCLUDED.party_id,
    plant_id = NULL,
    is_active = true;

-- 2. COMMERCIAL ORDERS: PO ISSUED (Purchase Orders to Inward Waste Suppliers)
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', '260300265', '2026-03-28', '2026-04-28', 'POT-1', 'COMP-1', 'PAR-2', 'ITM-8', 'UNT-1', 1463, 109, 32.29, 76.71, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', 'PO-ISS-2601', '2026-09-16', '2026-10-31', 'POT-1', 'COMP-1', 'PAR-20', 'ITM-9', 'UNT-1', 850, 600, 342.8, 257.2, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', 'PO-ISS-2602', '2026-09-18', '2026-10-25', 'POT-1', 'COMP-1', 'PAR-17', 'ITM-5', 'UNT-1', 14500, 300, 184.2, 115.8, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', 'PO-ISS-2603', '2026-09-20', '2026-10-20', 'POT-1', 'COMP-1', 'PAR-2', 'ITM-7', 'UNT-1', 2800, 250, 250, 0, 'Closed', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', 'PO-ISS-2604', '2026-09-25', '2026-11-05', 'POT-1', 'COMP-2', 'PAR-19', 'ITM-3', 'UNT-1', 1950, 400, 215.6, 184.4, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', 'PO-ISS-2605', '2026-10-02', '2026-10-30', 'POT-1', 'COMP-1', 'PAR-10', 'ITM-10', 'UNT-1', 6200, 150, 94.5, 55.5, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('issued', 'PO-ISS-2606', '2026-10-08', '2026-11-15', 'POT-1', 'COMP-1', 'PAR-18', 'ITM-5', 'UNT-1', 13800, 100, 42.3, 57.7, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;

-- 3. COMMERCIAL ORDERS: PO RECEIVED (Sales Orders from Cement Plants & Off-takers)
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', '1110503346', '2026-03-30', '2026-04-30', 'POT-2', 'COMP-1', 'PAR-1', 'ITM-7', 'UNT-1', 3000, 100, 32.29, 67.71, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', 'PO-REC-3101', '2026-09-15', '2026-11-15', 'POT-2', 'COMP-1', 'PAR-9', 'ITM-4', 'UNT-1', 3600, 800, 468.5, 331.5, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', 'PO-REC-3102', '2026-09-18', '2026-10-31', 'POT-2', 'COMP-1', 'PAR-13', 'ITM-2', 'UNT-1', 3250, 500, 286.2, 213.8, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', 'PO-REC-3103', '2026-09-22', '2026-11-30', 'POT-2', 'COMP-1', 'PAR-14', 'ITM-4', 'UNT-1', 3550, 600, 315.4, 284.6, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', 'PO-REC-3104', '2026-09-26', '2026-10-25', 'POT-2', 'COMP-1', 'PAR-1', 'ITM-7', 'UNT-1', 3400, 200, 200, 0, 'Closed', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', 'PO-REC-3105', '2026-10-01', '2026-11-15', 'POT-2', 'COMP-1', 'PAR-2', 'ITM-8', 'UNT-1', 1800, 150, 85, 65, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;
INSERT INTO public.orders (order_type, po_number, po_date, due_date, po_type_id, plant_id, party_id, item_id, unit_id, item_rate, total_qty, consumed_qty, balance_qty, status, financial_year)
VALUES ('received', 'PO-REC-3106', '2026-10-05', '2026-11-20', 'POT-2', 'COMP-2', 'PAR-9', 'ITM-10', 'UNT-1', 7800, 250, 98.5, 151.5, 'Open', '2026-2027')
ON CONFLICT (business_id, order_type, po_number) DO UPDATE SET total_qty = EXCLUDED.total_qty, consumed_qty = EXCLUDED.consumed_qty, balance_qty = EXCLUDED.balance_qty;

-- 4. LOGISTICS & WEIGHBRIDGE TRIPS (30 Trips: Gross, Tare, Net Weights, E-Way Bill, Driver)
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422655', 'Outward (Sales)', '2026-10-15', 'COMP-1', 'PAR-1', '1110503346', NULL, 'VEH-1', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 47.22, 14.5, 32.72, 'Ustad Ramu', '9876500011', 'EWB123456789', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('4581123', 'Inward (Purchase)', '2026-10-15', 'COMP-1', 'PAR-2', NULL, '260300265', 'VEH-2', 'By Road', 'Consignee', 'To Pay', 'Indore', 'Madhya Pradesh', 'Raipur', 'Chhattisgarh', 135.00, 14.5, 120.5, 'Ustad Shyam', '9876500022', 'EWB987654321', 'In Progress', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('9999999', 'Inward (Purchase)', '2026-10-15', 'COMP-2', 'PAR-18', NULL, NULL, 'VEH-3', 'By Road', 'Consignor', 'To Pay', 'Bhilai', 'Chhattisgarh', 'Bhilai', 'Chhattisgarh', 59.50, 14.5, 45, 'Raju Yadav', '9876500033', '', 'In Progress', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422700', 'Inward (Purchase)', '2026-09-16', 'COMP-1', 'PAR-20', NULL, 'PO-ISS-2601', 'VEH-1', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 47.00, 14.5, 32.5, 'Ustad Ramu', '9876500010', 'EWB260901', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422701', 'Outward (Sales)', '2026-09-17', 'COMP-1', 'PAR-9', 'PO-REC-3101', NULL, 'VEH-2', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Jamul', 'Chhattisgarh', 42.90, 14.5, 28.4, 'Ustad Shyam', '9876500011', 'EWB260902', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422702', 'Inward (Purchase)', '2026-09-18', 'COMP-1', 'PAR-17', NULL, 'PO-ISS-2602', 'VEH-4', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 39.10, 14.5, 24.6, 'Raju Yadav', '9876500012', 'EWB260903', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422703', 'Outward (Sales)', '2026-09-19', 'COMP-1', 'PAR-13', 'PO-REC-3102', NULL, 'VEH-5', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Rohtas', 'Bihar', 45.70, 14.5, 31.2, 'Santosh Verma', '9876500013', 'EWB260904', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422704', 'Inward (Purchase)', '2026-09-21', 'COMP-1', 'PAR-2', NULL, 'PO-ISS-2603', 'VEH-1', 'By Road', 'Consignee', 'To Bill', 'Indore', 'Chhattisgarh', 'Raipur', 'Madhya Pradesh', 42.30, 14.5, 27.8, 'Ustad Ramu', '9876500014', 'EWB260905', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422705', 'Outward (Sales)', '2026-09-22', 'COMP-1', 'PAR-14', 'PO-REC-3103', NULL, 'VEH-2', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Baloda Bazar', 'Chhattisgarh', 44.00, 14.5, 29.5, 'Ustad Shyam', '9876500015', 'EWB260906', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422706', 'Inward (Purchase)', '2026-09-23', 'COMP-1', 'PAR-20', NULL, 'PO-ISS-2601', 'VEH-4', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 48.60, 14.5, 34.1, 'Raju Yadav', '9876500016', 'EWB260907', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422707', 'Outward (Sales)', '2026-09-24', 'COMP-1', 'PAR-9', 'PO-REC-3101', NULL, 'VEH-6', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Jamul', 'Chhattisgarh', 44.60, 14.5, 30.1, 'Dilip Sahu', '9876500017', 'EWB260908', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422708', 'Inward (Purchase)', '2026-09-25', 'COMP-2', 'PAR-19', NULL, 'PO-ISS-2604', 'VEH-3', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Bhilai', 'Chhattisgarh', 37.30, 14.5, 22.8, 'Kamlesh Sahu', '9876500018', 'EWB260909', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422709', 'Outward (Sales)', '2026-09-26', 'COMP-1', 'PAR-1', 'PO-REC-3104', NULL, 'VEH-1', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 47.70, 14.5, 33.2, 'Ustad Ramu', '9876500019', 'EWB260910', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422710', 'Inward (Purchase)', '2026-09-28', 'COMP-1', 'PAR-17', NULL, 'PO-ISS-2602', 'VEH-2', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 40.90, 14.5, 26.4, 'Ustad Shyam', '9876500010', 'EWB260911', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422711', 'Outward (Sales)', '2026-09-29', 'COMP-1', 'PAR-13', 'PO-REC-3102', NULL, 'VEH-5', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Rohtas', 'Bihar', 47.10, 14.5, 32.6, 'Santosh Verma', '9876500011', 'EWB260912', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422712', 'Inward (Purchase)', '2026-09-30', 'COMP-1', 'PAR-20', NULL, 'PO-ISS-2601', 'VEH-4', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 48.40, 14.5, 33.9, 'Raju Yadav', '9876500012', 'EWB260913', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422713', 'Outward (Sales)', '2026-10-01', 'COMP-1', 'PAR-9', 'PO-REC-3101', NULL, 'VEH-1', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Jamul', 'Chhattisgarh', 46.30, 14.5, 31.8, 'Ustad Ramu', '9876500013', 'EWB261001', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422714', 'Inward (Purchase)', '2026-10-02', 'COMP-1', 'PAR-10', NULL, 'PO-ISS-2605', 'VEH-2', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 39.80, 14.5, 25.3, 'Ustad Shyam', '9876500014', 'EWB261002', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422715', 'Outward (Sales)', '2026-10-03', 'COMP-1', 'PAR-14', 'PO-REC-3103', NULL, 'VEH-6', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Baloda Bazar', 'Chhattisgarh', 44.90, 14.5, 30.4, 'Dilip Sahu', '9876500015', 'EWB261003', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422716', 'Inward (Purchase)', '2026-10-05', 'COMP-2', 'PAR-19', NULL, 'PO-ISS-2604', 'VEH-3', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Bhilai', 'Chhattisgarh', 42.60, 14.5, 28.1, 'Kamlesh Sahu', '9876500016', 'EWB261004', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422717', 'Outward (Sales)', '2026-10-06', 'COMP-2', 'PAR-9', 'PO-REC-3106', NULL, 'VEH-1', 'By Road', 'Consignor', 'To Bill', 'Bhilai', 'Chhattisgarh', 'Jamul', 'Chhattisgarh', 41.00, 14.5, 26.5, 'Ustad Ramu', '9876500017', 'EWB261005', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422718', 'Inward (Purchase)', '2026-10-07', 'COMP-1', 'PAR-20', NULL, 'PO-ISS-2601', 'VEH-4', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 49.50, 14.5, 35, 'Raju Yadav', '9876500018', 'EWB261006', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422719', 'Outward (Sales)', '2026-10-08', 'COMP-1', 'PAR-13', 'PO-REC-3102', NULL, 'VEH-5', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Rohtas', 'Bihar', 48.30, 14.5, 33.8, 'Santosh Verma', '9876500019', 'EWB261007', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422720', 'Inward (Purchase)', '2026-10-09', 'COMP-1', 'PAR-18', NULL, 'PO-ISS-2606', 'VEH-2', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 34.00, 14.5, 19.5, 'Ustad Shyam', '9876500010', 'EWB261008', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422721', 'Outward (Sales)', '2026-10-10', 'COMP-1', 'PAR-9', 'PO-REC-3101', NULL, 'VEH-1', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Jamul', 'Chhattisgarh', 46.60, 14.5, 32.1, 'Ustad Ramu', '9876500011', 'EWB261009', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422722', 'Inward (Purchase)', '2026-10-12', 'COMP-1', 'PAR-17', NULL, 'PO-ISS-2602', 'VEH-4', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 42.00, 14.5, 27.5, 'Raju Yadav', '9876500012', 'EWB261010', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422723', 'Outward (Sales)', '2026-10-13', 'COMP-1', 'PAR-14', 'PO-REC-3103', NULL, 'VEH-6', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Baloda Bazar', 'Chhattisgarh', 43.40, 14.5, 28.9, 'Dilip Sahu', '9876500013', 'EWB261011', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422724', 'Inward (Purchase)', '2026-10-14', 'COMP-1', 'PAR-20', NULL, 'PO-ISS-2601', 'VEH-2', 'By Road', 'Consignee', 'To Bill', 'Raipur', 'Chhattisgarh', 'Raipur', 'Chhattisgarh', 48.00, 14.5, 33.5, 'Ustad Shyam', '9876500014', 'EWB261012', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422725', 'Outward (Sales)', '2026-10-14', 'COMP-1', 'PAR-9', 'PO-REC-3101', NULL, 'VEH-1', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Jamul', 'Chhattisgarh', 45.90, 14.5, 31.4, 'Ustad Ramu', '9876500015', 'EWB261013', 'Completed', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;
INSERT INTO public.trips (trip_number, trip_type, trip_date, plant_id, party_id, po_received_number, po_issued_number, vehicle_id, transport_mode, freight_paid_by, bill_type, origin_city, origin_state, destination_city, destination_state, gross_weight, tare_weight, net_weight, driver_name, driver_phone, eway_bill_no, status, financial_year)
VALUES ('36422726', 'Outward (Sales)', '2026-10-15', 'COMP-1', 'PAR-13', 'PO-REC-3102', NULL, 'VEH-5', 'By Road', 'Consignor', 'To Bill', 'Raipur', 'Chhattisgarh', 'Rohtas', 'Bihar', 47.00, 14.5, 32.5, 'Santosh Verma', '9876500016', 'EWB261014', 'In Transit', '2026-2027')
ON CONFLICT (business_id, trip_number) DO UPDATE SET net_weight = EXCLUDED.net_weight, gross_weight = EXCLUDED.gross_weight, status = EXCLUDED.status;

-- 5. GATE SECURITY VERIFICATION (30 Gate Passes)
DELETE FROM public.gate_entries WHERE entry_number IN ('GATE-1001', 'GATE-1002', 'GATE-1003', 'GATE-1004', 'GATE-1005', 'GATE-1006', 'GATE-1007', 'GATE-1008', 'GATE-1009', 'GATE-1010', 'GATE-1011', 'GATE-1012', 'GATE-1013', 'GATE-1014', 'GATE-1015', 'GATE-1016', 'GATE-1017', 'GATE-1018', 'GATE-1019', 'GATE-1020', 'GATE-1021', 'GATE-1022', 'GATE-1023', 'GATE-1024', 'GATE-1025', 'GATE-1026', 'GATE-1027', 'GATE-1028', 'GATE-1029', 'GATE-1030');

INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1001', 'COMP-1', 'Outward (Leaving Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500011', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1002', 'COMP-1', 'Inward (Entering Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500022', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1003', 'COMP-2', 'Inward (Entering Plant)', 'CG07ZZ1122', 'Raju Yadav', '9876500033', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1004', 'COMP-1', 'Inward (Entering Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500010', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1005', 'COMP-1', 'Outward (Leaving Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500011', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1006', 'COMP-1', 'Inward (Entering Plant)', 'CG04JB8841', 'Raju Yadav', '9876500012', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1007', 'COMP-1', 'Outward (Leaving Plant)', 'CG04KU1290', 'Santosh Verma', '9876500013', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1008', 'COMP-1', 'Inward (Entering Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500014', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1009', 'COMP-1', 'Outward (Leaving Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500015', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1010', 'COMP-1', 'Inward (Entering Plant)', 'CG04JB8841', 'Raju Yadav', '9876500016', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1011', 'COMP-1', 'Outward (Leaving Plant)', 'CG04LR7733', 'Dilip Sahu', '9876500017', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1012', 'COMP-2', 'Inward (Entering Plant)', 'CG07ZZ1122', 'Kamlesh Sahu', '9876500018', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1013', 'COMP-1', 'Outward (Leaving Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500019', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1014', 'COMP-1', 'Inward (Entering Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500010', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1015', 'COMP-1', 'Outward (Leaving Plant)', 'CG04KU1290', 'Santosh Verma', '9876500011', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1016', 'COMP-1', 'Inward (Entering Plant)', 'CG04JB8841', 'Raju Yadav', '9876500012', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1017', 'COMP-1', 'Outward (Leaving Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500013', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1018', 'COMP-1', 'Inward (Entering Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500014', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1019', 'COMP-1', 'Outward (Leaving Plant)', 'CG04LR7733', 'Dilip Sahu', '9876500015', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1020', 'COMP-2', 'Inward (Entering Plant)', 'CG07ZZ1122', 'Kamlesh Sahu', '9876500016', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1021', 'COMP-2', 'Outward (Leaving Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500017', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1022', 'COMP-1', 'Inward (Entering Plant)', 'CG04JB8841', 'Raju Yadav', '9876500018', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1023', 'COMP-1', 'Outward (Leaving Plant)', 'CG04KU1290', 'Santosh Verma', '9876500019', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1024', 'COMP-1', 'Inward (Entering Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500010', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1025', 'COMP-1', 'Outward (Leaving Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500011', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1026', 'COMP-1', 'Inward (Entering Plant)', 'CG04JB8841', 'Raju Yadav', '9876500012', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1027', 'COMP-1', 'Outward (Leaving Plant)', 'CG04LR7733', 'Dilip Sahu', '9876500013', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1028', 'COMP-1', 'Inward (Entering Plant)', 'CG04MS9722', 'Ustad Shyam', '9876500014', 'Verified - Allowed Entry', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1029', 'COMP-1', 'Outward (Leaving Plant)', 'CG04NF4358', 'Ustad Ramu', '9876500015', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');
INSERT INTO public.gate_entries (entry_number, plant_id, movement_type, vehicle_no, driver_name, driver_phone, status, guard_remarks)
VALUES ('GATE-1030', 'COMP-1', 'Outward (Leaving Plant)', 'CG04KU1290', 'Santosh Verma', '9876500016', 'Verified - Allowed Exit', 'Physical vehicle inspection completed at gate entry.');

-- 6. GOODS RECEIPT NOTES (14 GRNs)
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-1', 'COMP-1', 'PAR-1', '1110503346', '2026-10-15', '2026-10-15', 'Good', 32.29, 0, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-101', 'COMP-1', 'PAR-20', 'PO-ISS-2601', '2026-09-16', '2026-09-16', 'Good', 32.01, 0.49, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-102', 'COMP-1', 'PAR-17', 'PO-ISS-2602', '2026-09-18', '2026-09-18', 'Good', 24.23, 0.37, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-103', 'COMP-1', 'PAR-2', 'PO-ISS-2603', '2026-09-21', '2026-09-21', 'Good', 27.38, 0.42, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-104', 'COMP-1', 'PAR-20', 'PO-ISS-2601', '2026-09-23', '2026-09-23', 'Good', 33.59, 0.51, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-105', 'COMP-2', 'PAR-19', 'PO-ISS-2604', '2026-09-25', '2026-09-25', 'Good', 22.46, 0.34, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-106', 'COMP-1', 'PAR-17', 'PO-ISS-2602', '2026-09-28', '2026-09-28', 'Good', 26, 0.4, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-107', 'COMP-1', 'PAR-20', 'PO-ISS-2601', '2026-09-30', '2026-09-30', 'Good', 33.39, 0.51, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-108', 'COMP-1', 'PAR-10', 'PO-ISS-2605', '2026-10-02', '2026-10-02', 'Good', 24.92, 0.38, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-109', 'COMP-2', 'PAR-19', 'PO-ISS-2604', '2026-10-05', '2026-10-05', 'Good', 27.68, 0.42, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-110', 'COMP-1', 'PAR-20', 'PO-ISS-2601', '2026-10-07', '2026-10-07', 'Good', 34.47, 0.53, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-111', 'COMP-1', 'PAR-18', 'PO-ISS-2606', '2026-10-09', '2026-10-09', 'Good', 19.21, 0.29, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-112', 'COMP-1', 'PAR-17', 'PO-ISS-2602', '2026-10-12', '2026-10-12', 'Good', 27.09, 0.41, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;
INSERT INTO public.grn (grn_number, plant_id, party_id, po_ref, from_date, to_date, condition, total_grn_weight, total_shortage, financial_year)
VALUES ('GRN-113', 'COMP-1', 'PAR-20', 'PO-ISS-2601', '2026-10-14', '2026-10-14', 'Good', 33, 0.5, '2026-2027')
ON CONFLICT (business_id, grn_number) DO UPDATE SET total_grn_weight = EXCLUDED.total_grn_weight, total_shortage = EXCLUDED.total_shortage;

-- 7. SALES INVOICES (15 GST Tax Invoices)
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-1', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-1', '1110503346', '2026-10-15', '2026-10-15', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'TIKAM CHAND JAIN', 'Consignee Plant Site', 'Chhattisgarh', '22', 96870, 2422, 2422, 0, 101713.5, 0, 101713.5, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-001', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-9', 'PO-REC-3101', '2026-09-17', '2026-09-17', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'ACC LIMITED (Jamul)', 'Consignee Plant Site', 'Chhattisgarh', '22', 102240, 9202, 9202, 0, 120643, 120643, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-002', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-13', 'PO-REC-3102', '2026-09-19', '2026-09-19', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'DALMIA CEMENT (BHARAT) LIMITED', 'Consignee Plant Site', 'Bihar', '10', 101400, 0, 0, 18252, 119652, 119652, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-003', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-14', 'PO-REC-3103', '2026-09-22', '2026-09-22', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'SHREE RAIPUR CEMENT PLANT', 'Consignee Plant Site', 'Chhattisgarh', '22', 104725, 9426, 9426, 0, 123576, 123576, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-004', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-9', 'PO-REC-3101', '2026-09-24', '2026-09-24', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'ACC LIMITED (Jamul)', 'Consignee Plant Site', 'Chhattisgarh', '22', 108360, 9753, 9753, 0, 127865, 127865, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-005', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-1', 'PO-REC-3104', '2026-09-26', '2026-09-26', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'TIKAM CHAND JAIN', 'Consignee Plant Site', 'Chhattisgarh', '22', 112880, 10159, 10159, 0, 133198, 133198, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-006', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-13', 'PO-REC-3102', '2026-09-29', '2026-09-29', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'DALMIA CEMENT (BHARAT) LIMITED', 'Consignee Plant Site', 'Bihar', '10', 105950, 0, 0, 19071, 125021, 125021, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-007', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-9', 'PO-REC-3101', '2026-10-01', '2026-10-01', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'ACC LIMITED (Jamul)', 'Consignee Plant Site', 'Chhattisgarh', '22', 114480, 10303, 10303, 0, 135086, 135086, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-008', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-14', 'PO-REC-3103', '2026-10-03', '2026-10-03', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'SHREE RAIPUR CEMENT PLANT', 'Consignee Plant Site', 'Chhattisgarh', '22', 107920, 9713, 9713, 0, 127346, 127346, 0, 'Paid', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-009', 'COMP-2', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-2' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-9', 'PO-REC-3106', '2026-10-06', '2026-10-06', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'ACC LIMITED (Jamul)', 'Consignee Plant Site', 'Chhattisgarh', '22', 206700, 18603, 18603, 0, 243906, 0, 243906, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-010', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-13', 'PO-REC-3102', '2026-10-08', '2026-10-08', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'DALMIA CEMENT (BHARAT) LIMITED', 'Consignee Plant Site', 'Bihar', '10', 109850, 0, 0, 19773, 129623, 0, 129623, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-011', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-9', 'PO-REC-3101', '2026-10-10', '2026-10-10', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'ACC LIMITED (Jamul)', 'Consignee Plant Site', 'Chhattisgarh', '22', 115560, 10401, 10401, 0, 136361, 0, 136361, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-012', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-14', 'PO-REC-3103', '2026-10-13', '2026-10-13', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'SHREE RAIPUR CEMENT PLANT', 'Consignee Plant Site', 'Chhattisgarh', '22', 102595, 9234, 9234, 0, 121062, 0, 121062, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-013', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-9', 'PO-REC-3101', '2026-10-14', '2026-10-14', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'ACC LIMITED (Jamul)', 'Consignee Plant Site', 'Chhattisgarh', '22', 113040, 10174, 10174, 0, 133387, 0, 133387, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-014', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-13', 'PO-REC-3102', '2026-10-15', '2026-10-15', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'DALMIA CEMENT (BHARAT) LIMITED', 'Consignee Plant Site', 'Bihar', '10', 105625, 0, 0, 19013, 124638, 0, 124638, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
INSERT INTO public.sales_invoices (invoice_number, plant_id, tax_identity_id, party_id, po_ref, invoice_date, due_date, seller_legal_name, seller_trade_name, seller_gstin, seller_address_text, seller_state, seller_state_code, buyer_name, buyer_address_text, buyer_state, buyer_state_code, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, paid_amount, balance_amount, status, financial_year)
VALUES ('INV-2026-014', 'COMP-1', COALESCE((SELECT tax_identity_id FROM public.plants WHERE id = 'COMP-1' LIMIT 1), (SELECT id FROM public.tax_identities LIMIT 1)), 'PAR-13', 'PO-REC-3102', '2026-10-15', '2026-10-15', 'GG WASTECH PVT LTD', 'GG WASTECH (HQ Raipur)', '22AAICG8184C1ZP', 'Plot 45, Industrial Area, Raipur', 'Chhattisgarh', '22', 'DALMIA CEMENT (BHARAT) LIMITED', 'Consignee Plant Site', 'Bihar', '10', 105625, 0, 0, 19013, 124638, 0, 124638, 'Issued', '2026-2027')
ON CONFLICT (business_id, financial_year, invoice_number) DO UPDATE SET taxable_amount = EXCLUDED.taxable_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status;
