(async () => {
  const WebSocket = globalThis.WebSocket;
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const erpTab = tabs.find(t => t.url && (t.url.includes('8085') || t.title.includes('EcoManage')));
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
          resolve(msg);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Page.reload', {});
  await new Promise(r => setTimeout(r, 1500));

  const evalRes = await send('Runtime.evaluate', {
    expression: `({
      hasGetAuthPlant: typeof getCurrentAuthorizedPlant === 'function',
      hasGetAuthBiz: typeof getCurrentAuthorizedBusiness === 'function',
      hasGetAccPlants: typeof getAccessiblePlants === 'function',
      hasGetAccBiz: typeof getAccessibleBusinesses === 'function',
      hasIsAuthPlant: typeof isAuthorizedPlant === 'function',
      hasIsAuthBiz: typeof isAuthorizedBusiness === 'function',
      hasAssertPlant: typeof assertAuthorizedPlant === 'function',
      hasAssertBiz: typeof assertAuthorizedBusiness === 'function',
      hasGetDisplay: typeof getCurrentPlantDisplayData === 'function',
      hasPlantFilterOpts: typeof plantFilterOptions === 'function',
      unauthPlant: getCurrentAuthorizedPlant(),
      unauthPlantsList: getAccessiblePlants(),
      unauthFilterOpts: plantFilterOptions(),
      isAuthComp1: isAuthorizedPlant('COMP-1')
    })`,
    returnByValue: true
  });
  console.log('Live Browser Helpers Check:', JSON.stringify(evalRes.result.result.value, null, 2));
  ws.close();
})();
