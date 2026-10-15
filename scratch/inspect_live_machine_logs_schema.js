const fs = require('fs');

async function main() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url && t.url.includes('8085'));
    if (!tab) throw new Error('Tab not found');

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    function evalCode(expr) {
        return new Promise((resolve, reject) => {
            const reqId = id++;
            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.id === reqId) {
                    if (msg.result && msg.result.result) resolve(msg.result.result.value);
                    else reject(msg.error || msg.result);
                }
            };
            ws.send(JSON.stringify({ id: reqId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
        });
    }

    // 1. Reload the page to get a pristine, un-mocked window and Supabase client
    await evalCode('window.location.reload()');
    await new Promise(r => setTimeout(r, 2500));

    // 2. Query live Supabase directly
    const testRes = await evalCode(`(async () => {
        const client = window.getSupabaseClient();
        const cols = [
            'id', 'machine_id', 'business_id', 'plant_id', 'companyId',
            'log_date', 'hours_run', 'fuel_consumed_litres', 'units_consumed_kwh',
            'maintenance_performed', 'breakdown_hours', 'operator_emp_id',
            'remarks', 'created_by', 'created_at', 'updated_at'
        ];

        const results = {};
        // 1. Direct select
        const rAll = await client.from('machine_logs').select(cols.join(', '));
        results.allCols = { data: rAll.data, error: rAll.error };

        // 2. Individual select
        results.colResults = {};
        for (const col of cols) {
            const r = await client.from('machine_logs').select(col);
            results.colResults[col] = r.error ? { code: r.error.code, message: r.error.message } : 'EXISTS';
        }

        // 3. Bad column test
        const rBad = await client.from('machine_logs').select('non_existent_dummy_column_123');
        results.badCol = { code: rBad.error?.code, message: rBad.error?.message };

        return results;
    })()`);

    console.log('Real Live Supabase Query Results:', JSON.stringify(testRes, null, 2));
    ws.close();
}

main().catch(console.error);
