const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index (29).html', 'utf8');
const regex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 1;
while ((match = regex.exec(html)) !== null) {
    const code = match[1].trim();
    if (code) {
        try {
            new vm.Script(code);
            console.log('Script tag #' + idx + ' (length ' + code.length + ') syntax is VALID!');
        } catch (e) {
            console.error('Script tag #' + idx + ' error:', e.message);
        }
    }
    idx++;
}
