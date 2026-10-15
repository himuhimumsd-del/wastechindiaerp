const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'frontend', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

if (!content.includes('.table-scroll {\n    -webkit-overflow-scrolling: touch;') && !content.includes('.table-scroll { -webkit-overflow-scrolling: touch; }')) {
    content = content.replace(
        '.table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }',
        '.table-scroll { -webkit-overflow-scrolling: touch; }\n.table-scroll::-webkit-scrollbar { height: 8px; width: 8px; }'
    );
    fs.writeFileSync(cssPath, content, 'utf8');
    console.log('Added touch scrolling to .table-scroll');
} else {
    console.log('Already added.');
}
