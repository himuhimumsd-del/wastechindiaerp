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
      const machRes = await client.from('machinery').select('*');
      const plantMachRes = await client.from('plant_machinery').select('*');
      return {
        machinery: { data: machRes.data, error: machRes.error ? { message: machRes.error.message, code: machRes.error.code } : null },
        plant_machinery: { data: plantMachRes.data, error: plantMachRes.error ? { message: plantMachRes.error.message, code: plantMachRes.error.code } : null }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('DB check:', JSON.stringify(evalRes.result.value, null, 2));
  ws.close();
})();
