-- ==============================================================================
-- ECOMANAGE ERP: SAFE REFERENCE MASTERS SEED
-- Purpose: Ensures missing Parties (PAR-1 to PAR-23) & Vehicles exist in Supabase
-- Uses DO blocks so existing units/po_types are safely preserved without conflict.
-- ==============================================================================

-- 1. PO Types (Safe: Skips if 'Material' etc. already exist)
DO $$
BEGIN
    INSERT INTO public.po_types (id, name, description, is_active)
    VALUES
        ('POT-1', 'Material', 'Raw Material Purchase', true),
        ('POT-2', 'Finished Goods', 'Finished Goods Sale', true),
        ('POT-3', 'Transport', 'Transport Service', true)
    ON CONFLICT (name) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Measurement Units (Safe: Skips if 'MT' etc. already exist)
DO $$
BEGIN
    INSERT INTO public.units (id, name, description, is_active)
    VALUES
        ('UNT-1', 'MT', 'Metric Ton', true),
        ('UNT-2', 'Kg', 'Kilogram', true),
        ('UNT-3', 'Nos.', 'Pieces / Numbers', true),
        ('UNT-4', 'litre', 'Litre', true)
    ON CONFLICT (name) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Complete Parties Directory (Ensures PAR-1 Tikam Chand Jain, PAR-2 MP Waste, PAR-3 Fast Logistics exist!)
INSERT INTO public.parties (id, name, party_types, not_gst_payer, gstin, pan, city, state, is_active)
VALUES
    ('PAR-1', 'TIKAM CHAND JAIN', ARRAY['Supplier', 'Client']::TEXT[], false, '22AABCT1234F1Z5', 'AABCT1234F', 'Raipur', 'Chhattisgarh', true),
    ('PAR-2', 'MP WASTE MGT', ARRAY['Client', 'Supplier']::TEXT[], false, '23AAICG8184C1ZP', 'FGHIE5678J', 'Indore', 'Madhya Pradesh', true),
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

-- 4. Vehicles Master (Shared Fleet VEH-1 to VEH-6)
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
