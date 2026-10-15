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
      const res = await client.from('employees').select('non_existent_column_xyz_123');
      return {
        data: res.data,
        error: res.error ? { message: res.error.message, code: res.error.code, details: res.error.details } : null
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Bad col res:', evalRes.result.value);
  ws.close();
})();
