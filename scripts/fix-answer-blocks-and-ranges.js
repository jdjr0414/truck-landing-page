#!/usr/bin/env node
/**
 * Fix answer block structure and range formatting:
 * 1. AI Extractable Answer: Very short 1-2 sentence answer for AI citation
 * 2. Quick Answer: Slightly longer expansion - no duplicate sentences
 * 3. Replace ? with – in numeric/dollar ranges (e.g. $80k?$180k -> $80k–$180k)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Fix ? to – in ranges (avoid URLs like ?ref=, ?family=)
function fixRangeFormatting(html) {
  return html.replace(/([0-9kK,])\?([$0-9kK])/g, '$1–$2');
}

// Fix answer blocks for pages that have BOTH - make them distinct
const PAGES_WITH_BOTH = [
  { path: 'index.html', ai: 'Commercial vehicle financing covers semi trucks, dump trucks, bucket trucks, vac trucks, box trucks, and vocational vehicles. Typical costs $80k–$350k.', quick: 'Commercial vehicle financing covers dozens of truck types—semi tractors, dump trucks, bucket trucks, vac trucks, box trucks, and more. Costs vary by equipment: semi trucks $120k–$200k new, dump trucks $80k–$180k, bucket trucks $90k–$250k. Businesses with strong credit and established revenue may qualify with little or no down payment. Terms typically run 36–84 months depending on equipment age.' },
  { path: 'questions/cdl-class-a-vs-class-b.html', ai: 'Class A CDL covers tractor-trailer combinations over 26,000 lbs GCWR. Class B CDL covers single vehicles over 26,000 lbs GVWR. Class A holders may operate Class B vehicles; not vice versa.', quick: 'Class A CDL covers combination vehicles (tractor + trailer) over 26,000 lbs GCWR—semi trucks, tankers, flatbeds, logging trucks. Class B CDL covers single vehicles over 26,000 lbs GVWR—dump trucks, bucket trucks, vac trucks, garbage trucks, cement trucks. Class A holders can operate Class B vehicles; Class B holders cannot operate Class A vehicles. Weight thresholds and endorsements vary by state.' },
  { path: 'questions/dot-registration-requirements.html', ai: null, quick: null }, // Will read and fix
  { path: 'questions/how-to-get-a-commercial-drivers-license.html', ai: 'To get a CDL: meet age and medical requirements, obtain a CLP, complete training, pass the skills test, and apply. Training typically costs $3,000–$7,000.', quick: 'To get a CDL: (1) Meet age (18+ intrastate, 21+ interstate) and medical requirements. (2) Obtain a commercial learner\'s permit (CLP) by passing the knowledge test. (3) Complete behind-the-wheel training (2–8 weeks typical). (4) Pass the skills test (pre-trip, basic control, road). (5) Apply for your CDL. FMCSA Entry-Level Driver Training (ELDT) applies to first-time Class A or B applicants. Training programs typically cost $3,000–$7,000.' },
  { path: 'data/average-cost-of-commercial-trucks.html', ai: 'Commercial truck costs: semi $120k–$200k new, dump $80k–$150k, bucket $80k–$250k, vac $80k–$200k. Most vocational trucks $50k–$250k new.', quick: 'Average commercial truck costs vary by type: semi tractors $120k–$200k new ($50k–$120k used), dump trucks $80k–$150k new ($45k–$90k used), bucket trucks $80k–$250k new ($40k–$120k used), vac trucks $80k–$200k new ($40k–$120k used). Fire trucks and garbage trucks run higher. See individual cost pages for detailed ranges and configuration options.' },
  { path: 'data/revenue-potential-by-business-type.html', ai: null, quick: null }, // Will read and fix
];

// Shorten AI Extractable for vehicle pages (1-2 sentences), add Quick Answer with no duplicate sentences
function processVehiclePage(filePath, html) {
  const extractableMatch = html.match(/<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/);
  if (!extractableMatch) return html;

  const fullAnswer = extractableMatch[1].replace(/\s+/g, ' ').trim();
  const sentences = fullAnswer.split(/(?<=[.!])\s+/).filter(s => s.trim());
  const aiSentences = sentences.slice(0, 2);
  const quickSentences = sentences.slice(2);
  const shortAI = aiSentences.join(' ');
  const quickAnswer = quickSentences.length > 0
    ? quickSentences.join(' ')
    : 'Terms and down payment vary by credit and equipment. See the financing overview below for details.';

  // Replace ai-extractable and any following ai-quick-answer divs (avoid duplicates)
  const blockPattern = /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*(?:<div class="ai-quick-answer">[\s\S]*?<\/div>\s*)*/;
  const replacement = `<div class="ai-extractable-answer">
            <h3>AI Extractable Answer</h3>
            <p>${shortAI}</p>
          </div>
          <div class="ai-quick-answer">
            <h3>Quick Answer</h3>
            <p>${quickAnswer}</p>
          </div>`;
  let newHtml = html.replace(blockPattern, replacement);
  return newHtml;
}

