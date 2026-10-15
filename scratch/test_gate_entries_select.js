const https = require('https');

const url = 'https://hwhqcayutqtuevwanbnq.supabase.co/rest/v1/gate_entries?select=id,entry_number,trip_id,business_id,plant_id,companyId,movement_type,vehicle_no,driver_name,driver_phone,status,created_at';
const anonKey = 'sb_publishable_d1yVc95G6wJbUkXcgpARlw_rOt5gpZA';

const options = {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Accept': 'application/json'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Response count:', Array.isArray(json) ? json.length : 'Not an array');
      console.log('Response sample:', Array.isArray(json) ? json.slice(0, 2) : json);
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
