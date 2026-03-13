/**
 * Audit for duplicate titles and meta descriptions across all HTML pages.
 * Run: node scripts/audit-meta-duplicates.js
 */
const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findHtmlFiles(full, files);
    } else if (e.name.endsWith('.html') && e.name !== '404.html') {
      files.push(path.relative(process.cwd(), full).replace(/\\/g, '/'));
    }
  }
  return files;
}

function extractMeta(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() || null;
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/)?.[1]?.trim() || null;
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] || null;
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"\s*\/?>/)?.[1] || null;
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"\s*\/?>/)?.[1] || null;
  const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"\s*\/?>/)?.[1] || null;
  const ogType = html.match(/<meta\s+property="og:type"\s+content="([^"]*)"\s*\/?>/)?.[1] || null;
  return { title, desc, canonical, ogTitle, ogDesc, ogUrl, ogType };
}

const files = findHtmlFiles(process.cwd());
const byTitle = new Map();
const byDesc = new Map();
const issues = [];

for (const f of files) {
  const m = extractMeta(f);
  if (!m.title) issues.push({ file: f, issue: 'missing title' });
  if (!m.desc) issues.push({ file: f, issue: 'missing meta description' });
  if (!m.canonical) issues.push({ file: f, issue: 'missing canonical' });
  if (!m.ogTitle) issues.push({ file: f, issue: 'missing og:title' });
  if (!m.ogDesc) issues.push({ file: f, issue: 'missing og:description' });
  if (!m.ogUrl) issues.push({ file: f, issue: 'missing og:url' });
  if (!m.ogType) issues.push({ file: f, issue: 'missing og:type' });

  const titleKey = (m.title || '').toLowerCase().trim();
  if (titleKey) {
    if (!byTitle.has(titleKey)) byTitle.set(titleKey, []);
    byTitle.get(titleKey).push({ file: f, title: m.title });
  }
  const descKey = (m.desc || '').toLowerCase().trim();
  if (descKey) {
    if (!byDesc.has(descKey)) byDesc.set(descKey, []);
    byDesc.get(descKey).push({ file: f, desc: m.desc });
  }
}

const dupTitles = [...byTitle.entries()].filter(([, v]) => v.length > 1);
const dupDescs = [...byDesc.entries()].filter(([, v]) => v.length > 1);

console.log('=== DUPLICATE TITLES ===');
dupTitles.forEach(([key, arr]) => {
  console.log(`"${arr[0].title}" (${arr.length} pages):`);
  arr.forEach(({ file }) => console.log('  -', file));
});

console.log('\n=== DUPLICATE META DESCRIPTIONS ===');
dupDescs.forEach(([key, arr]) => {
  console.log(`"${(arr[0].desc || '').slice(0, 80)}..." (${arr.length} pages):`);
  arr.forEach(({ file }) => console.log('  -', file));
});

console.log('\n=== MISSING TAGS ===');
issues.forEach(({ file, issue }) => console.log(`${file}: ${issue}`));

console.log('\n=== SUMMARY ===');
console.log(`Total pages: ${files.length}`);
console.log(`Duplicate titles: ${dupTitles.length} groups`);
console.log(`Duplicate descriptions: ${dupDescs.length} groups`);
console.log(`Pages with missing tags: ${new Set(issues.map(i => i.file)).size}`);
