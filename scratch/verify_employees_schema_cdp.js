(async () => {
  const WebSocket = globalThis.WebSocket;
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const erpTab = tabs.find(t => t.url.includes('8085'));
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
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  const evalRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const client = window.getSupabaseClient();
      
      const cols = [
        'id', 'business_id', 'plant_id', '"companyId"', 'name', 'department',
        'shift_name', 'shift_id', 'doj', 'basic_pay', 'hra', 'allowances',
        'pf_applicable', 'esi_applicable', 'advance_balance', 'ot_rate_per_hr',
        'allocated_paid_leaves', 'bank_name', 'account_no', 'ifsc_code',
        'pan_no', 'aadhar_no', 'uan_no', 'esic_no', 'status', 'created_at', 'updated_at'
      ];

      // Test all columns combined
      const allColsRes = await client.from('employees').select(cols.join(', '));
      
      // Test invalid column to confirm error detection
      const badColRes = await client.from('employees').select('non_existent_column_xyz_123');
      
      // Test individual columns
      const colResults = {};
      for (const col of cols) {
        const r = await client.from('employees').select(col);
        colResults[col] = r.error ? r.error.message : 'EXISTS';
      }

      return {
        tableExists: true,
        allColsCheck: allColsRes.error ? allColsRes.error : 'ALL_COLS_VALID',
        badColDetection: badColRes.error ? { code: badColRes.error.code, message: badColRes.error.message } : 'NO_ERROR_DETECTED',
        colResults
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Verification Result:\n', JSON.stringify(evalRes.result.value, null, 2));
  ws.close();
})();
