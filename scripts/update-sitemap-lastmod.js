/**
 * Updates all XML sitemaps with lastmod from each page's meta last-modified or file mtime.
 * Run: node scripts/update-sitemap-lastmod.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://commercialvehicleguide.com/';
const SITEMAP_DIR = process.cwd();

function getLastModFromUrl(loc) {
  const match = loc.match(/truckhub\/(.*)$/);
  if (!match) return null;
  let filePath = match[1];
  if (!filePath || filePath === '') filePath = 'index.html';
  if (!filePath.endsWith('.html')) filePath += '/index.html';

  const fullPath = path.join(SITEMAP_DIR, filePath);
  if (!fs.existsSync(fullPath)) return null;

  try {
    const html = fs.readFileSync(fullPath, 'utf8');
    const meta = html.match(/<meta\s+name="last-modified"\s+content="([^"]+)"\s*\/?>/);
    if (meta && meta[1]) {
      const d = meta[1].trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split('T')[0].split(' ')[0];
    }
  } catch (_) {}

  const stat = fs.statSync(fullPath);
  return stat.mtime.toISOString().split('T')[0];
}

function processSitemap(sitemapPath) {
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const urlRegex = /<url>(.*?)<\/url>/gs;
  let updated = 0;

  xml = xml.replace(urlRegex, (match) => {
    const locMatch = match.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) return match;

    const loc = locMatch[1];
    const lastmod = getLastModFromUrl(loc);
    if (!lastmod) return match;

    let newUrl = match;
    if (match.includes('<lastmod>')) {
      newUrl = match.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${lastmod}</lastmod>`);
    } else {
      newUrl = match.replace('</loc>', `</loc><lastmod>${lastmod}</lastmod>`);
    }
    updated++;
    return newUrl;
  });

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  return updated;
}

const sitemaps = [
  'sitemap-pages.xml',
  'sitemap-vehicles.xml',
  'sitemap-industries.xml',
  'sitemap-guides.xml',
  'sitemap-business-guides.xml',
  'sitemap-costs.xml',
  'sitemap-data.xml',
  'sitemap-glossary.xml',
];

let total = 0;
for (const name of sitemaps) {
  const p = path.join(SITEMAP_DIR, name);
  if (fs.existsSync(p)) {
    const n = processSitemap(p);
    total += n;
    console.log(`${name}: ${n} URLs updated`);
  }
}
console.log(`Total: ${total} URLs with lastmod`);
