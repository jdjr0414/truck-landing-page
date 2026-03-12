/**
 * Adds licensing and regulatory sections to all vehicle financing pages.
 * Run: node scripts/add-licensing.js
 */

const fs = require('fs');
const path = require('path');

const VEHICLES_DIR = path.join(__dirname, '..', 'vehicles');

// Vehicle-specific licensing data
const VEHICLE_DATA = {
  'semi-truck': {
    name: 'Semi Truck',
    cdlRequired: 'Yes',
    weightClass: 'Class A CDL',
    additionalCerts: 'DOT registration required',
    quickAnswer: 'Semi trucks require a Class A CDL and DOT registration for interstate operations. Licensing rules vary by state, vehicle weight, and business activity.',
    noCdlAnswer: 'No. Semi trucks (tractors with trailers) require a Class A CDL. There is no exemption for operating a semi truck without a CDL.',
  },
  'dump-truck': {
    name: 'Dump Truck',
    cdlRequired: 'Usually Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'DOT registration for interstate operations',
    quickAnswer: 'Most dump trucks require a Class B CDL because they exceed 26,000 pounds gross vehicle weight. Businesses operating commercial vehicles across state lines may also need DOT registration.',
    noCdlAnswer: 'Most dump trucks exceed 26,000 pounds GVWR and require a Class B CDL. Smaller dump trucks under 26,000 lbs may not require a CDL in some states, but most commercial dump trucks used in construction exceed this threshold.',
  },
  'bucket-truck': {
    name: 'Bucket Truck',
    cdlRequired: 'Often Class B CDL depending on weight',
    weightClass: 'Utility operation',
    additionalCerts: 'OSHA safety training often required',
    quickAnswer: 'Bucket trucks typically require a Class B CDL due to weight (26,000+ GVWR). OSHA safety training is often required for aerial work. DOT registration may apply for interstate use.',
    noCdlAnswer: 'Bucket trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. OSHA training is often required for aerial work regardless of license class.',
  },
  'vac-truck': {
    name: 'Vac Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: 'Heavy vocational vehicle',
    additionalCerts: 'Environmental / safety training may apply',
    quickAnswer: 'Most vac trucks require a Class B CDL due to weight. Environmental and safety training may apply. DOT registration required for interstate commerce.',
    noCdlAnswer: 'Vac trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. Environmental and confined space training may also be required depending on the application.',
  },
  'box-truck': {
    name: 'Box Truck',
    cdlRequired: 'Sometimes no CDL under 26,000 lbs',
    weightClass: 'Light commercial',
    additionalCerts: 'DOT number if interstate commerce',
    quickAnswer: 'Box trucks under 26,000 pounds GVWR may not require a CDL. Larger box trucks typically require a Class B CDL. DOT number required for interstate commerce.',
    noCdlAnswer: 'Yes. Some box trucks under 26,000 pounds GVWR may not require a CDL. However, larger commercial box trucks (26,000+ lbs) often require a Class B CDL. Check your vehicle\'s GVWR.',
  },
  'tow-truck': {
    name: 'Tow Truck',
    cdlRequired: 'Often Class B CDL depending on weight',
    weightClass: '26,000+ GVWR typical',
    additionalCerts: 'State towing certifications may apply',
    quickAnswer: 'Tow trucks often require a Class B CDL when GVWR exceeds 26,000 lbs. Some states require towing certifications. DOT registration for interstate operations.',
    noCdlAnswer: 'Light-duty tow trucks under 26,000 lbs may not require a CDL. Most medium and heavy-duty tow trucks exceed 26,000 lbs and require a Class B CDL.',
  },
  'cement-truck': {
    name: 'Cement Truck',
    cdlRequired: 'Yes, Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'DOT registration; hazmat if hauling certain materials',
    quickAnswer: 'Cement trucks require a Class B CDL due to weight. DOT registration required. Hazmat endorsement may apply for certain materials.',
    noCdlAnswer: 'No. Cement trucks (ready-mix) exceed 26,000 pounds GVWR and require a Class B CDL. There is no exemption for operating without a CDL.',
  },
  'garbage-truck': {
    name: 'Garbage Truck',
    cdlRequired: 'Yes, Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'DOT registration; some municipalities have additional requirements',
    quickAnswer: 'Garbage trucks require a Class B CDL due to weight. DOT registration required for commercial operations. Municipal contracts may have additional requirements.',
    noCdlAnswer: 'No. Garbage trucks exceed 26,000 pounds GVWR and require a Class B CDL. Refuse collection vehicles are classified as commercial motor vehicles.',
  },
  'fire-truck': {
    name: 'Fire Truck',
    cdlRequired: 'Yes, Class B or Class A depending on configuration',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'Firefighter certification; EVT (Emergency Vehicle Technician) for some roles',
    quickAnswer: 'Fire trucks require a Class B or Class A CDL depending on configuration. Firefighter certification and EVT training are typically required. DOT exemptions may apply for emergency response.',
    noCdlAnswer: 'No. Fire trucks exceed 26,000 pounds GVWR and require a CDL. Some states offer CDL exemptions for volunteer firefighters under specific conditions.',
  },
  'flatbed-truck': {
    name: 'Flatbed Truck',
    cdlRequired: 'Yes, Class A or Class B',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'DOT registration; oversize/overweight permits for specialty loads',
    quickAnswer: 'Flatbed trucks require Class A CDL (tractor-trailer) or Class B CDL (straight truck). DOT registration required. Oversize permits for specialty loads.',
    noCdlAnswer: 'Flatbed tractors require Class A CDL. Straight flatbed trucks under 26,000 lbs may not require a CDL, but most commercial flatbeds exceed this weight.',
  },
  'heavy-haul': {
    name: 'Heavy Haul Truck',
    cdlRequired: 'Yes, Class A CDL',
    weightClass: 'Class A CDL',
    additionalCerts: 'DOT registration; oversize/overweight permits; pilot car may be required',
    quickAnswer: 'Heavy haul trucks require a Class A CDL. DOT registration and oversize/overweight permits are required. Pilot car escort may be required for certain loads.',
    noCdlAnswer: 'No. Heavy haul tractors require a Class A CDL. Oversize and overweight permits add additional regulatory requirements.',
  },
  'crane-truck': {
    name: 'Crane Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'Crane operator certification; DOT registration',
    quickAnswer: 'Crane trucks typically require a Class B CDL. Crane operator certification (NCCCO or state equivalent) is often required. DOT registration for commercial use.',
    noCdlAnswer: 'Crane trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. Crane operator certification is typically required in addition to the CDL.',
  },
  'boom-truck': {
    name: 'Boom Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'Crane/boom operator certification; DOT registration',
    quickAnswer: 'Boom trucks typically require a Class B CDL. Crane or material handler certification may be required. DOT registration for commercial operations.',
    noCdlAnswer: 'Boom trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. Operator certification for the boom/crane is often required.',
  },
  'street-sweeper': {
    name: 'Street Sweeper',
    cdlRequired: 'Often Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'DOT registration; municipal training may apply',
    quickAnswer: 'Street sweepers typically require a Class B CDL due to weight. DOT registration for commercial operations. Municipal contracts may require additional training.',
    noCdlAnswer: 'Street sweepers typically exceed 26,000 pounds GVWR and require a Class B CDL. Municipal operators may have additional training requirements.',
  },
  'refrigerated-truck': {
    name: 'Refrigerated Truck',
    cdlRequired: 'Yes, Class A or Class B depending on configuration',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'DOT registration; food safety training may apply',
    quickAnswer: 'Refrigerated trucks require Class A CDL (tractor-trailer) or Class B CDL (straight truck). DOT registration required. Food safety training may apply for food hauling.',
    noCdlAnswer: 'Reefer tractors require Class A CDL. Straight refrigerated trucks under 26,000 lbs may not require a CDL, but most exceed this weight.',
  },
  'tanker-truck': {
    name: 'Tanker Truck',
    cdlRequired: 'Yes, Class A CDL',
    weightClass: 'Class A CDL',
    additionalCerts: 'DOT registration; tanker endorsement; hazmat endorsement if hauling hazardous materials',
    quickAnswer: 'Tanker trucks require a Class A CDL with tanker endorsement. Hazmat endorsement required for hazardous materials. DOT registration required.',
    noCdlAnswer: 'No. Tanker trucks require a Class A CDL. Tanker and hazmat endorsements are required for many tanker operations.',
  },
  'hydro-excavation': {
    name: 'Hydro Excavation Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: 'Heavy vocational vehicle',
    additionalCerts: 'Environmental/safety training; DOT registration',
    quickAnswer: 'Hydro excavation trucks typically require a Class B CDL. Environmental and confined space training may apply. DOT registration for commercial use.',
    noCdlAnswer: 'Hydro excavation trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. Confined space and excavation safety training are often required.',
  },
  'vacuum-excavator': {
    name: 'Vacuum Excavator',
    cdlRequired: 'Often Class B CDL',
    weightClass: 'Heavy vocational vehicle',
    additionalCerts: 'Environmental/safety training; DOT registration',
    quickAnswer: 'Vacuum excavators typically require a Class B CDL. Environmental and safety training may apply. DOT registration for commercial operations.',
    noCdlAnswer: 'Vacuum excavators typically exceed 26,000 pounds GVWR and require a Class B CDL. Similar to vac trucks and hydro excavation units.',
  },
  'septic-vac-truck': {
    name: 'Septic Vac Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: 'Heavy vocational vehicle',
    additionalCerts: 'Environmental/waste handling; DOT registration',
    quickAnswer: 'Septic vac trucks typically require a Class B CDL. Waste handling and environmental training may apply. DOT registration for commercial operations.',
    noCdlAnswer: 'Septic vac trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. Waste handling certifications may be required by state or local regulations.',
  },
  'utility-truck': {
    name: 'Utility Truck',
    cdlRequired: 'Varies by weight—Class B if 26,000+ lbs',
    weightClass: 'Varies',
    additionalCerts: 'OSHA training; DOT registration if interstate',
    quickAnswer: 'Utility trucks may or may not require a CDL depending on GVWR. Units over 26,000 lbs require Class B CDL. OSHA training often required for line work.',
    noCdlAnswer: 'Some utility trucks under 26,000 lbs may not require a CDL. Larger utility trucks with tool bodies and equipment typically exceed 26,000 lbs and require a Class B CDL.',
  },
  'service-truck': {
    name: 'Service Truck',
    cdlRequired: 'Varies—often no CDL under 26,000 lbs',
    weightClass: 'Light to medium duty',
    additionalCerts: 'DOT number if interstate; trade certifications may apply',
    quickAnswer: 'Service trucks under 26,000 lbs may not require a CDL. Heavier service trucks with cranes or large tool bodies may require Class B. DOT registration if crossing state lines.',
    noCdlAnswer: 'Yes. Many service trucks under 26,000 pounds GVWR do not require a CDL. Heavier service trucks with cranes or large equipment may exceed 26,000 lbs and require a Class B CDL.',
  },
  'snow-plow-truck': {
    name: 'Snow Plow Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: '26,000+ GVWR typical',
    additionalCerts: 'DOT registration; municipal contracts may have additional requirements',
    quickAnswer: 'Snow plow trucks typically require a Class B CDL when GVWR exceeds 26,000 lbs. DOT registration for commercial plowing. Municipal contracts may have additional requirements.',
    noCdlAnswer: 'Light-duty plow trucks under 26,000 lbs may not require a CDL. Most commercial snow plow trucks exceed 26,000 lbs and require a Class B CDL.',
  },
  'ladder-truck': {
    name: 'Ladder Truck',
    cdlRequired: 'Yes, Class B or Class A',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'Firefighter certification; aerial operator training',
    quickAnswer: 'Ladder trucks require a Class B or Class A CDL. Firefighter and aerial operator certification required. DOT exemptions may apply for emergency response.',
    noCdlAnswer: 'No. Ladder trucks exceed 26,000 pounds GVWR and require a CDL. Firefighter certification and aerial operation training are also required.',
  },
  'airport-fire-truck': {
    name: 'Airport Fire Truck',
    cdlRequired: 'Yes, Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'ARFF certification; airport-specific training',
    quickAnswer: 'Airport fire trucks require a Class B CDL. ARFF (Aircraft Rescue and Firefighting) certification is required. DOT exemptions may apply for emergency operations.',
    noCdlAnswer: 'No. Airport fire trucks exceed 26,000 pounds GVWR and require a Class B CDL. ARFF certification is required for operators.',
  },
  'airport-ground-service': {
    name: 'Airport Ground Service Truck',
    cdlRequired: 'Varies—Class B if 26,000+ lbs',
    weightClass: 'Varies',
    additionalCerts: 'Airport security clearance; DOT if interstate',
    quickAnswer: 'Airport ground service vehicles may or may not require a CDL depending on GVWR. Heavier baggage tugs and cargo loaders may require Class B. Airport security clearance required.',
    noCdlAnswer: 'Some airport ground service vehicles under 26,000 lbs may not require a CDL. Larger cargo and baggage equipment typically requires a Class B CDL.',
  },
  'rail-maintenance-truck': {
    name: 'Rail Maintenance Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'Railroad safety training; DOT registration',
    quickAnswer: 'Rail maintenance trucks typically require a Class B CDL. Railroad-specific safety training (e.g., FRA) may be required. DOT registration for commercial use.',
    noCdlAnswer: 'Rail maintenance trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. Railroad safety certifications are often required.',
  },
  'telecom-bucket-truck': {
    name: 'Telecom Bucket Truck',
    cdlRequired: 'Often Class B CDL',
    weightClass: '26,000+ GVWR',
    additionalCerts: 'OSHA training; telecom safety; DOT registration',
    quickAnswer: 'Telecom bucket trucks typically require a Class B CDL. OSHA and telecom-specific safety training are often required. DOT registration for interstate work.',
    noCdlAnswer: 'Telecom bucket trucks typically exceed 26,000 pounds GVWR and require a Class B CDL. OSHA training for aerial work is typically required.',
  },
  'logging-truck': {
    name: 'Logging Truck',
    cdlRequired: 'Yes, Class A CDL',
    weightClass: 'Class A CDL',
    additionalCerts: 'DOT registration; load securement; state logging regulations',
    quickAnswer: 'Logging trucks require a Class A CDL. DOT registration and load securement training required. State logging regulations may apply.',
    noCdlAnswer: 'No. Logging trucks (tractor-trailer combinations) require a Class A CDL. Load securement and state-specific logging regulations apply.',
  },
  'day-cab-semi': {
    name: 'Day Cab Semi',
    cdlRequired: 'Yes, Class A CDL',
    weightClass: 'Class A CDL',
    additionalCerts: 'DOT registration required',
    quickAnswer: 'Day cab semis require a Class A CDL and DOT registration. Same licensing as sleeper tractors—only cab configuration differs.',
    noCdlAnswer: 'No. Day cab semis require a Class A CDL. The day cab vs. sleeper distinction does not affect CDL requirements.',
  },
  'sleeper-truck': {
    name: 'Sleeper Truck',
    cdlRequired: 'Yes, Class A CDL',
    weightClass: 'Class A CDL',
    additionalCerts: 'DOT registration required',
    quickAnswer: 'Sleeper trucks require a Class A CDL and DOT registration. Same licensing as day cab tractors—only cab configuration differs.',
    noCdlAnswer: 'No. Sleeper trucks require a Class A CDL. The sleeper vs. day cab distinction does not affect CDL requirements.',
  },
};

