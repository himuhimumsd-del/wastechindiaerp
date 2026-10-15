const fs = require('fs');
const path = require('path');

const projectRoot = '.';

const searchTerms = [
  'service_role',
  'SUPABASE_SERVICE_ROLE_KEY',
  'password',
  'client_secret',
  'META_APP_SECRET',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  ':3000',
  ':5173',
  ':8080',
  ':8085',
  'file://'
];

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === 'scratch') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = getFiles(projectRoot);
console.log(`Scanning ${allFiles.length} files...`);

const findings = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    searchTerms.forEach(term => {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        // Filter out benign common terms unless relevant
        findings.push({
          file: file.replace(/\\/g, '/'),
          line: idx + 1,
          term,
          snippet: line.trim().slice(0, 120)
        });
      }
    });
  });
});

console.log(`Total raw matches: ${findings.length}\n`);

// Group by term
searchTerms.forEach(term => {
  const matches = findings.filter(f => f.term.toLowerCase() === term.toLowerCase());
  console.log(`=== Term: "${term}" (${matches.length} matches) ===`);
  matches.slice(0, 15).forEach(m => {
    console.log(`  ${m.file}:${m.line} | ${m.snippet}`);
  });
  if (matches.length > 15) {
    console.log(`  ... and ${matches.length - 15} more matches`);
  }
  console.log('');
});
