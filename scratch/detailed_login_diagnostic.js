async function detailedDiagnostic() {
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
        // 1. Email field
        const emailEl = document.querySelector('#login-email') || document.querySelector('input[type="email"]');
        const emailExists = !!emailEl;
        const emailNonEmpty = !!(emailEl && emailEl.value && emailEl.value.trim().length > 0);

        // 2. Password field
        const pwdEl = document.querySelector('#login-password') || document.querySelector('input[type="password"]');
        const pwdExists = !!pwdEl;
        const pwdNonEmpty = !!(pwdEl && pwdEl.value && pwdEl.value.trim().length > 0);

        // 3. Sign-in button
        const btn = document.querySelector('#login-btn') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toLowerCase().includes('sign in')) ||
                    document.querySelector('button[type="submit"]');
        const btnExists = !!btn;
        const btnDisabled = btn ? !!btn.disabled : null;
        const btnVisible = btn ? (btn.offsetParent !== null && window.getComputedStyle(btn).display !== 'none' && window.getComputedStyle(btn).visibility !== 'hidden') : false;

        // 4. Login error inspection
        const selectors = ['.alert', '.error', '[role="alert"]', '#login-error'];
        const foundErrors = [];
        for (const s of selectors) {
          document.querySelectorAll(s).forEach(el => {
            const txt = el.innerText ? el.innerText.trim() : '';
            if (txt && !foundErrors.includes(txt)) {
              foundErrors.push(txt);
            }
          });
        }

        // 5. Auth session
        let sessionPresent = false;
        let authenticatedEmail = null;
        try {
          const client = window.getSupabaseClient ? window.getSupabaseClient() : window.supabaseClient;
          if (client && client.auth) {
            const res = await client.auth.getSession();
            const session = res.data ? res.data.session : null;
            sessionPresent = !!(session && session.user);
            authenticatedEmail = session && session.user ? session.user.email : null;
          }
        } catch (_) {}

        // 6. Current page
        const currentUrl = window.location.href;
        const erpLockedVisible = document.body ? document.body.innerText.includes('ERP Access Locked') : false;

        return {
          emailExists,
          emailNonEmpty,
          pwdExists,
          pwdNonEmpty,
          btnExists,
          btnDisabled,
          btnVisible,
          foundErrors,
          sessionPresent,
          authenticatedEmail,
          currentUrl,
          erpLockedVisible
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

detailedDiagnostic();
