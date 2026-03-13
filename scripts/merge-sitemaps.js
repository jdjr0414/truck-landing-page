const fs = require('fs');
const files = ['sitemap-pages.xml','sitemap-vehicles.xml','sitemap-industries.xml','sitemap-guides.xml','sitemap-business-guides.xml','sitemap-costs.xml','sitemap-data.xml','sitemap-glossary.xml'];
const seen = new Set();
let urls = [];
for (const f of files) {
  const xml = fs.readFileSync(f, 'utf8');
  const matches = xml.matchAll(/<url>([\s\S]*?)<\/url>/g);
  for (const m of matches) {
    const block = m[0];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (loc && !seen.has(loc)) { seen.add(loc); urls.push(block); }
  }
}
const out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => '  ' + u).join('\n') + '\n</urlset>';
fs.writeFileSync('sitemap.xml', out);
console.log('Merged', urls.length, 'URLs into sitemap.xml');
