#!/usr/bin/env node
/**
 * Update all HTML headers to simplified nav (less is more).
 * Nav: Vehicles, Industries, Costs, Licensing, Startup Guides + Explore Financing Options
 * Comparisons and Glossary moved to footer / related topics.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function getAllHtmlFiles() {
  const files = [];
  function walk(dir, base = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const rel = base ? `${base}/${e.name}` : e.name;
        const full = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(full, rel);
        } else if (e.name.endsWith('.html')) {
          files.push({ full, rel });
        }
      }
    } catch (err) {}
  }
  walk(ROOT);
  return files;
}

function getBasePath(relPath) {
  const dir = path.dirname(relPath);
  if (dir === '.') return '';
  const depth = dir.split(path.sep).length;
  return '../'.repeat(depth);
}

function getHeaderHtml(base) {
  const idx = base ? `${base}index.html` : 'index.html';
  return `<header class="site-header">
    <div class="container nav">
      <a href="${idx}" class="brand">Commercial Vehicle Guide</a>
      <nav>
        <a href="${idx}#vehicles">Vehicles</a>
        <a href="${idx}#industries">Industries</a>
        <a href="${idx}#equipment-costs">Costs</a>
        <a href="${idx}#questions">Licensing</a>
        <a href="${idx}#business-guides">Startup Guides</a>
        <a href="https://axiantpartners.com/match?ref=commercialvehicleguide" class="btn btn-sm" target="_blank" rel="noopener">Explore Financing Options</a>
      </nav>
    </div>
  </header>`;
}

// Hero variant mapping for vehicle pages
const HERO_VARIANTS = {
  'dump-truck': 'hero-dump',
  'semi-truck': 'hero',
  'bucket-truck': 'hero-bucket',
  'vac-truck': 'hero-vac',
  'tow-truck': 'hero-tow',
  'vacuum-excavator': 'hero-vac',
  'septic-vac': 'hero-vac',
  'hydro-excavation': 'hero-vac',
  'garbage-truck': 'hero-municipal',
  'street-sweeper': 'hero-municipal',
  'fire-truck': 'hero-municipal',
  'snow-plow': 'hero-municipal',
  'airport-ground-service': 'hero-municipal',
  'airport-fire': 'hero-municipal',
  'rail-maintenance': 'hero',
  'agriculture': 'hero-ag',
  'agricultural': 'hero-ag',
};

function getHeroVariant(relPath) {
  const name = relPath.replace(/\.html$/, '').toLowerCase();
  for (const [key, variant] of Object.entries(HERO_VARIANTS)) {
    if (name.includes(key)) return variant;
  }
  return null;
}

let count = 0;
for (const { full, rel } of getAllHtmlFiles()) {
  if (rel === 'index.html') continue; // already updated
  let html = fs.readFileSync(full, 'utf8');
  const original = html;
  const base = getBasePath(rel);

  // Replace header - match various existing header patterns
  const headerRegex = /<header class="site-header">[\s\S]*?<\/header>/;
  const newHeader = getHeaderHtml(base);
  if (headerRegex.test(html)) {
    html = html.replace(headerRegex, newHeader);
  }

  // Update footer on internal pages: add Glossary, Comparisons (moved from nav)
  if (rel !== 'index.html') {
    const idx = base ? `${base}index.html` : 'index.html';
    const gloss = base ? `${base}glossary/` : 'glossary/';
    const newFooter = `<footer class="site-footer">
    <div class="container footer-row">
      <p>© 2026 Commercial Vehicle Guide.</p>
      <div class="footer-links">
        <a href="${idx}">Home</a>
        <a href="${idx}#vehicles">Vehicles</a>
        <a href="${idx}#industries">Industries</a>
        <a href="${idx}#equipment-costs">Costs</a>
        <a href="${gloss}">Glossary</a>
        <a href="${idx}#comparisons">Comparisons</a>
        <a href="https://axiantpartners.com/match?ref=commercialvehicleguide" target="_blank" rel="noopener">Explore Financing Options</a>
      </div>
    </div>
  </footer>`;
    const footerRegex = /<footer class="site-footer">[\s\S]*?<\/footer>/;
    if (footerRegex.test(html)) {
      html = html.replace(footerRegex, newFooter);
    }
  }

  // Add hero variant to vehicle, equipment-costs, and business-guides pages
  const heroVariant = getHeroVariant(rel);
  const inRelevantSection = rel.startsWith('vehicles/') || rel.startsWith('equipment-costs/') || rel.startsWith('business-guides/');
  if (heroVariant && inRelevantSection && html.includes('class="hero compact"') && !html.includes(heroVariant)) {
    html = html.replace('class="hero compact"', `class="hero compact ${heroVariant}"`);
  }

  if (html !== original) {
    fs.writeFileSync(full, html, 'utf8');
    count++;
  }
}
console.log('Updated', count, 'files');