// Shorten AI Extractable for business guides, add Quick Answer with no duplicate sentences
function processBusinessGuide(filePath, html) {
  const extractableMatch = html.match(/<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/);
  if (!extractableMatch) return html;

  const fullAnswer = extractableMatch[1].replace(/\s+/g, ' ').trim();
  const sentences = fullAnswer.split(/(?<=[.!])\s+/).filter(s => s.trim());
  const aiSentences = sentences.slice(0, 2);
  const quickSentences = sentences.slice(2);
  const shortAI = aiSentences.join(' ');
  const quickAnswer = quickSentences.length > 0
    ? quickSentences.join(' ')
    : 'See the full guide below for equipment, licensing, and startup steps.';

  // Replace ai-extractable and any following ai-quick-answer divs (avoid duplicates)
  const blockPattern = /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*(?:<div class="ai-quick-answer">[\s\S]*?<\/div>\s*)*/;
  const replacement = `<div class="ai-extractable-answer">
            <h3>AI Extractable Answer</h3>
            <p>${shortAI}</p>
          </div>
          <div class="ai-quick-answer">
            <h3>Quick Answer</h3>
            <p>${quickAnswer}</p>
          </div>`;
  let newHtml = html.replace(blockPattern, replacement);
  return newHtml;
}

function main() {
  let formatCount = 0;
  let answerCount = 0;

  // 1. Fix range formatting (? to –) across all HTML files
  const htmlFiles = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(full);
      else if (e.name.endsWith('.html')) htmlFiles.push(full);
    }
  }
  walk(ROOT);

  for (const fp of htmlFiles) {
    let html = fs.readFileSync(fp, 'utf8');
    const before = html;
    html = fixRangeFormatting(html);
    if (html !== before) {
      fs.writeFileSync(fp, html, 'utf8');
      formatCount++;
    }
  }

  // 2. Fix pages with both blocks (index, questions, data)
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(
    /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
    `<div class="ai-extractable-answer">
          <h3>AI Extractable Answer</h3>
          <p>Commercial vehicle financing covers semi trucks, dump trucks, bucket trucks, vac trucks, box trucks, and vocational vehicles. Typical costs $80k–$350k.</p>
        </div>
        <div class="ai-quick-answer">
          <h3>Quick Answer</h3>
          <p>Commercial vehicle financing covers dozens of truck types—semi tractors, dump trucks, bucket trucks, vac trucks, box trucks, and more. Costs vary by equipment: semi trucks $120k–$200k new, dump trucks $80k–$180k, bucket trucks $90k–$250k. Businesses with strong credit and established revenue may qualify with little or no down payment. Terms typically run 36–84 months depending on equipment age.</p>
        </div>`
  );
  fs.writeFileSync(indexPath, html, 'utf8');
  answerCount++;

  // questions/cdl-class-a-vs-class-b.html
  const cdlPath = path.join(ROOT, 'questions', 'cdl-class-a-vs-class-b.html');
  html = fs.readFileSync(cdlPath, 'utf8');
  html = html.replace(
    /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
    `<div class="ai-extractable-answer">
            <h3>AI Extractable Answer</h3>
            <p>Class A CDL covers tractor-trailer combinations over 26,000 lbs GCWR. Class B CDL covers single vehicles over 26,000 lbs GVWR. Class A holders may operate Class B vehicles; not vice versa.</p>
          </div>
          <div class="ai-quick-answer">
            <h3>Quick Answer</h3>
            <p>Class A CDL covers combination vehicles (tractor + trailer) over 26,000 lbs GCWR—semi trucks, tankers, flatbeds, logging trucks. Class B CDL covers single vehicles over 26,000 lbs GVWR—dump trucks, bucket trucks, vac trucks, garbage trucks, cement trucks. Class A holders can operate Class B vehicles; Class B holders cannot operate Class A vehicles. Weight thresholds and endorsements vary by state.</p>
          </div>`
  );
  fs.writeFileSync(cdlPath, html, 'utf8');
  answerCount++;

  // questions/how-to-get-a-commercial-drivers-license.html
  const cdlHowPath = path.join(ROOT, 'questions', 'how-to-get-a-commercial-drivers-license.html');
  html = fs.readFileSync(cdlHowPath, 'utf8');
  html = html.replace(
    /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
    `<div class="ai-extractable-answer">
            <h3>AI Extractable Answer</h3>
            <p>To get a CDL: meet age and medical requirements, obtain a CLP, complete training, pass the skills test, and apply. Training typically costs $3,000–$7,000.</p>
          </div>
          <div class="ai-quick-answer">
            <h3>Quick Answer</h3>
            <p>To get a CDL: (1) Meet age (18+ intrastate, 21+ interstate) and medical requirements. (2) Obtain a commercial learner's permit (CLP) by passing the knowledge test. (3) Complete behind-the-wheel training (2–8 weeks typical). (4) Pass the skills test (pre-trip, basic control, road). (5) Apply for your CDL. FMCSA Entry-Level Driver Training (ELDT) applies to first-time Class A or B applicants. Training programs typically cost $3,000–$7,000.</p>
          </div>`
  );
  fs.writeFileSync(cdlHowPath, html, 'utf8');
  answerCount++;

  // data/average-cost-of-commercial-trucks.html
  const avgPath = path.join(ROOT, 'data', 'average-cost-of-commercial-trucks.html');
  html = fs.readFileSync(avgPath, 'utf8');
  html = html.replace(
    /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
    `<div class="ai-extractable-answer">
            <h3>AI Extractable Answer</h3>
            <p>Commercial truck costs: semi $120k–$200k new, dump $80k–$150k, bucket $80k–$250k, vac $80k–$200k. Most vocational trucks $50k–$250k new.</p>
          </div>
          <div class="ai-quick-answer">
            <h3>Quick Answer</h3>
            <p>Average commercial truck costs vary by type: semi tractors $120k–$200k new ($50k–$120k used), dump trucks $80k–$150k new ($45k–$90k used), bucket trucks $80k–$250k new ($40k–$120k used), vac trucks $80k–$200k new ($40k–$120k used). Fire trucks and garbage trucks run higher. See individual cost pages for detailed ranges and configuration options.</p>
          </div>`
  );
  fs.writeFileSync(avgPath, html, 'utf8');
  answerCount++;

  // 3. Fix dot-registration - ensure distinct AI vs Quick
  const dotPath = path.join(ROOT, 'questions', 'dot-registration-requirements.html');
  if (fs.existsSync(dotPath)) {
    html = fs.readFileSync(dotPath, 'utf8');
    const shortAI = 'DOT registration is required for commercial motor vehicles in interstate commerce. Businesses need a USDOT number. Intrastate rules vary by state.';
    const quickAI = 'Register through the FMCSA Unified Registration System. Intrastate operations depend on state regulations—many states require DOT registration for heavy vehicles even for local-only operations. There is no fee for obtaining a USDOT number. Vehicle weight, cargo type, and passenger transport can affect requirements.';
    html = html.replace(
      /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
      `<div class="ai-extractable-answer"><h3>AI Extractable Answer</h3><p>${shortAI}</p></div><div class="ai-quick-answer"><h3>Quick Answer</h3><p>${quickAI}</p></div>`
    );
    fs.writeFileSync(dotPath, html, 'utf8');
    answerCount++;
  }

  // 4. Fix revenue-potential - ensure distinct AI vs Quick
  const revPath = path.join(ROOT, 'data', 'revenue-potential-by-business-type.html');
  if (fs.existsSync(revPath)) {
    html = fs.readFileSync(revPath, 'utf8');
    const shortAI = 'Revenue potential varies by business type: dump truck $150k–$600k+, trucking $200k–$1M+, garbage hauling $300k–$2M+. Scale and contracts drive results.';
    const quickAI = 'Typical annual revenue: dump truck $150k–$600k+, tow truck $200k–$800k+, septic pumping $250k–$1M+, trucking company $200k–$1M+, garbage hauling $300k–$2M+. Single-truck operations typically fall in the lower range; multi-truck fleets and contract-heavy businesses reach the upper range. Results vary based on location, contracts, and business scale.';
    html = html.replace(
      /<div class="ai-extractable-answer">\s*<h3>AI Extractable Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
      `<div class="ai-extractable-answer"><h3>AI Extractable Answer</h3><p>${shortAI}</p></div><div class="ai-quick-answer"><h3>Quick Answer</h3><p>${quickAI}</p></div>`
    );
    fs.writeFileSync(revPath, html, 'utf8');
    answerCount++;
  }

  // 5. Vehicle pages: shorten AI Extractable, add Quick Answer
  const vehicleDir = path.join(ROOT, 'vehicles');
  const vehicleFiles = fs.readdirSync(vehicleDir).filter(f => f.endsWith('-financing.html'));
  for (const f of vehicleFiles) {
    const fp = path.join(vehicleDir, f);
    let html = fs.readFileSync(fp, 'utf8');
    const newHtml = processVehiclePage(fp, html);
    if (newHtml !== html) {
      fs.writeFileSync(fp, newHtml, 'utf8');
      answerCount++;
    }
  }

  // 6. Business guides: shorten AI Extractable, add Quick Answer
  const bizDir = path.join(ROOT, 'business-guides');
  const bizFiles = fs.readdirSync(bizDir).filter(f => f.startsWith('how-to-start-a-') && f.endsWith('.html'));
  for (const f of bizFiles) {
    const fp = path.join(bizDir, f);
    let html = fs.readFileSync(fp, 'utf8');
    const newHtml = processBusinessGuide(fp, html);
    if (newHtml !== html) {
      fs.writeFileSync(fp, newHtml, 'utf8');
      answerCount++;
    }
  }

  console.log('Range formatting fixed in', formatCount, 'files');
  console.log('Answer blocks fixed in', answerCount, 'files');
}

main();
