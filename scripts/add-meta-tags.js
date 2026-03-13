/**
 * Adds canonical and Open Graph meta tags to all HTML pages.
 * Run: node scripts/add-meta-tags.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://axiantpartners.com/truckhub/';
const EXCLUDE = new Set(['404.html']);

function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findHtmlFiles(full, files);
    } else if (e.name.endsWith('.html') && !EXCLUDE.has(e.name)) {
      files.push(path.relative(process.cwd(), full).replace(/\\/g, '/'));
    }
  }
  return files;
}

function addMetaTags(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('rel="canonical"') || html.includes('property="og:title"')) {
    return { updated: false, reason: 'already has tags' };
  }

  const canonicalUrl = filePath === 'index.html'
    ? BASE
    : BASE + filePath;

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/);
  if (!titleMatch || !descMatch) {
    return { updated: false, reason: 'missing title or description' };
  }

  const title = titleMatch[1];
  const description = descMatch[1];

  const tags = `  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="website" />
`;

  const insertAfter = descMatch[0];
  const insertPos = html.indexOf(insertAfter) + insertAfter.length;
  const before = html.slice(0, insertPos);
  const after = html.slice(insertPos);
  html = before + '\n' + tags + after;

  fs.writeFileSync(filePath, html, 'utf8');
  return { updated: true };
}

const root = process.cwd();
const files = findHtmlFiles(root);
let updated = 0;
let skipped = 0;

for (const f of files) {
  const result = addMetaTags(f);
  if (result.updated) updated++;
  else skipped++;
}

console.log(`Updated: ${updated}, Skipped: ${skipped}, Total: ${files.length}`);
