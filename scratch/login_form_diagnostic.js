async function runDiagnostic() {
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
        // 1. #login-email
        const emailEl = document.querySelector('#login-email') || document.querySelector('input[type="email"]');
        const emailExists = !!emailEl;
        const emailHasValue = !!(emailEl && emailEl.value && emailEl.value.trim().length > 0);

        // 2. #login-password
        const pwdEl = document.querySelector('#login-password') || document.querySelector('input[type="password"]');
        const pwdExists = !!pwdEl;
        const pwdHasValue = !!(pwdEl && pwdEl.value && pwdEl.value.trim().length > 0);

        // 3. Sign In button
        const signInBtn = document.querySelector('#login-btn') || 
                          Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toLowerCase().includes('sign in')) ||
                          document.querySelector('button[type="submit"]');
        const btnExists = !!signInBtn;
        const btnDisabled = signInBtn ? signInBtn.disabled : null;

        // 4. Login error state
        const errorSelectors = ['.alert', '.error', '[role="alert"]', '#login-error', '.text-red-500', '.text-danger', '.errorMessage'];
        const errorMessages = [];
        for (const sel of errorSelectors) {
          document.querySelectorAll(sel).forEach(el => {
            const txt = el.innerText ? el.innerText.trim() : '';
            if (txt && !errorMessages.includes(txt)) {
              errorMessages.push(txt);
            }
          });
        }

        // 5. Current auth state
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
        } catch (e) {
          // ignore error
        }

        // 6. Current URL and lock screen visibility
        const currentUrl = window.location.href;
        const lockScreenEl = document.querySelector('#auth-modal') || 
                             document.querySelector('#login-modal') ||
                             Array.from(document.querySelectorAll('div, section')).find(el => el.innerText && el.innerText.includes('ERP Access Locked'));
        const isLockScreenVisible = !!lockScreenEl && (lockScreenEl.offsetParent !== null || window.getComputedStyle(lockScreenEl).display !== 'none');

        return {
          emailExists,
          emailHasValue,
          pwdExists,
          pwdHasValue,
          btnExists,
          btnDisabled,
          errorMessages,
          sessionPresent,
          authenticatedEmail,
          currentUrl,
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

runDiagnostic();