const OTHER_LICENSE_ROWS = {
  'Semi Truck': ['Yes', 'Class A CDL', 'DOT registration required'],
  'Dump Truck': ['Usually Class B CDL', '26,000+ GVWR', 'DOT registration for interstate operations'],
  'Bucket Truck': ['Often Class B CDL depending on weight', 'Utility operation', 'OSHA safety training often required'],
  'Box Truck': ['Sometimes no CDL under 26,000 lbs', 'Light commercial', 'DOT number if interstate commerce'],
  'Vac Truck': ['Often Class B CDL', 'Heavy vocational vehicle', 'Environmental / safety training may apply'],
};

function getOtherLicenseRows(currentVehicle) {
  return Object.entries(OTHER_LICENSE_ROWS)
    .filter(([name]) => name !== currentVehicle)
    .slice(0, 4)
    .map(([name, [cdl, weight, certs]]) => `<tr><td>${name}</td><td>${cdl}</td><td>${weight}</td><td>${certs}</td></tr>`)
    .join('');
}

// Shared licensing section template - vehicle-specific parts inserted via placeholders
function getLicensingSection(data) {
  return `
          <h2 id="licensing">Licensing and Regulatory Requirements</h2>
          <p>Licensing requirements for operating a ${data.name.toLowerCase()} vary by state, vehicle weight, business activity, and cargo type. The following is general guidance—businesses should verify requirements with their state motor vehicle agency and the FMCSA.</p>

          <div class="ai-quick-answer" style="margin: 1.5rem 0;">
            <h3>Licensing Quick Answer</h3>
            <p>${data.quickAnswer}</p>
          </div>

          <h3>Driver License Requirements</h3>
          <p>Commercial vehicles are regulated by weight (GVWR—gross vehicle weight rating) and configuration. Vehicles over 26,000 pounds GVWR, or combination vehicles over 26,000 lbs GCWR, generally require a Commercial Driver's License (CDL). Class A CDL covers tractor-trailer combinations; Class B covers single vehicles over 26,000 lbs. Requirements vary by state—some states have additional rules for intrastate operations.</p>

          <h3>License Requirement Table</h3>
          <table class="data-table">
            <thead><tr><th>Vehicle Type</th><th>CDL Required</th><th>Typical Weight Class</th><th>Additional Certifications</th></tr></thead>
            <tbody>
              <tr><td>${data.name}</td><td>${data.cdlRequired}</td><td>${data.weightClass}</td><td>${data.additionalCerts}</td></tr>
              ${getOtherLicenseRows(data.name)}
            </tbody>
          </table>

          <h3>DOT Registration Requirements</h3>
          <p>Businesses that operate commercial motor vehicles in interstate commerce must register with the U.S. Department of Transportation (DOT) and obtain a USDOT number. Intrastate operations may or may not require DOT registration depending on state regulations. Requirements vary by state, vehicle weight, and type of operation.</p>
          <table class="data-table">
            <thead><tr><th>Business Type</th><th>DOT Number Required?</th></tr></thead>
            <tbody>
              <tr><td>Interstate trucking company</td><td>Yes</td></tr>
              <tr><td>Local contractor with heavy truck</td><td>Often required depending on use</td></tr>
              <tr><td>Delivery business with smaller trucks</td><td>Sometimes required</td></tr>
              <tr><td>Intrastate operations</td><td>Depends on state regulations</td></tr>
            </tbody>
          </table>

          <h3>Weight-Based Licensing Thresholds</h3>
          <p>Federal CDL requirements apply to vehicles with a GVWR of 26,001 pounds or more, or combination vehicles with a GCWR of 26,001 pounds or more. Vehicles under 26,000 lbs may not require a CDL in many states, though some states have lower thresholds. Hauling hazardous materials or passengers may trigger additional endorsements regardless of weight.</p>

          <h3>Typical Experience or Training Expectations</h3>
          <p>Many industries require training or operating experience beyond the CDL:</p>
          <ul>
            <li><strong>CDL training:</strong> Commercial driver training schools offer CDL preparation. Some employers provide in-house training.</li>
            <li><strong>Safety certifications:</strong> OSHA 10 or OSHA 30 for construction and utility work.</li>
            <li><strong>Heavy equipment operation:</strong> Crane, boom, or aerial device operator certification (NCCCO, state programs).</li>
            <li><strong>Environmental training:</strong> Confined space, hazardous materials, or waste handling for vac trucks and environmental services.</li>
            <li><strong>Commercial driver training hours:</strong> Some states require a minimum number of behind-the-wheel hours before CDL issuance.</li>
          </ul>

          <h3>Can You Operate This Vehicle Without a CDL?</h3>
          <p>${data.noCdlAnswer}</p>

          <p class="quick-facts" style="margin-top: 1.5rem; padding: 1rem; background: var(--accent-light); border-radius: var(--radius);"><strong>Disclaimer:</strong> Licensing rules vary by state, vehicle weight, business activity, and cargo type. Requirements change over time. Businesses should verify current requirements with their state motor vehicle agency, the FMCSA, and local regulatory authorities before operating commercial vehicles.</p>

`;
}

