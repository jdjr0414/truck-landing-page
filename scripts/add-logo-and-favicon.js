/**
 * Adds logo to header and favicon to all HTML files.
 * Run: node scripts/add-logo-and-favicon.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FAVICON = '  <link rel="icon" href="/assets/logo-multi-vehicles.png" type="image/png">\n';
const BRAND_INDEX = '<a href="index.html" class="brand"><img src="assets/logo-multi-vehicles.png" alt="Commercial Vehicle Guide" class="brand-logo" onerror="this.style.display=\'none\';this.nextElementSibling.classList.add(\'brand-text-visible\')"><span class="brand-text">Commercial Vehicle Guide</span></a>';
const BRAND_PARENT = '<a href="../index.html" class="brand"><img src="../assets/logo-multi-vehicles.png" alt="Commercial Vehicle Guide" class="brand-logo" onerror="this.style.display=\'none\';this.nextElementSibling.classList.add(\'brand-text-visible\')"><span class="brand-text">Commercial Vehicle Guide</span></a>';

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

let faviconCount = 0;
let brandCount = 0;

for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!content.includes('logo-multi-vehicles.png')) {
    if (!content.includes('rel="icon"')) {
      content = content.replace('  <link rel="stylesheet"', FAVICON + '  <link rel="stylesheet"');
      faviconCount++;
      changed = true;
    }
  }

  if (content.includes('class="brand">Commercial Vehicle Guide</a>')) {
    const before = content;
    content = content.replace(
      '<a href="index.html" class="brand">Commercial Vehicle Guide</a>',
      BRAND_INDEX
    );
    content = content.replace(
      '<a href="../index.html" class="brand">Commercial Vehicle Guide</a>',
      BRAND_PARENT
    );
    if (content !== before) {
      brandCount++;
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(file, content);
}

console.log('Added favicon to', faviconCount, 'files, logo to', brandCount, 'headers');
