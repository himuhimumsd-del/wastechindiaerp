-- ==============================================================================

-- SEED SCRIPT: 14 PARTIES FROM parties.xlsx

-- Target Table: public.parties

-- ==============================================================================


INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-9', 'ACC LIMITED (Jamul)', ARRAY['Client']::TEXT[], '916005447', FALSE, '22AAACT1507C1Z7', 'AAACT1507C1', NULL,
    'Jamul, ACC LIMITED', 'Jamul', 'ACC LIMITED', 'Jamul', 'Jamul', 'Chhattisgarh', '490024',
    'RANGESH GUPTA', '09885623306', 'RANGESH.GUPTA@adani.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-10', 'GG WASTECH PRIVATE LIMITED', ARRAY['Supplier', 'Transporter']::TEXT[], 'GGWST10', FALSE, '22AAICG8184C1ZP', 'AAICG8184C1', NULL,
    'Dharsiwa, Dharsiwa', 'Dharsiwa', 'Dharsiwa', 'Raipur', 'Raipur', 'Chhattisgarh', '49200',
    'Prabin Sharma', '08821937000', 'ho.raipur@wastechindia.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-11', 'GG ORGANICS', ARRAY['Supplier', 'Transporter']::TEXT[], 'GGWST11', FALSE, '22ATEPS2447J1ZM', 'ATEPS2447J', NULL,
    'Raipur, Rawabhatha Transport Nagar', 'Raipur', 'Rawabhatha Transport Nagar', 'RAIPUR', 'RAIPUR', 'Chhattisgarh', '492001',
    'PRABIN SHARMA', '8821937000', 'ggorganicsryp@gmail.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-13', 'DALMIA CEMENT (BHARAT) LIMITED', ARRAY['Client', 'Supplier', 'Transporter']::TEXT[], 'WT10013', FALSE, '10AADCA9414C2ZD', 'AADCA9414C', NULL,
    'Banjari, At. P.O. Banjari, Distt. Rohtas (Bihar)', 'Banjari', 'At. P.O. Banjari', 'Rohtas', 'Rohtas', 'Bihar', '821303',
    'VINAY PANDEY', '+91 6287 942', 'pandey.vinay1@dalmiabharat.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-14', 'SHREE RAIPUR CEMENT PLANT', ARRAY['Client', 'Supplier']::TEXT[], 'WT10014', FALSE, '22AACCS8796G1Z1', 'AACCS8796G', NULL,
    'Baloda Bazar, TEHSIL SIMGA, VILLAGE KHAPRADH, Baloda Bazar', 'Baloda Bazar', 'TEHSIL SIMGA', 'Raipur', 'Raipur', 'Chhattisgarh', '493196',
    'KAMLESH', '+91 77270 03', 'Kamlesh.Atulkar@shreecement.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-15', 'KAMLESH SAHU', ARRAY['Transporter']::TEXT[], 'GGWTRA15', TRUE, NULL, 'AAAAAAAA', NULL,
    'RAIPUR, TRANSPORT NAGAR', 'RAIPUR', 'TRANSPORT NAGAR', 'RAIPUR', 'RAIPUR', 'Chhattisgarh', '492004',
    'KAMLESH', '8959978423', 'AAAAA', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-16', 'DEEPAK BHAIYA', ARRAY['Transporter']::TEXT[], 'GGWTRA16', FALSE, '22APVPA3369N1ZG', 'APVPA3369N', NULL,
    'RAIPUR, RAMNAGAR', 'RAIPUR', 'RAMNAGAR', 'RAIPUR', 'RAIPUR', 'Chhattisgarh', '492001',
    'DEEPAK BHAIYA', '7000642276', 'varshaenterprises', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-17', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', ARRAY['Supplier', 'Transporter']::TEXT[], '123456', FALSE, '22ABMCS0556K1Z6', 'ABMCS0556K1', NULL,
    'Devendra Nagar, SLV WASTE MANAGEMENT PRIVATE LIMITED', 'Devendra Nagar', 'SLV WASTE MANAGEMENT PRIVATE LIMITED', 'Raipur', 'Raipur', 'Chhattisgarh', '492001',
    'Prabin Sharma', '08821937000', 'ho.raipur@wastechindia.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-18', 'Ajay Singh', ARRAY['Supplier', 'Transporter']::TEXT[], 'GGWST18', TRUE, NULL, NULL, NULL,
    'Raipur, Rawabhatha Transport Nagar', 'Raipur', 'Rawabhatha Transport Nagar', 'RAIPUR', 'RAIPUR', 'Chhattisgarh', '492001',
    'AJAY SINGH', '8870915328', 'nikhil1@gmail.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-19', 'HBMCPL AND EOWS JV', ARRAY['Supplier']::TEXT[], 'GGWSUP19', FALSE, '22AAQFH3662R1ZQ', 'AAQFH3662R', NULL,
    'sarona, sarona', 'sarona', 'sarona', 'raipur', 'raipur', 'Chhattisgarh', '492004',
    'Ankit rawat', '9795347381', 'sunilska2004@yahoo.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-20', 'DELHI MSW RAIPUR', ARRAY['Supplier']::TEXT[], 'GGWSUP20', FALSE, '22AABCD1783F1Z0', 'AABCD1783F', NULL,
    'Raipur, Pirda, Vidhansabha Road', 'Raipur', 'Pirda', 'Raipur', 'Raipur', 'Chhattisgarh', '492004',
    'SHRIKANT', '9654316886', 'AAA.AAAA@', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-21', 'RAMNIWAS INFRA BUILD PVT LTD', ARRAY['Supplier', 'Transporter']::TEXT[], 'GGWST21', FALSE, '27AAGCR9959Q1Z4', 'AAGCR9959Q', NULL,
    'Howrah, Howrah', 'Howrah', 'Howrah', 'Kolkata', 'Kolkata', 'West Bengal', '711303',
    'AMIT JI', '9323919193', 'AAA.AAAA@', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-22', 'SLV WASTE MANAGEMENT PVT LTD', ARRAY['Supplier']::TEXT[], 'GGWSUP22', FALSE, '22ABMCS0556K1Z6', 'ABMCS0556K', NULL,
    'Raipur, Beside Swami Narayan Mandir', 'Raipur', 'Beside Swami Narayan Mandir', 'RAIPUR', 'RAIPUR', 'Chhattisgarh', '492001',
    'VICKY SHARMA', '9993011555', 'slvwastemanagementpvtltd@gmail.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    'PAR-23', 'GGL DPR', ARRAY['Transporter']::TEXT[], 'GGWTRA23', FALSE, '22BTNPS4437G1ZH', 'BTNPS4437G', NULL,
    'KASHIPUR, Kashipur', 'KASHIPUR', 'Kashipur', 'KASHIPUR', 'KASHIPUR', 'Uttarakhand', '244713',
    'Manoj Sharma', '8085411407', 'gglogisticsprp@gmail.com', TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    party_types = EXCLUDED.party_types,
    vendor_code = EXCLUDED.vendor_code,
    not_gst_payer = EXCLUDED.not_gst_payer,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    cin = EXCLUDED.cin,
    primary_address = EXCLUDED.primary_address,
    street1 = EXCLUDED.street1,
    street2 = EXCLUDED.street2,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_phone = EXCLUDED.primary_contact_phone,
    primary_email = EXCLUDED.primary_email,
    is_active = TRUE,
    updated_at = NOW();
