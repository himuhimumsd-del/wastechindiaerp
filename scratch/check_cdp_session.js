async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A21A52169AA483E9EDB559C3DFA13DDA');

  ws.onopen = () => {
    const expr = `
      (async () => {
        let session = null;
        try {
          if (window.supabaseClient && window.supabaseClient.auth) {
            const res = await window.supabaseClient.auth.getSession();
            session = res.data && res.data.session ? res.data.session : null;
          }
        } catch (e) {
          session = { error: e.message };
        }

        const lsKeys = Object.keys(localStorage);
        const ssKeys = Object.keys(sessionStorage);
        const userEmail = session && session.user ? session.user.email : null;
        const sessionPresent = !!(session && session.user);

        return {
          sessionPresent,
          userEmail,
          lsKeys,
          ssKeys,
          url: window.location.href,
          title: document.title,
          bodyTextSnippet: document.body.innerText.slice(0, 300)
        };
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
      console.log(JSON.stringify(res.result, null, 2));
      ws.close();
      process.exit(0);
    }
  };

  ws.onerror = (err) => {
    console.error('WS Error:', err);
    process.exit(1);
  };
}

main();
