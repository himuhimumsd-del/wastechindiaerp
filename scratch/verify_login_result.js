async function verifyResult() {
  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const erpTab = tabs.find(t => t.url.includes('8085'));
  if (!erpTab) {
    console.error('No ERP tab found');
    process.exit(1);
  }

  const ws = new WebSocket(erpTab.webSocketDebuggerUrl);
  ws.onopen = () => {
    const expr = `
      (async () => {
        let session = null;
        try {
          const client = window.getSupabaseClient ? window.getSupabaseClient() : window.supabaseClient;
          if (client && client.auth) {
            const res = await client.auth.getSession();
            session = res.data ? res.data.session : null;
          }
        } catch (e) {
          session = { error: e.message };
        }

        const sessionPresent = !!(session && session.user);
        const authenticatedEmail = session && session.user ? session.user.email : null;
        const currentUrl = window.location.href;
        const first150Chars = document.body ? document.body.innerText.slice(0, 150) : '';

        const emailEl = document.querySelector('#login-email') || document.querySelector('input[type="email"]');
        const pwdEl = document.querySelector('#login-password') || document.querySelector('input[type="password"]');
        
        const lockScreenEl = document.querySelector('#auth-modal') || 
                             document.querySelector('#login-modal') ||
                             Array.from(document.querySelectorAll('div, section')).find(el => el.innerText && el.innerText.includes('ERP Access Locked'));
        const isLockScreenVisible = !!lockScreenEl && (lockScreenEl.offsetParent !== null || window.getComputedStyle(lockScreenEl).display !== 'none');

        return {
          sessionPresent,
          authenticatedEmail,
          currentUrl,
          first150Chars,
          emailExists: !!emailEl,
          pwdExists: !!pwdEl,
          isLockScreenVisible
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

  ws.onmessage = (msg) => {
    const res = JSON.parse(msg.data);
    if (res.id === 1) {
      console.log(JSON.stringify(res.result?.result?.value || res.result, null, 2));
      ws.close();
      process.exit(0);
    }
  };

  ws.onerror = (err) => {
    console.error('WS Error:', err);
    process.exit(1);
  };
}

verifyResult();
