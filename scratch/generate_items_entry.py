import zipfile
import xml.etree.ElementTree as ET
import json
import os

# 1. Parse items.xlsx
with zipfile.ZipFile('items.xlsx', 'r') as z:
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
raw_items = [dict(zip(headers, r)) for r in rows[1:]]

# Build comprehensive list of items
# We preserve ITM-1 to ITM-11 and add new items ITM-12 to ITM-33
new_items_list = [
    {
        'id': 'ITM-12',
        'name': 'PLASTIC WASTE (5%)',
        'hsnCode': '3925',
        'description': 'Plastic waste (Concessional 5% GST rate)',
        'cgst': '2.5',
        'sgst': '2.5',
        'igst': '5',
        'ugst': '0'
    },
    {
        'id': 'ITM-13',
        'name': 'SOIL ANALYSIS',
        'hsnCode': '998346',
        'description': 'Laboratory testing and soil chemical analysis',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-14',
        'name': 'LEACHATE ANALYSIS',
        'hsnCode': '998346',
        'description': 'Laboratory testing and leachate chemical analysis',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-15',
        'name': 'Analysis of Legacy MSW',
        'hsnCode': '998346',
        'description': 'Physical Characterisation and Heavy Metals testing for Legacy MSW',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-16',
        'name': 'Analysis of segregated RDF',
        'hsnCode': '998346',
        'description': 'Physical Characterization, Moisture, Ash, Net Calorific Value for RDF',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-17',
        'name': '90 KW VFD Drives',
        'hsnCode': '85044090',
        'description': '90 KW Variable Frequency Drive electrical speed controller',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-18',
        'name': 'MLP',
        'hsnCode': '38251000',
        'description': 'Multi-Layered Plastic waste material',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-19',
        'name': 'Odour Control Chemical',
        'hsnCode': '7381600',
        'description': 'Specialized plant bio-chemical for waste odour suppression',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-20',
        'name': 'EPR credit',
        'hsnCode': '998346',
        'description': 'Extended Producer Responsibility certificate credits',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-21',
        'name': 'Blades for Shredder Model TD912, MOC : Hardox 500',
        'hsnCode': '84749000',
        'description': 'Heavy duty shredder blades Hardox 500 alloy steel for Model TD912',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-22',
        'name': 'Non Woven Geotextile Fabric',
        'hsnCode': '560290',
        'description': 'Non Woven Geotextile Fabric sheet for landfill & civil filtration',
        'cgst': '6',
        'sgst': '6',
        'igst': '12',
        'ugst': '0'
    },
    {
        'id': 'ITM-23',
        'name': 'Black HDPE Poly Sheet',
        'hsnCode': '39201099',
        'description': 'Black High Density Polyethylene containment sheet',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-24',
        'name': 'Installation of Geomembrane',
        'hsnCode': '995419',
        'description': 'Laying, jointing and installation service for Geomembrane liners',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-25',
        'name': 'Consultancy Service',
        'hsnCode': '998399',
        'description': 'Technical environmental consultancy and invoice uploading',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-26',
        'name': 'Over Band Magnetic Separator',
        'hsnCode': '85051190',
        'description': 'Industrial suspension magnetic separator for conveyor scrap separation',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-27',
        'name': 'Safety Jacket with 2 logo 120 GSM',
        'hsnCode': '6210',
        'description': 'High-visibility safety jackets 120 GSM (Green/Orange)',
        'cgst': '2.5',
        'sgst': '2.5',
        'igst': '5',
        'ugst': '0'
    },
    {
        'id': 'ITM-28',
        'name': 'Safety Helmet with Rechant logo',
        'hsnCode': '6506',
        'description': 'Industrial safety helmets with logo branding (White/Yellow)',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-29',
        'name': 'Twin Shaft Shredder',
        'hsnCode': '8477800000',
        'description': 'Heavy industrial twin shaft shredder machine for solid waste',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-30',
        'name': 'Veneer Chipper Machine Cutting Fly Knife',
        'hsnCode': '84659100',
        'description': 'High speed alloy cutting fly knife blade for veneer chipper',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-31',
        'name': 'Maintenance of Shredder Blades',
        'hsnCode': '123456',
        'description': 'Resharpening, hardfacing and maintenance service of shredder blades',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-32',
        'name': 'Installation of Geotextile',
        'hsnCode': '995419',
        'description': 'Site laying, anchoring and installation work for Geotextile fabric',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    },
    {
        'id': 'ITM-33',
        'name': 'Installation of Clay Liner',
        'hsnCode': '995419',
        'description': 'Compacted clay barrier liner installation and grading work',
        'cgst': '9',
        'sgst': '9',
        'igst': '18',
        'ugst': '0'
    }
]

print(f"Prepared {len(new_items_list)} new items from Excel.")

# Format JS items
def format_item_js(it):
    return f"""                {{ id: {json.dumps(it['id'])}, name: {json.dumps(it['name'])}, hsnCode: {json.dumps(it['hsnCode'])}, description: {json.dumps(it['description'])}, cgst: {json.dumps(it['cgst'])}, sgst: {json.dumps(it['sgst'])}, igst: {json.dumps(it['igst'])}, ugst: {json.dumps(it['ugst'])} }}"""

js_block = ',\n' + ',\n'.join(format_item_js(it) for it in new_items_list)

