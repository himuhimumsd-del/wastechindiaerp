const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkTrips() {
    // Read supabase credentials from supabase-client.js or .env
    const sc = fs.readFileSync('frontend/supabase-client.js', 'utf8');
    const urlMatch = sc.match(/url:\s*['"]([^'"]+)['"]/);
    const keyMatch = sc.match(/anonKey:\s*['"]([^'"]+)['"]/);
    
    if (!urlMatch || !keyMatch) {
        console.error('Credentials not found');
        return;
    }
    
    const client = createClient(urlMatch[1], keyMatch[1]);
    const { data: trips, error } = await client.from('trips').select('*').limit(5);
    console.log('Trips from DB:', error ? error.message : trips.map(t => ({ id: t.id, type: typeof t.id, challan_no: t.challan_number, lr_no: t.lr_number })));
}

checkTrips();
