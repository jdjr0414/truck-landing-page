const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIN_WORDS = 900;
const EXCLUDE = new Set(['sitemap.html', '404.html']);

function countWords(html) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else if (file.endsWith('.html') && !EXCLUDE.has(file)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(ROOT);
const results = [];

for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  try {
    const content = fs.readFileSync(f, 'utf8');
    const words = countWords(content);
    results.push({ path: rel, words });
  } catch (e) {
    console.error('Error', rel, e.message);
  }
}

const short = results.filter(r => r.words < MIN_WORDS).sort((a, b) => a.words - b.words);

const sections = {
  index: [], vehicles: [], 'vehicle-index': [], 'business-guides': [],
  'equipment-costs': [], guides: [], industries: [], questions: [],
  data: [], glossary: [], comparisons: [], hubs: [], other: []
};

for (const r of short) {
  const first = r.path === 'index.html' ? 'index' : r.path.split('/')[0];
  const sec = sections[first] !== undefined ? first : 'other';
  sections[sec].push(r);
}

let report = `# Word Count Audit - Pages Under ${MIN_WORDS} Words\n\n## Summary\n- Total short pages: ${short.length}\n- Threshold: ${MIN_WORDS} words minimum\n\n## By Section\n`;

for (const sec of ['index', 'vehicles', 'vehicle-index', 'business-guides', 'equipment-costs', 'guides', 'industries', 'questions', 'data', 'glossary', 'comparisons', 'hubs', 'other']) {
  const items = sections[sec];
  if (!items.length) continue;
  report += `\n### ${sec} (${items.length} pages)\n`;
  for (const i of items.sort((a, b) => a.words - b.words)) {
    report += `- ${i.path} (${i.words} words)\n`;
  }
}

const outPath = path.join(ROOT, 'word-count-audit-report.md');
fs.writeFileSync(outPath, report, 'utf8');
console.log('Report saved to:', outPath);
console.log('Short pages:', short.length);
