const fs = require('fs');

async function checkTrips() {
    const sc = fs.readFileSync('frontend/supabase-client.js', 'utf8');
    const urlMatch = sc.match(/url:\s*['"]([^'"]+)['"]/);
    const keyMatch = sc.match(/anonKey:\s*['"]([^'"]+)['"]/);
    
    const res = await fetch(`${urlMatch[1]}/rest/v1/trips?select=*&limit=5`, {
        headers: {
            'apikey': keyMatch[1],
            'Authorization': `Bearer ${keyMatch[1]}`
        }
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
}

checkTrips();
