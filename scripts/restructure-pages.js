#!/usr/bin/env node
/**
 * Restructure vehicle financing and business guide pages to match the standard template:
 * H1, Last Updated, AI Extractable, Definition, Key Facts, Equipment Data Snapshot,
 * Overview, Licensing, Financing Overview, Industry Uses, Startup Considerations,
 * Step-by-Step, Comparison Table, FAQ, Sources
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VEHICLES = path.join(ROOT, 'vehicles');
const BUSINESS_GUIDES = path.join(ROOT, 'business-guides');

// Sections to remove (duplicates / deprecated)
const REMOVE_PATTERNS = [
  // Quick Answer - deprecated, use AI Extractable only
  /<div class="ai-quick-answer">[\s\S]*?<\/div>\s*/gi,
  // Licensing Quick Answer - redundant
  /<div class="ai-quick-answer" style="[^"]*">[\s\S]*?<h3>Licensing Quick Answer<\/h3>[\s\S]*?<\/div>\s*/gi,
  // comparison-overview div (merge into Comparison Table)
  /<div class="comparison-overview">\s*<h3>Comparison Overview<\/h3>\s*/gi,
  /<\/div>\s*(?=\s*<h2>Compare to Other Vehicles)/gi,
];

// Quick Facts that duplicate Key Facts (vehicle pages)
const QUICK_FACTS_PATTERN = /<div class="quick-facts">\s*<h3>Quick Facts About [^<]+<\/h3>[\s\S]*?<\/div>\s*/gi;

function getVehicleFiles() {
  return fs.readdirSync(VEHICLES)
    .filter(f => f.endsWith('-financing.html'))
    .map(f => path.join(VEHICLES, f));
}

function getBusinessGuideFiles() {
  return fs.readdirSync(BUSINESS_GUIDES)
    .filter(f => f.startsWith('how-to-start-a-') && f.endsWith('.html'))
    .map(f => path.join(BUSINESS_GUIDES, f));
}

function processVehiclePage(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  // 1. Remove Licensing Quick Answer block only (redundant; main Quick Answer is kept)
  html = html.replace(/<div class="ai-quick-answer" style="[^"]*">\s*<h3>Licensing Quick Answer<\/h3>[\s\S]*?<\/div>\s*/gi, '');

  // 3. Remove Quick Facts that duplicate Key Facts (Quick Facts About X Financing)
  html = html.replace(/<div class="quick-facts">\s*<h3>Quick Facts About [^<]+ Financing<\/h3>[\s\S]*?<\/div>\s*/gi, '');

  // 4. Add "Typical time to financing decision" to Key Facts if missing
  if (html.includes('Key Facts About') && !html.includes('Typical time to financing decision')) {
    html = html.replace(
      /(<div class="key-facts">\s*<h3>Key Facts About [^<]+<\/h3>\s*<ul>\s*)(<li>)/,
      '$1<li>Typical time to financing decision: 24–72 hours</li>\n              $2'
    );
  }

  // 5. Remove entire comparison-overview div (duplicate of Comparison Table)
  html = html.replace(/<div class="comparison-overview">\s*<h3>Comparison Overview<\/h3>\s*<table class="data-table">[\s\S]*?<\/table>\s*<\/div>\s*/g, '');
  // 6. Rename "Compare to Other Vehicles" to "Comparison Table"
  html = html.replace(/<h2>Compare to Other Vehicles<\/h2>/g, '<h2>Comparison Table</h2>');

  // 7. Move step-by-step-overview to right before Comparison Table (if it's currently after equipment-data-snapshot)
  const stepMatch = html.match(/<div class="step-by-step-overview">[\s\S]*?<\/div>\s*/);
  if (stepMatch) {
    const stepBlock = stepMatch[0];
    // Remove from current position (after equipment-data-snapshot, before next section)
    html = html.replace(stepBlock, '');
    // Insert before Comparison Table h2 (with proper spacing)
    html = html.replace(/(\s*)<h2>Comparison Table<\/h2>/, '\n          ' + stepBlock + '\n          $&');
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    return true;
  }
  return false;
}

function processBusinessGuide(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  // 1. Keep Quick Answer (used with AI Extractable per page structure)

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    return true;
  }
  return false;
}

function main() {
  let vehicleCount = 0;
  let businessCount = 0;

  const vehicleFiles = getVehicleFiles();
  for (const fp of vehicleFiles) {
    if (fp.includes('dump-truck-financing')) continue; // Already done
    try {
      if (processVehiclePage(fp)) {
        const html = fs.readFileSync(fp, 'utf8');
        // Re-read and apply - processVehiclePage returns true if changed but we need to write
        let modified = html;
        modified = modified.replace(/<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>[\s\S]*?<\/div>\s*/gi, '');
        modified = modified.replace(/<div class="ai-quick-answer" style="[^"]*">\s*<h3>Licensing Quick Answer<\/h3>[\s\S]*?<\/div>\s*/gi, '');
        modified = modified.replace(/<div class="quick-facts">\s*<h3>Quick Facts About [^<]+ Financing<\/h3>[\s\S]*?<\/div>\s*/gi, '');
        if (modified.includes('Key Facts About') && !modified.includes('Typical time to financing decision')) {
          modified = modified.replace(
            /(<div class="key-facts">\s*<h3>Key Facts About [^<]+<\/h3>\s*<ul>\s*)(<li>)/,
            '$1<li>Typical time to financing decision: 24–72 hours</li>\n              $2'
          );
        }
        modified = modified.replace(/<div class="comparison-overview">\s*<h3>Comparison Overview<\/h3>\s*/g, '');
        modified = modified.replace(/<h2>Compare to Other Vehicles<\/h2>/g, '<h2>Comparison Table</h2>');
        // Remove orphan </div> from comparison-overview
        modified = modified.replace(/(<table class="data-table">\s*<thead><tr><th>Vehicle<\/th><th>Typical Cost<\/th><th>License Required<\/th><\/tr><\/thead>\s*<tbody>[\s\S]*?<\/tbody>\s*<\/table>)\s*<\/div>/g, '$1');
        fs.writeFileSync(fp, modified, 'utf8');
        vehicleCount++;
        console.log('Updated:', path.basename(fp));
      }
    } catch (e) {
      console.error('Error:', fp, e.message);
    }
  }

  const businessFiles = getBusinessGuideFiles();
  for (const fp of businessFiles) {
    try {
      if (processBusinessGuide(fp)) {
        businessCount++;
        console.log('Updated:', path.basename(fp));
      }
    } catch (e) {
      console.error('Error:', fp, e.message);
    }
  }

  console.log('\nDone. Vehicles:', vehicleCount, 'Business guides:', businessCount);
}

main();
