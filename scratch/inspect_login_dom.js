async function test() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A21A52169AA483E9EDB559C3DFA13DDA');
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const email = document.querySelector('#login-email')?.value;
          const pwd = document.querySelector('#login-password')?.value;
          const alerts = Array.from(document.querySelectorAll('.alert, .error, [role="alert"], #login-error')).map(e => e.innerText);
          return { email, hasPwd: !!pwd, alerts, activeElement: document.activeElement?.outerHTML?.slice(0, 100) };
        })()`,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.id === 1) {
      console.log(JSON.stringify(data.result.result.value, null, 2));
      ws.close();
      process.exit(0);
    }
  };
}
test();
