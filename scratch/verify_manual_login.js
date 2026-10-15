async function check() {
  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const erpTab = tabs.find(t => t.url.includes('8085'));
  const ws = new WebSocket(erpTab.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const client = window.getSupabaseClient ? window.getSupabaseClient() : window.supabaseClient;
          return client.auth.getSession().then(res => {
            const session = res.data?.session;
            return {
              sessionPresent: !!(session && session.user),
              authenticatedEmail: session?.user?.email || null,
              currentUrl: window.location.href,
              first100Chars: document.body?.innerText?.slice(0, 100) || ''
            };
          });
        })()`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (msg) => {
    const res = JSON.parse(msg.data);
    if (res.id === 1) {
      console.log(JSON.stringify(res.result.result.value, null, 2));
      ws.close();
      process.exit(0);
    }
  };
}
check();