// Licensing FAQ items to add
function getLicensingFaqs(data) {
  return `
          <div class="faq-item"><h3>Do you need a CDL to drive a ${data.name.toLowerCase()}?</h3><p>${data.quickAnswer}</p></div>
          <div class="faq-item"><h3>What class CDL is required for a ${data.name.toLowerCase()}?</h3><p>${data.cdlRequired}. ${data.weightClass}. Requirements vary by state and vehicle configuration.</p></div>
          <div class="faq-item"><h3>Do you need a DOT number for a ${data.name.toLowerCase()}?</h3><p>DOT registration is typically required for interstate commerce. Intrastate operations depend on state regulations. Verify with the FMCSA and your state agency.</p></div>
          <div class="faq-item"><h3>How long does it take to get licensed for a ${data.name.toLowerCase()}?</h3><p>CDL training programs typically run 2–8 weeks. State testing and endorsement processing may add time. Endorsements (tanker, hazmat) require additional testing.</p></div>
          <div class="faq-item"><h3>Can a startup business operate a ${data.name.toLowerCase()}?</h3><p>Yes. Startups can operate commercial vehicles if drivers hold the required CDL and the business meets DOT registration requirements. Financing may require proof of contracts or revenue.</p></div>
`;
}

function addLicensingToQuickAnswer(html, data) {
  // Add licensing to existing Quick Answer - append after first </p> in ai-quick-answer
  const quickAnswerRegex = /(<div class="ai-quick-answer">\s*<h3>Quick Answer<\/h3>\s*<p>)([^<]+)(<\/p>)/;
  const match = html.match(quickAnswerRegex);
  if (match) {
    const newContent = match[1] + match[2] + ' ' + data.quickAnswer + match[3];
    return html.replace(quickAnswerRegex, newContent);
  }
  return html;
}

