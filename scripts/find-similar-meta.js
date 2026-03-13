/**
 * Find pages with similar titles or meta descriptions.
 * Similarity: shared words, same structure, or near-identical text.
 */
const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findHtmlFiles(full, files);
    else if (e.name.endsWith('.html') && e.name !== '404.html') {
      files.push(path.relative(process.cwd(), full).replace(/\\/g, '/'));
    }
  }
  return files;
}

function extractMeta(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() || '';
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/)?.[1]?.trim() || '';
  return { title, desc };
}

function wordSet(str) {
  return new Set(str.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a, b) {
  const sa = wordSet(a);
  const sb = wordSet(b);
  const inter = [...sa].filter(x => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union ? inter / union : 0;
}

function normalizeForCompare(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}

const files = findHtmlFiles(process.cwd());
const meta = new Map();
for (const f of files) {
  meta.set(f, extractMeta(f));
}

const similarTitles = [];
const similarDescs = [];

for (let i = 0; i < files.length; i++) {
  for (let j = i + 1; j < files.length; j++) {
    const f1 = files[i];
    const f2 = files[j];
    const m1 = meta.get(f1);
    const m2 = meta.get(f2);

    const titleSim = jaccardSimilarity(m1.title, m2.title);
    if (titleSim >= 0.6 && m1.title !== m2.title) {
      similarTitles.push({ f1, f2, t1: m1.title, t2: m2.title, sim: titleSim });
    }

    const descSim = jaccardSimilarity(m1.desc, m2.desc);
    if (descSim >= 0.65 && m1.desc !== m2.desc) {
      similarDescs.push({ f1, f2, d1: m1.desc, d2: m2.desc, sim: descSim });
    }
  }
}

console.log('=== SIMILAR TITLES (Jaccard >= 0.6) ===');
similarTitles.sort((a, b) => b.sim - a.sim);
similarTitles.forEach(({ f1, f2, t1, t2, sim }) => {
  console.log(`\n[${(sim * 100).toFixed(0)}% similar]`);
  console.log(`  ${f1}\n    "${t1}"`);
  console.log(`  ${f2}\n    "${t2}"`);
});

console.log('\n\n=== SIMILAR META DESCRIPTIONS (Jaccard >= 0.65) ===');
similarDescs.sort((a, b) => b.sim - a.sim);
similarDescs.forEach(({ f1, f2, d1, d2, sim }) => {
  console.log(`\n[${(sim * 100).toFixed(0)}% similar]`);
  console.log(`  ${f1}\n    "${d1}"`);
  console.log(`  ${f2}\n    "${d2}"`);
});

console.log('\n\n=== SUMMARY ===');
console.log(`Similar title pairs: ${similarTitles.length}`);
console.log(`Similar description pairs: ${similarDescs.length}`);