# 2. Update frontend/app.js
with open('frontend/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

target_marker = """                { id: 'ITM-11', name: 'METAL WASTE', hsnCode: '7204', description: 'Metal Scrap Waste', cgst: '9', sgst: '9', igst: '18', ugst: '0' }
            ];
            data['unitMaster'] = ["""

replacement_marker = """                { id: 'ITM-11', name: 'METAL WASTE', hsnCode: '7204', description: 'Metal Scrap Waste', cgst: '9', sgst: '9', igst: '18', ugst: '0' }""" + js_block + """
            ];
            data['unitMaster'] = ["""

if target_marker in app_js:
    new_app_js = app_js.replace(target_marker, replacement_marker, 1)
    with open('frontend/app.js', 'w', encoding='utf-8') as f:
        f.write(new_app_js)
    print("[OK] Successfully inserted 22 new items into frontend/app.js")
else:
    print("[ERROR] Target marker not found in frontend/app.js")

# 3. Update index (29).html
with open('index (29).html', 'r', encoding='utf-8') as f:
    html_content = f.read()

if target_marker in html_content:
    new_html = html_content.replace(target_marker, replacement_marker, 1)
    with open('index (29).html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("[OK] Successfully inserted 22 new items into index (29).html")
else:
    print("[ERROR] Target marker not found in index (29).html")

# 4. Generate supabase/seed_items.sql
all_items = [
    { 'id': 'ITM-1', 'name': 'Transport', 'hsnCode': '996511', 'description': 'Transportation', 'cgst': '6', 'sgst': '6', 'igst': '12', 'ugst': '12' },
    { 'id': 'ITM-2', 'name': 'RDF', 'hsnCode': '3825', 'description': 'Refuse Derived Fuel', 'cgst': '9', 'sgst': '9', 'igst': '18', 'ugst': '0' },
    { 'id': 'ITM-3', 'name': 'PLYWOOD WASTE', 'hsnCode': '4707', 'description': 'PLYWOOD WASTE', 'cgst': '2.5', 'sgst': '2.5', 'igst': '5', 'ugst': '0' },
    { 'id': 'ITM-4', 'name': 'SHREDDED RDF', 'hsnCode': '3825', 'description': 'SHREDDED RDF', 'cgst': '9', 'sgst:': '9', 'igst': '18', 'ugst': '0' },
    { 'id': 'ITM-5', 'name': 'PLASTIC WASTE', 'hsnCode': '3925', 'description': 'PLASTIC WASTE', 'cgst': '9', 'sgst': '9', 'igst': '18', 'ugst': '0' },
    { 'id': 'ITM-6', 'name': 'Shredder Blade', 'hsnCode': '84749000', 'description': 'Metal Blade', 'cgst': '9', 'sgst': '9', 'igst': '18', 'ugst': '0' },
    { 'id': 'ITM-7', 'name': 'AGRO WASTE', 'hsnCode': '1213', 'description': 'Agricultural waste from farms', 'cgst': '2.5', 'sgst': '2.5', 'igst': '5', 'ugst': '0' },
    { 'id': 'ITM-8', 'name': 'EPR Credit Cat 2', 'hsnCode': '998599', 'description': 'EPR Credit (Category 2)', 'cgst': '9', 'sgst': '9', 'igst': '18', 'ugst': '0' },
    { 'id': 'ITM-9', 'name': 'MSW', 'hsnCode': '3825', 'description': 'Municipal Solid Waste', 'cgst': '2.5', 'sgst': '2.5', 'igst': '5', 'ugst': '0' },
    { 'id': 'ITM-10', 'name': 'PAPER WASTE', 'hsnCode': '4707', 'description': 'Paper Waste', 'cgst': '2.5', 'sgst': '2.5', 'igst': '5', 'ugst': '0' },
    { 'id': 'ITM-11', 'name': 'METAL WASTE', 'hsnCode': '7204', 'description': 'Metal Scrap Waste', 'cgst': '9', 'sgst': '9', 'igst': '18', 'ugst': '0' }
] + new_items_list

sql_lines = [
    "-- ==============================================================================",
    "-- SEED SCRIPT: COMPLETE ITEMS MASTER (from items.xlsx)",
    "-- Target Table: public.items",
    "-- ==============================================================================\n"
]

def esc_sql(val):
    if not val:
        return "NULL"
    cleaned = str(val).replace("'", "''")
    return f"'{cleaned}'"

for it in all_items:
    iid = esc_sql(it['id'])
    name = esc_sql(it['name'])
    hsn = esc_sql(it['hsnCode'])
    desc = esc_sql(it['description'])
    cgst = it.get('cgst', '0')
    sgst = it.get('sgst', '0')
    igst = it.get('igst', '0')
    ugst = it.get('ugst', '0')

    stmt = f"""INSERT INTO public.items (
    id, name, hsn_code, description, cgst_rate, sgst_rate, igst_rate, ugst_rate, is_active
) VALUES (
    {iid}, {name}, {hsn}, {desc}, {cgst}, {sgst}, {igst}, {ugst}, TRUE
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    hsn_code = EXCLUDED.hsn_code,
    description = EXCLUDED.description,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    ugst_rate = EXCLUDED.ugst_rate,
    is_active = TRUE,
    updated_at = NOW();"""
    sql_lines.append(stmt)

with open('supabase/seed_items.sql', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(sql_lines) + '\n')

print("[OK] Successfully created supabase/seed_items.sql with all 33 items.")