function processFile(filename) {
  let slug = filename.replace('-financing.html', '').replace('.html', '');
  // Map file-based slugs to config keys
  const slugMap = {
    'heavy-haul-truck': 'heavy-haul',
    'hydro-excavation-truck': 'hydro-excavation',
    'street-sweeper-truck': 'street-sweeper',
    'vacuum-excavator-truck': 'vacuum-excavator',
    'airport-ground-service-truck': 'airport-ground-service',
  };
  slug = slugMap[slug] || slug;
  const data = VEHICLE_DATA[slug];
  if (!data) {
    console.log('Skipping (no data):', filename);
    return;
  }

  const filepath = path.join(VEHICLES_DIR, filename);
  let html = fs.readFileSync(filepath, 'utf8');

  // Skip if already has licensing section
  if (html.includes('Licensing and Regulatory Requirements')) {
    console.log('Already has licensing:', filename);
    return;
  }

  // 1. Add licensing section before cta-stack
  const licensingSection = getLicensingSection(data);
  html = html.replace(
    /(\s+)(<div class="cta-stack" style="margin-top: 2rem;">)/,
    licensingSection + '$1$2'
  );

  // 2. Add licensing quick answer - insert second quick answer block after first section
  // Actually, the user said "Include a short quick-answer section" - we're adding a separate "Licensing Quick Answer" in the licensing section. So we don't need to modify the main Quick Answer. Skip that.

  // 3. Add licensing FAQs at start of FAQ section
  const licensingFaqs = getLicensingFaqs(data);
  html = html.replace(
    /(<h2 class="faq-section">Common Questions<\/h2>\s*)(<div class="faq-item">)/,
    '$1' + licensingFaqs + '$2'
  );

  fs.writeFileSync(filepath, html);
  console.log('Updated:', filename);
}

// Main
const files = fs.readdirSync(VEHICLES_DIR).filter(f => f.endsWith('.html'));
files.forEach(processFile);
console.log('Done.');
