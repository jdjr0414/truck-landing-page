/**
 * Fix logo and favicon paths to use relative URLs.
 * Run: node scripts/fix-logo-paths.js
 */
const fs = require('fs');
const path = require('path');

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

let count = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, path.dirname(file));
  const depth = rel === '' ? 0 : rel.split(path.sep).length;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  const logoPath = prefix + 'assets/logo-multi-vehicles.png';

  let content = fs.readFileSync(file, 'utf8');
  const before = content;
  content = content.replace(/href="\/assets\/logo-multi-vehicles\.png"/g, `href="${logoPath}"`);
  content = content.replace(/src="\/assets\/logo-multi-vehicles\.png"/g, `src="${logoPath}"`);
  if (content !== before) {
    fs.writeFileSync(file, content);
    count++;
  }
}
console.log('Fixed paths in', count, 'files');
