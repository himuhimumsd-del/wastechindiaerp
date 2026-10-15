async function checkCookies() {
  const ver = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Storage.getCookies'
    }));
  };
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.id === 1) {
      console.log('All browser cookies count:', data.result.cookies.length);
      console.log('Domains:', [...new Set(data.result.cookies.map(c => c.domain))]);
      ws.close();
      process.exit(0);
    }
  };
}
checkCookies();
