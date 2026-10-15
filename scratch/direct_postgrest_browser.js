async function runPostgrestRequests() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A21A52169AA483E9EDB559C3DFA13DDA');

  ws.onopen = () => {
    const expr = `
      (async () => {
        const sessionRes = window.supabaseClient && window.supabaseClient.auth
          ? await window.supabaseClient.auth.getSession()
          : null;
        const session = sessionRes && sessionRes.data ? sessionRes.data.session : null;

        const baseUrl = 'https://hwhqcayutqtuevwanbnq.supabase.co';
        const anonKey = 'sb_publishable_d1yVc95G6wJbUkXcgpARlw_rOt5gpZA';

        const headers = {
          'apikey': anonKey,
          'Content-Type': 'application/json'
        };

        if (session && session.access_token) {
          headers['Authorization'] = 'Bearer ' + session.access_token;
        }

        const endpoints = [
          '/rest/v1/sales_invoices?select=id,plant_id',
          '/rest/v1/sales_invoices?select=id,plant_id&plant_id=eq.COMP-2',
          '/rest/v1/vendor_invoices?select=id,plant_id',
          '/rest/v1/vendor_invoices?select=id,plant_id&plant_id=eq.COMP-2'
        ];

        const results = [];

        for (const ep of endpoints) {
          try {
            const res = await fetch(baseUrl + ep, {
              method: 'GET',
              headers: headers
            });
            const text = await res.text();
            let parsed = null;
            try { parsed = JSON.parse(text); } catch (_) {}

            const isArray = Array.isArray(parsed);
            const rowCount = isArray ? parsed.length : 0;
            const distinctPlants = isArray ? [...new Set(parsed.map(r => r.plant_id))] : [];

            results.push({
              endpoint: ep,
              status: res.status,
              statusText: res.statusText,
              rowCount: rowCount,
              distinctPlantIds: distinctPlants,
              rawResponse: parsed || text
            });
          } catch (err) {
            results.push({
              endpoint: ep,
              error: err.message
            });
          }
        }

        return {
          sessionPresent: !!(session && session.user),
          userEmail: session && session.user ? session.user.email : null,
          results: results
        };
      })()
    `;

    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (event) => {
    const res = JSON.parse(event.data);
    if (res.id === 1) {
      console.log(JSON.stringify(res, null, 2));
      ws.close();
      process.exit(0);
    }
  };

  ws.onerror = (err) => {
    console.error('WS Error:', err);
    process.exit(1);
  };
}

runPostgrestRequests();
