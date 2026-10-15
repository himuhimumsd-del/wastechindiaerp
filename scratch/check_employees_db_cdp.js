(async () => {
  const WebSocket = globalThis.WebSocket;
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const erpTab = tabs.find(t => t.url.includes('8085') || t.title.includes('EcoManage'));
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
    expression: `window.getSupabaseClient ? 'client_exists' : 'no_client'`,
    returnByValue: true
  });
  console.log('client check:', evalRes);

  const evalQuery = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const client = window.getSupabaseClient();
        const res = await client.from('employees').select('*');
        return { data: res.data, error: res.error };
      } catch (err) {
        return { thrown: err.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('query check:', evalQuery);

  ws.close();
})();
