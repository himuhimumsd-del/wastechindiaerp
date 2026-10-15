async function bringToFront() {
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

  // Wait a moment for activateTarget
  await new Promise(r => setTimeout(r, 200));

  // 2. Connect to the page itself and call Page.bringToFront
  const pageWs = new WebSocket(erpTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    pageWs.onopen = resolve;
    pageWs.onerror = reject;
  });

  pageWs.send(JSON.stringify({
    id: 2,
    method: 'Page.bringToFront'
  }));

  // Get window ID and un-minimize if minimized
  browserWs.send(JSON.stringify({
    id: 3,
    method: 'Browser.getWindowForTarget',
    params: { targetId: erpTab.id }
  }));

  browserWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 3 && msg.result?.windowId) {
      const windowId = msg.result.windowId;
      browserWs.send(JSON.stringify({
        id: 4,
        method: 'Browser.setWindowBounds',
        params: {
          windowId: windowId,
          bounds: { windowState: 'normal' }
        }
      }));
    }
  };

  // Inspect page details
  pageWs.send(JSON.stringify({
    id: 5,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        return {
          currentUrl: window.location.href,
          pageTitle: document.title,
          first100Chars: document.body?.innerText?.slice(0, 100) || ''
        };
      })()`,
      returnByValue: true
    }
  }));

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 5) {
      console.log(JSON.stringify({
        targetId: erpTab.id,
        ...msg.result.result.value
      }, null, 2));

      setTimeout(() => {
        pageWs.close();
        browserWs.close();
        process.exit(0);
      }, 500);
    }
  };
}

bringToFront().catch(err => {
  console.error(err);
  process.exit(1);
});
