import zipfile
import xml.etree.ElementTree as ET
import json
import os

# 1. Parse parties.xlsx
with zipfile.ZipFile('parties.xlsx', 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in tree.findall('ns:si', ns):
            texts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
            shared_strings.append(''.join(texts))
            
    sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = []
    for row in sheet_tree.findall('.//ns:row', ns):
        row_vals = []
        for c in row.findall('ns:c', ns):
            t = c.get('t')
            v = c.find('ns:v', ns)
            val = v.text if v is not None else ''
            if t == 's' and val.isdigit():
                val = shared_strings[int(val)]
            row_vals.append(val.strip())
        rows.append(row_vals)

headers = rows[0]
raw_parties = [dict(zip(headers, r)) for r in rows[1:]]

def clean_type(t_str, name):
    types = []
    t_lower = t_str.lower()
    if 'client' in t_lower or 'customer' in t_lower or 'cement' in name.lower() or ('limited' in name.lower() and not t_lower):
        types.append('Client')
    if 'supplier' in t_lower or 'suppleir' in t_lower:
        types.append('Supplier')
    if 'transporter' in t_lower:
        types.append('Transporter')
    if 'vendor' in t_lower:
        types.append('Vendor')
    if not types:
        types = ['Client']
    return types

parties_data = []
for p in raw_parties:
    cid = p.get('Client ID', '')
    name = p.get('Party Name', '').strip()
    ptype = clean_type(p.get('Party Type', ''), name)
    vcode = p.get('Vendor Code', '').strip()
    gstin = p.get('GSTIN (as shown)', '').strip().rstrip(')').strip()
    cin = p.get('CIN (as shown)', '').strip()
    if cin == '0': cin = ''
    pan = p.get('PAN (as shown)', '').strip()
    if pan == '0': pan = ''
    addr = p.get('Address / Village line (as shown)', '').strip()
    dist = p.get('District (as shown)', '').strip()
    state = p.get('State (as shown)', '').strip()
    pincode = p.get('PIN / Postal Code (as shown)', '').strip()
    cname = p.get('Contact Person', '').strip()
    phone = p.get('Phone (as shown)', '').strip()
    email = p.get('Email / Other Contact (as shown)', '').strip()
    
    addr_parts = [a.strip() for a in addr.split(',') if a.strip()]
    street1 = addr_parts[0] if len(addr_parts) > 0 else addr
    street2 = addr_parts[1] if len(addr_parts) > 1 else ''
    city = dist or (addr_parts[-1] if len(addr_parts) > 1 else 'Raipur')
    
    not_gst = not bool(gstin)
    
    obj = {
        'id': f'PAR-{cid}',
        'type': ptype,
        'name': name,
        'address': addr,
        'pinCode': pincode,
        'street1': street1,
        'street2': street2,
        'city': city,
        'district': dist or city,
        'state': state,
        'vendorCode': vcode,
        'notGstPayer': not_gst,
        'gstin': gstin,
        'cin': cin,
        'pan': pan,
        'contactName': cname,
        'contactNumber': phone,
        'email': email
    }
    parties_data.append(obj)

print(f"Processed {len(parties_data)} parties from Excel.")

# 2. Format JS Object List
def format_js_obj(p):
    types_js = json.dumps(p['type'])
    not_gst_js = 'true' if p['notGstPayer'] else 'false'
    return f"""                {{
                    id: {json.dumps(p['id'])},
                    type: {types_js},
                    name: {json.dumps(p['name'])},
                    address: {json.dumps(p['address'])},
                    pinCode: {json.dumps(p['pinCode'])},
                    street1: {json.dumps(p['street1'])},
                    street2: {json.dumps(p['street2'])},
                    city: {json.dumps(p['city'])},
                    district: {json.dumps(p['district'])},
                    state: {json.dumps(p['state'])},
                    vendorCode: {json.dumps(p['vendorCode'])},
                    notGstPayer: {not_gst_js},
                    gstin: {json.dumps(p['gstin'])},
                    cin: {json.dumps(p['cin'])},
                    pan: {json.dumps(p['pan'])},
                    contactName: {json.dumps(p['contactName'])},
                    contactNumber: {json.dumps(p['contactNumber'])},
                    email: {json.dumps(p['email'])}
                }}"""

js_block = ',\n' + ',\n'.join(format_js_obj(p) for p in parties_data)

# 3. Update frontend/app.js
with open('frontend/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

target_marker = """                    email: 'rajesh@fastlogistics.com'
                }
            ];
            data['poReceived'] = [{"""

replacement_marker = """                    email: 'rajesh@fastlogistics.com'
                }""" + js_block + """
            ];
            data['poReceived'] = [{"""

if target_marker in app_js:
    new_app_js = app_js.replace(target_marker, replacement_marker, 1)
    with open('frontend/app.js', 'w', encoding='utf-8') as f:
        f.write(new_app_js)
    print("[OK] Successfully inserted 14 parties into frontend/app.js")
else:
    print("[ERROR] Target marker not found in frontend/app.js")

# 4. Update index (29).html
with open('index (29).html', 'r', encoding='utf-8') as f:
    html_content = f.read()

if target_marker in html_content:
    new_html = html_content.replace(target_marker, replacement_marker, 1)
    with open('index (29).html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("[OK] Successfully inserted 14 parties into index (29).html")
else:
    print("[ERROR] Target marker not found in index (29).html")

# 5. Generate supabase/seed_parties.sql
sql_lines = [
    "-- ==============================================================================",
    "-- SEED SCRIPT: 14 PARTIES FROM parties.xlsx",
    "-- Target Table: public.parties",
    "-- ==============================================================================\n"
]

def esc_sql(val):
    if not val:
        return "NULL"
    cleaned = str(val).replace("'", "''")
    return f"'{cleaned}'"

for p in parties_data:
    pid = esc_sql(p['id'])
    name = esc_sql(p['name'])
    types_quoted = [f"'{t}'" for t in p['type']]
    types_sql = "ARRAY[" + ", ".join(types_quoted) + "]::TEXT[]"
    vcode = esc_sql(p['vendorCode'])
    not_gst = 'TRUE' if p['notGstPayer'] else 'FALSE'
    gstin = esc_sql(p['gstin'])
    pan = esc_sql(p['pan'])
    cin = esc_sql(p['cin'])
    addr = esc_sql(p['address'])
    st1 = esc_sql(p['street1'])
    st2 = esc_sql(p['street2'])
    city = esc_sql(p['city'])
    dist = esc_sql(p['district'])
    state = esc_sql(p['state'])
    pin = esc_sql(p['pinCode'])
    cname = esc_sql(p['contactName'])
    cphone = esc_sql(p['contactNumber'])
    cemail = esc_sql(p['email'])

    stmt = f"""INSERT INTO public.parties (
    id, name, party_types, vendor_code, not_gst_payer, gstin, pan, cin,
    primary_address, street1, street2, city, district, state, pincode,
    primary_contact_name, primary_contact_phone, primary_email, is_active
) VALUES (
    {pid}, {name}, {types_sql}, {vcode}, {not_gst}, {gstin}, {pan}, {cin},
    {addr}, {st1}, {st2}, {city}, {dist}, {state}, {pin},
    {cname}, {cphone}, {cemail}, TRUE
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
    updated_at = NOW();"""
    sql_lines.append(stmt)

with open('supabase/seed_parties.sql', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(sql_lines) + '\n')

print("[OK] Successfully created supabase/seed_parties.sql")
