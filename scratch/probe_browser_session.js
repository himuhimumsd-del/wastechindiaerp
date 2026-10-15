(async () => {
  const WebSocket = globalThis.WebSocket;
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const erpTab = tabs.find(t => t.url && (t.url.includes('8085') || t.title.includes('EcoManage')));
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
          resolve(msg);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  const evalRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const client = window.getSupabaseClient();
      const sess = await client.auth.getSession();
      return {
        hasSession: !!(sess && sess.data && sess.data.session),
        userEmail: sess?.data?.session?.user?.email || null
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Current Browser Session:', JSON.stringify(evalRes.result.result.value, null, 2));
  ws.close();
})();
