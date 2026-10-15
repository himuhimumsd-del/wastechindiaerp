const fs = require('fs');

async function getErpTab() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    let erpTab = tabs.find(t => t.url && (t.url.includes('8085') || t.title.includes('EcoManage')));
    if (!erpTab) {
        throw new Error('ERP tab not found on http://127.0.0.1:8085/.');
    }
    return erpTab;
}

class CdpClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.msgId = 0;
        this.callbacks = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id && this.callbacks.has(msg.id)) {
                    const cb = this.callbacks.get(msg.id);
                    this.callbacks.delete(msg.id);
                    cb(msg);
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.msgId;
            this.callbacks.set(id, (response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.result);
                }
            });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error('CDP Eval Exception: ' + (res.exceptionDetails.exception ? res.exceptionDetails.exception.description : JSON.stringify(res.exceptionDetails)));
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function run() {
    console.log('================================================================');
    console.log('WAVE 10.1.1: LIVE SHIFTS EMPTY-RESULT SECURITY HARDENING CHECK');
    console.log('================================================================\n');

    const erpTab = await getErpTab();
    const cdp = new CdpClient(erpTab.webSocketDebuggerUrl);
    await cdp.connect();

    const result = await cdp.evaluate(`(() => {
        // Test 1: Authenticated and liveMasterLoaded.shifts === true with empty authorized shifts
        state.authAuthorized = true;
        state.liveMasterLoaded = { shifts: true };
        state.liveMasters = state.liveMasters || {};
        state.liveMasters.shifts = [];

        const loadedEmptyResult = getLiveShifts();

        // Test 2: Unauthenticated or failed (liveMasterLoaded.shifts === false)
        state.liveMasterLoaded.shifts = false;
        state.liveMasters.shifts = [];

        const unauthenticatedFallbackResult = getLiveShifts();

        return {
            loadedEmptyLength: loadedEmptyResult.length,
            unauthFallbackLength: unauthenticatedFallbackResult.length
        };
    })()`);

    console.log('10.1.1.1 Empty result when loaded returns empty array (no fallback leak):', result.loadedEmptyLength === 0 ? 'PASS (0)' : 'FAIL (' + result.loadedEmptyLength + ')');
    console.log('10.1.1.2 Fallback preserved when unauthenticated / unloaded:', result.unauthFallbackLength > 0 ? 'PASS (' + result.unauthFallbackLength + ')' : 'FAIL');

    cdp.close();

    if (result.loadedEmptyLength === 0 && result.unauthFallbackLength > 0) {
        console.log('\n>>> WAVE 10.1.1 SECURITY HARDENING: VERIFIED PASS 100%');
    } else {
        throw new Error('WAVE 10.1.1 Security Hardening failed');
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
