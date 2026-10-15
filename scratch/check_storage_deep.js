async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A21A52169AA483E9EDB559C3DFA13DDA');

  ws.onopen = () => {
    const expr = `
      (async () => {
        let dbs = [];
        try {
          if (indexedDB && indexedDB.databases) {
            dbs = await indexedDB.databases();
          }
        } catch (e) {
          dbs = e.message;
        }
        return {
          indexedDBDatabases: dbs,
          cookies: document.cookie,
          localStorageKeys: Object.keys(localStorage),
          sessionStorageKeys: Object.keys(sessionStorage)
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
}

main();
