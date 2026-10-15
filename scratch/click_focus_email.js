async function clickFocusEmail() {
  const ver = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
  const browserWs = new WebSocket(ver.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    browserWs.onopen = resolve;
    browserWs.onerror = reject;
  });

  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const erpTab = tabs.find(t => t.url.includes('8085')) || tabs[0];

  if (!erpTab) {
    console.error('No ERP tab found');
    process.exit(1);
  }

  // 1. Activate target via browser debugger
  browserWs.send(JSON.stringify({
    id: 1,
    method: 'Target.activateTarget',
    params: { targetId: erpTab.id }
  }));

  // 2. Unminimize / bring window to normal state
  browserWs.send(JSON.stringify({
    id: 2,
    method: 'Browser.getWindowForTarget',
    params: { targetId: erpTab.id }
  }));

  browserWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 2 && msg.result?.windowId) {
      const windowId = msg.result.windowId;
      browserWs.send(JSON.stringify({
        id: 3,
        method: 'Browser.setWindowBounds',
        params: {
          windowId: windowId,
          bounds: { windowState: 'normal' }
        }
      }));
    }
  };

  await new Promise(r => setTimeout(r, 200));

  // 3. Connect to page WS
  const pageWs = new WebSocket(erpTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    pageWs.onopen = resolve;
    pageWs.onerror = reject;
  });

  pageWs.send(JSON.stringify({
    id: 10,
    method: 'Page.bringToFront'
  }));

  // Get coordinates of #login-email to dispatch mouse click
  const evalCoords = `(() => {
    const el = document.querySelector('#login-email') || document.querySelector('input[type="email"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  })()`;

  pageWs.send(JSON.stringify({
    id: 11,
    method: 'Runtime.evaluate',
    params: {
      expression: evalCoords,
      returnByValue: true
    }
  }));

  pageWs.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 11) {
      const coords = msg.result?.result?.value;
      if (coords) {
        // Dispatch mousePressed and mouseReleased
        pageWs.send(JSON.stringify({
          id: 12,
          method: 'Input.dispatchMouseEvent',
          params: {
            type: 'mousePressed',
            x: coords.x,
            y: coords.y,
            button: 'left',
            clickCount: 1
          }
        }));
        pageWs.send(JSON.stringify({
          id: 13,
          method: 'Input.dispatchMouseEvent',
          params: {
            type: 'mouseReleased',
            x: coords.x,
            y: coords.y,
            button: 'left',
            clickCount: 1
          }
        }));
      }

      // Also ensure programmatically focused
      pageWs.send(JSON.stringify({
        id: 14,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const el = document.querySelector('#login-email') || document.querySelector('input[type="email"]');
            if (el) el.focus();
            return {
              isTargetActive: document.activeElement === el,
              activeElementId: document.activeElement ? document.activeElement.id : null,
              activeElementTag: document.activeElement ? document.activeElement.tagName : null
            };
          })()`,
          returnByValue: true
        }
      }));
    }

    if (msg.id === 14) {
      console.log(JSON.stringify(msg.result.result.value, null, 2));
      setTimeout(() => {
        pageWs.close();
        browserWs.close();
        process.exit(0);
      }, 300);
    }
  };

  pageWs.onerror = (err) => {
    console.error('Page WS Error:', err);
    process.exit(1);
  };
}

clickFocusEmail().catch(err => {
  console.error(err);
  process.exit(1);
});
