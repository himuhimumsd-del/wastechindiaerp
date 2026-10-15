(async () => {
  const WebSocket = globalThis.WebSocket;
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const erpTab = tabs.find(t => t.url.includes('8085') || t.title.includes('EcoManage'));
  if (!erpTab) {
    console.error('ERP tab not found');
    process.exit(1);
  }
  const ws = new WebSocket(erpTab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  function send(method, params) {
    return new Promise((resolve) => {
      const curId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  const evalRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const client = window.getSupabaseClient();
      const shiftRes = await client.from('shifts').select('id, plant_id, name, start_time, end_time, grace_period_mins, min_hours_full_day, min_hours_half_day, is_active, created_at, updated_at');
      const badColRes = await client.from('shifts').select('id, invalid_col_test_123');
      return {
        columnsTest: {
          data: shiftRes.data,
          error: shiftRes.error ? { message: shiftRes.error.message, code: shiftRes.error.code } : null
        },
        badColTest: {
          error: badColRes.error ? { message: badColRes.error.message, code: badColRes.error.code } : null
        }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Live Shifts Check:', JSON.stringify(evalRes.result.value, null, 2));
  ws.close();
})();
