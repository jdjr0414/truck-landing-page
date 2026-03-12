/**
 * Updates existing vehicle pages with Industry-specific section, DOT table format, and operator training FAQ.
 * Run: node scripts/update-licensing-sections.js
 */

const fs = require('fs');
const path = require('path');

const VEHICLES_DIR = path.join(__dirname, '..', 'vehicles');

const OLD_DOT_TABLE = `<thead><tr><th>Business Type</th><th>DOT Number Required?</th></tr></thead>
            <tbody>
              <tr><td>Interstate trucking company</td><td>Yes</td></tr>
              <tr><td>Local contractor with heavy truck</td><td>Often required depending on use</td></tr>
              <tr><td>Delivery business with smaller trucks</td><td>Sometimes required</td></tr>
              <tr><td>Intrastate operations</td><td>Depends on state regulations</td></tr>
            </tbody>`;

const NEW_DOT_TABLE = `<thead><tr><th>Operation Type</th><th>DOT Registration Needed</th></tr></thead>
            <tbody>
              <tr><td>Interstate trucking operations</td><td>Yes</td></tr>
              <tr><td>Local trucking with heavy vehicles</td><td>Often required</td></tr>
              <tr><td>Construction companies operating heavy trucks</td><td>Often required</td></tr>
              <tr><td>Delivery businesses operating small trucks</td><td>Depends on weight and state regulations</td></tr>
            </tbody>`;

const INDUSTRY_SECTION = `
          <h3>Industry-Specific Regulatory Requirements</h3>
          <p>Some equipment types have specialized regulators. Requirements vary by vehicle type and industry.</p>
          <table class="data-table">
            <thead><tr><th>Equipment</th><th>Typical Regulator</th></tr></thead>
            <tbody>
              <tr><td>Crane trucks</td><td>NCCCO certification often required</td></tr>
              <tr><td>Utility bucket trucks</td><td>OSHA safety standards</td></tr>
              <tr><td>Vac trucks for environmental work</td><td>Environmental safety regulations</td></tr>
              <tr><td>Rail maintenance trucks</td><td>Railroad regulatory compliance</td></tr>
            </tbody>
          </table>

          `;

function processFile(filename) {
  const filepath = path.join(VEHICLES_DIR, filename);
  let html = fs.readFileSync(filepath, 'utf8');

  let updated = false;

  // 1. Update DOT table if old format exists
  if (html.includes('Business Type</th><th>DOT Number Required?')) {
    html = html.replace(OLD_DOT_TABLE, NEW_DOT_TABLE);
    updated = true;
  }

  // 2. Add Industry-specific section if not present (before Weight-Based)
  if (!html.includes('Industry-Specific Regulatory Requirements') && html.includes('Weight-Based Licensing Thresholds')) {
    html = html.replace(
      /(\s+)<h3>Weight-Based Licensing Thresholds<\/h3>/,
      INDUSTRY_SECTION + '$1<h3>Weight-Based Licensing Thresholds</h3>'
    );
    updated = true;
  }

  // 3. Add "Do operators need special training?" FAQ if not present
  // Find the vehicle name from the first licensing FAQ
  const vehicleMatch = html.match(/Do you need a CDL to drive a ([^?]+)\?/);
  const vehicleName = vehicleMatch ? vehicleMatch[1] : 'this vehicle';
  const trainingFaq = `<div class="faq-item"><h3>Do operators need special training for ${vehicleName}?</h3><p>CDL training is required. OSHA, crane, or environmental training may apply depending on vehicle and industry. Employer-specific certifications are often expected.</p></div>
          `;
  if (!html.includes('Do operators need special training')) {
    html = html.replace(
      /(<div class="faq-item"><h3>What class CDL)/,
      trainingFaq + '$1'
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filepath, html);
    console.log('Updated:', filename);
  }
}

const files = fs.readdirSync(VEHICLES_DIR).filter(f => f.endsWith('.html'));
files.forEach(processFile);
console.log('Done.');
