const baseUrl = 'https://hwhqcayutqtuevwanbnq.supabase.co';
const anonKey = 'sb_publishable_d1yVc95G6wJbUkXcgpARlw_rOt5gpZA';

async function testCols() {
  const candidateCols = [
    'id', 'trip_number', 'trip_type', 'trip_date', 'business_id', 'plant_id', 'companyId',
    'party_id', 'order_id', 'po_received_number', 'transport_po_received_number',
    'po_issued_number', 'linked_transport_po_issued_number', 'vehicle_id', 'transport_mode',
    'freight_paid_by', 'bill_type', 'is_insured', 'insurance_policy_details',
    'origin_city', 'origin_state', 'destination_city', 'destination_state',
    'gross_weight', 'tare_weight', 'net_weight', 'driver_name', 'driver_phone',
    'eway_bill_no', 'status', 'financial_year', 'created_by', 'updated_by',
    'created_at', 'updated_at',
    // speculative fields from frontend or other sources
    'client', 'vehicle', 'date', 'lr_number', 'challan_number', 'lr_date', 'challan_date',
    'tax_invoice_number', 'manifest_no', 'gate_entry_id', 'remarks'
  ];

  const present = [];
  const absent = [];

  for (const col of candidateCols) {
    const res = await fetch(baseUrl + '/rest/v1/trips?select=' + encodeURIComponent(col), {
      headers: { apikey: anonKey }
    }).then(r => r.json());

    if (res.code === '42501') {
      present.push(col);
    } else if (res.code === '42703') {
      absent.push(col);
    } else {
      console.log('Unexpected response for', col, res);
    }
  }

  console.log('PRESENT COLUMNS in public.trips (' + present.length + '):');
  console.log(JSON.stringify(present, null, 2));
  console.log('\nABSENT COLUMNS (' + absent.length + '):');
  console.log(JSON.stringify(absent, null, 2));
}

testCols();
