async function inspectAuth() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A21A52169AA483E9EDB559C3DFA13DDA');

  ws.onopen = () => {
    const expr = `
      (async () => {
        try {
          const client = window.getSupabaseClient ? window.getSupabaseClient() : window.supabaseClient;
          if (!client) return { error: "No Supabase client found on window" };
          const res = await client.auth.getSession();
          const session = res.data ? res.data.session : null;
          return {
            hasClient: true,
            hasData: !!res.data,
            sessionPresent: !!session,
            userEmail: session && session.user ? session.user.email : null,
            userId: session && session.user ? session.user.id : null,
            authError: res.error ? res.error.message : null
          };
        } catch (err) {
          return { error: err.message };
        }
      })()
    `;

    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (event) => {
    const res = JSON.parse(event.data);
    if (res.id === 1) {
      console.log(JSON.stringify(res.result?.result?.value || res.result, null, 2));
      ws.close();
      process.exit(0);
    }
  };
}

inspectAuth();
