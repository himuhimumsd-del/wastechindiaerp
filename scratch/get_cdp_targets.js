async function test() {
  const ver = await fetch('http://127.0.0.1:9222/json/version').then(r => r.json());
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Target.getTargets' }));
  };
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.id === 1) {
      console.log(JSON.stringify(data.result.targetInfos, null, 2));
      ws.close();
      process.exit(0);
    }
  };
}
test();
