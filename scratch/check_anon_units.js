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
      const { data: uData, error: uErr } = await client.from('units').select('*');
      const { data: pData, error: pErr } = await client.from('po_types').select('*');
      return {
        units: uData,
        unitsErr: uErr ? uErr.message : null,
        poTypes: pData,
        poTypesErr: pErr ? pErr.message : null
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Anon Query Result:', JSON.stringify(evalRes.result.result.value, null, 2));
  ws.close();
})();
