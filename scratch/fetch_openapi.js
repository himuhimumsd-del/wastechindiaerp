const fs = require('fs');

async function main() {
    const url = 'https://hwhqcayutqtuevwanbnq.supabase.co/rest/v1/?apikey=sb_publishable_d1yVc95G6wJbUkXcgpARlw_rOt5gpZA';
    const res = await fetch(url, {
        headers: {
            'apikey': 'sb_publishable_d1yVc95G6wJbUkXcgpARlw_rOt5gpZA',
            'Accept': 'application/openapi+json'
        }
    });
    console.log('Status:', res.status);
    if (!res.ok) {
        console.log('Error text:', await res.text());
        return;
    }
    const spec = await res.json();
    console.log('Title:', spec.info ? spec.info.title : 'No title');
    
    // Check definitions for machine_logs
    if (spec.definitions && spec.definitions.machine_logs) {
        console.log('machine_logs definition:');
        console.log(JSON.stringify(spec.definitions.machine_logs, null, 2));
    } else {
        console.log('machine_logs not found in definitions. Keys:', Object.keys(spec.definitions || {}));
    }

    // Save spec for analysis
    fs.writeFileSync('scratch/openapi_spec.json', JSON.stringify(spec, null, 2));
    console.log('Wrote scratch/openapi_spec.json');
}

main().catch(console.error);
