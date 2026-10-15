async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A21A52169AA483E9EDB559C3DFA13DDA');

  ws.onopen = () => {
    const expr = `
      (() => {
        const emailInput = document.getElementById('login-email') || document.querySelector('input[type="email"]');
        const passInput = document.getElementById('login-password') || document.querySelector('input[type="password"]');
        return {
          emailInputValue: emailInput ? emailInput.value : null,
          hasPassword: passInput ? !!passInput.value : false,
          activeElement: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : null
        };
      })()
    `;

    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: expr,
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
