const fs = require('fs');

async function main() {
    // Read Supabase config from supabase-client.js
    const clientCode = fs.readFileSync('frontend/supabase-client.js', 'utf8');
    const urlMatch = clientCode.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = clientCode.match(/const\s+SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
    
    if (!urlMatch || !keyMatch) {
        console.error('Could not extract SUPABASE_URL or SUPABASE_ANON_KEY');
        process.exit(1);
    }
    
    const supabaseUrl = urlMatch[1];
    const supabaseAnonKey = keyMatch[1];
    
    console.log('Querying Supabase PostgREST at:', supabaseUrl);
    
    // Check anonymous query to /rest/v1/employees
    try {
        const anonRes = await fetch(`${supabaseUrl}/rest/v1/employees?select=*&limit=5`, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });
        console.log('Anonymous /rest/v1/employees status:', anonRes.status, anonRes.statusText);
        const anonData = await anonRes.json();
        console.log('Anonymous response body:', JSON.stringify(anonData));
    } catch (e) {
        console.log('Anonymous fetch error:', e.message);
    }
}

main().catch(console.error);
