/**
 * Adds "Last Updated: March 2026" to HTML pages that don't have it.
 * Run: node scripts/add-last-updated.js
 */

const fs = require('fs');
const path = require('path');

const LAST_UPDATED = '<p class="last-updated">Last Updated: March 2026</p>';
const LAST_MODIFIED_META = '<meta name="last-modified" content="2026-03-12" />';

function getAllHtmlFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      getAllHtmlFiles(fullPath, files);
    } else if (item.isFile() && item.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function processFile(filepath) {
  let html = fs.readFileSync(filepath, 'utf8');
  let modified = false;

  // Add last-modified meta if missing
  if (!html.includes('last-modified')) {
    html = html.replace(
      /(<meta name="viewport"[^>]*\/>)/,
      `$1\n  ${LAST_MODIFIED_META}`
    );
    modified = true;
  }

  // Add last-updated line if missing - after eyebrow, before h1
  if (!html.includes('class="last-updated"')) {
    const eyebrowH1Pattern = /(<p class="eyebrow">[^<]*<\/p>)\s*(<h1)/;
    if (eyebrowH1Pattern.test(html)) {
      html = html.replace(
        eyebrowH1Pattern,
        `$1\n        ${LAST_UPDATED}\n        $2`
      );
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filepath, html);
    return true;
  }
  return false;
}

const root = path.join(__dirname, '..');
const htmlFiles = getAllHtmlFiles(root);
let updated = 0;

for (const file of htmlFiles) {
  if (processFile(file)) {
    updated++;
    console.log('Updated:', path.relative(root, file));
  }
}

console.log(`\nDone. Updated ${updated} of ${htmlFiles.length} HTML files.`);
