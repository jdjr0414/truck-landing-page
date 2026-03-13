/**
 * Adds mobile-nav.js script tag to all HTML files.
 * Run: node scripts/add-mobile-nav-script.js
 */
const fs = require('fs');
const path = require('path');

const SCRIPT_TAG = '  <script src="/scripts/mobile-nav.js" defer></script>\n';
const ROOT = path.join(__dirname, '..');

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      walk(full, files);
    } else if (e.isFile() && e.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const htmlFiles = walk(ROOT);
let updated = 0;

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('mobile-nav.js')) continue;
  if (!content.includes('</body>')) continue;
  content = content.replace('</body>', SCRIPT_TAG + '</body>');
  fs.writeFileSync(file, content);
  updated++;
}

console.log('Added mobile-nav.js to', updated, 'HTML files');
