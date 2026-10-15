import zipfile
import xml.etree.ElementTree as ET
import json

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

print(f"Total raw items: {len(raw_items)}")
for i, item in enumerate(raw_items):
    print(f"{i+1}. S.No: {item.get('S.No.')} | Name: {item.get('Item Name')} | HSN: {item.get('HSN Code')} | CGST: {item.get('CGST %')} | SGST: {item.get('SGST %')} | IGST: {item.get('IGST %')}")
