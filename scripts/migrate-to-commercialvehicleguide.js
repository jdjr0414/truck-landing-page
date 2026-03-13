/**
 * Migrate site from axiantpartners.com/truckhub to commercialvehicleguide.com
 * Update outbound links with ref=commercialvehicleguide
 * Run: node scripts/migrate-to-commercialvehicleguide.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      walk(full, files);
    } else if (e.name.endsWith('.html') || e.name.endsWith('.xml') || e.name.endsWith('.js') || e.name.endsWith('.ps1') || e.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

let total = 0;
const files = walk(ROOT);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Site URLs: axiantpartners.com/truckhub -> commercialvehicleguide.com
  if (content.includes('axiantpartners.com/truckhub')) {
    content = content.replace(/https:\/\/axiantpartners\.com\/truckhub\//g, 'https://commercialvehicleguide.com/');
    content = content.replace(/https:\/\/axiantpartners\.com\/truckhub/g, 'https://commercialvehicleguide.com');
    changed = true;
  }

  // Outbound Axiant links: ref=commercialvehicleguide -> ref=commercialvehicleguide
  if (content.includes('axiantpartners.com/match') && content.includes('ref=commercialvehicleguide')) {
    content = content.replace(/ref=commercialvehicleguide/g, 'ref=commercialvehicleguide');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    total++;
    console.log(path.relative(ROOT, file));
  }
}

console.log(`\nUpdated ${total} files`);
