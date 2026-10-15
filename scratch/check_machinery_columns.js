(async () => {
  const WebSocket = globalThis.WebSocket;
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const erpTab = tabs.find(t => t.url.includes('8085'));
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
      // Test select with specific columns on machinery
      const { error } = await client.from('machinery').select('id, business_id, plant_id, "companyId", name, type, fuel_type, capacity, status, created_at, updated_at');
      return { error: error ? { message: error.message, code: error.code } : null };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Columns check:', JSON.stringify(evalRes.result.value, null, 2));
  ws.close();
})();
