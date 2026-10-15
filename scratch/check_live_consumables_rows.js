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

  // Evaluate query on Supabase client if session exists
  const evalRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const client = window.getSupabaseClient();
      const session = (await client.auth.getSession())?.data?.session;
      let queryResult = null;
      if (session) {
        queryResult = await client.from('consumables').select('*');
      }
      return {
        hasSession: !!session,
        userEmail: session?.user?.email,
        queryResult: queryResult ? {
          data: queryResult.data,
          error: queryResult.error ? { message: queryResult.error.message, code: queryResult.error.code } : null
        } : null
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Session & Consumables Check:', JSON.stringify(evalRes.result.value, null, 2));
  ws.close();
})();
