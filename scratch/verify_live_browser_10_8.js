async function verifyBrowser() {
  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const erpTab = tabs.find(t => t.url.includes('8085'));
  if (!erpTab) {
    console.error('No ERP tab found');
    process.exit(1);
  }

  const ws = new WebSocket(erpTab.webSocketDebuggerUrl);
  ws.onopen = () => {
    // Reload page to pick up updated app.js
    ws.send(JSON.stringify({
      id: 1,
      method: 'Page.reload',
      params: { ignoreCache: true }
    }));
  };

  ws.onmessage = async (msg) => {
    const res = JSON.parse(msg.data);
    if (res.id === 1) {
      // Wait 1.5 seconds for scripts to execute
      await new Promise(r => setTimeout(r, 1500));

      const expr = `
        (() => {
          const hasNormalize = typeof window.normalizeLiveItem === 'function';
          const hasGetLiveItems = typeof window.getLiveItems === 'function';
          const items = hasGetLiveItems ? window.getLiveItems() : null;
          const liveMastersItems = window.state && window.state.liveMasters ? window.state.liveMasters.items : null;
          const liveMasterLoaded = window.state && window.state.liveMasterLoaded ? window.state.liveMasterLoaded.items : null;

          // Test normalizeLiveItem directly inside browser context
          let testNorm = null;
          if (hasNormalize) {
            testNorm = window.normalizeLiveItem({
              id: 'ITM-99',
              name: 'Test Hazardous Waste',
              hsn_code: '3825',
              cgst_rate: '2.5',
              sgst_rate: '2.5',
              igst_rate: '0.0',
              ugst_rate: '0.0',
              is_active: true
            });
          }

          return {
            hasNormalize,
            hasGetLiveItems,
            itemsCount: items ? items.length : null,
            liveMastersItemsCount: liveMastersItems ? liveMastersItems.length : null,
            liveMasterLoaded,
            testNorm
          };
        })()
      `;

      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: expr,
          returnByValue: true
        }
      }));
    }

    if (res.id === 2) {
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

verifyBrowser();
