/**
 * Adds the financing #apply form section to every .html file that has <main>
 * and does not already have id="apply". Inserts before #related-topics if present,
 * otherwise immediately before </main>.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FORM = `    <section class="section" id="apply" style="background: var(--surface, #f8f9fa);">
  <div class="container">
    <div class="form-wrap">
      <h2 style="margin-bottom: 0.5rem;">Get Matched With a Lender</h2>
      <p style="color: var(--muted, #666); margin-bottom: 1.5rem;">
        Tell us about your financing need and we'll connect you with 
        lenders that fit your situation. No commitment required.
      </p>
      <form class="referral-form" action="https://formspree.io/f/xbdzbqjw" 
        method="POST">
        <div class="form-grid">
          <div>
            <label for="fname">First Name *</label>
            <input type="text" id="fname" name="first_name" 
              required placeholder="First name" />
          </div>
          <div>
            <label for="lname">Last Name *</label>
            <input type="text" id="lname" name="last_name" 
              required placeholder="Last name" />
          </div>
          <div>
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" 
              required placeholder="your@email.com" />
          </div>
          <div>
            <label for="phone">Phone Number *</label>
            <input type="tel" id="phone" name="phone" 
              required placeholder="(555) 555-5555" />
          </div>
          <div>
            <label for="amount">Financing Amount Needed</label>
            <select id="amount" name="amount">
              <option value="" disabled selected>Select range</option>
              <option>Under $50,000</option>
              <option>$50,000 – $100,000</option>
              <option>$100,000 – $250,000</option>
              <option>$250,000 – $500,000</option>
              <option>Over $500,000</option>
            </select>
          </div>
          <div>
            <label for="credit">Credit Score Range</label>
            <select id="credit" name="credit_score">
              <option value="" disabled selected>Select range</option>
              <option>700+</option>
              <option>650 – 699</option>
              <option>600 – 649</option>
              <option>550 – 599</option>
              <option>Below 550</option>
            </select>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <label for="message">Tell us about the equipment or 
            financing need</label>
          <textarea id="message" name="message" rows="4" 
            placeholder="Equipment type, how it will be used, any previous declines, etc."></textarea>
        </div>
        <div class="form-actions" style="margin-top: 1.25rem;">
          <button type="submit" class="btn">Get Matched Now</button>
          <p class="form-note">We respond within 1 business day. 
            No hard credit pull to get started.</p>
        </div>
        <input type="hidden" name="_source" 
          value="commercialvehicleguide" />
      </form>
    </div>
  </div>
</section>`;

/** Match newline + indent + opening tag so we don't duplicate leading spaces */
const RELATED_RE =
  /(\n)(\s*)(<section[^>]*\bid\s*=\s*["']related-topics["'][^>]*>)/i;
const HAS_MAIN_RE = /<main[\s>]/i;
const HAS_APPLY_RE = /\bid\s*=\s*["']apply["']/i;

function walkHtmlFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walkHtmlFiles(p, out);
    } else if (e.name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

const files = walkHtmlFiles(ROOT);
let updated = 0;
let skippedNoMain = 0;
let skippedHasApply = 0;
let skippedError = 0;
const errors = [];

for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch (err) {
    skippedError++;
    errors.push(`${file}: read ${err.message}`);
    continue;
  }

  if (!HAS_MAIN_RE.test(content)) {
    skippedNoMain++;
    continue;
  }
  if (HAS_APPLY_RE.test(content)) {
    skippedHasApply++;
    continue;
  }

  const relMatch = content.match(RELATED_RE);
  let newContent;
  if (relMatch) {
    const nl = relMatch[1];
    const indent = relMatch[2];
    const sectionTag = relMatch[3];
    /* FORM already uses 4-space indent; match typical page indent */
    newContent = content.replace(
      RELATED_RE,
      `${nl}${FORM}\n${indent}${sectionTag}`
    );
  } else {
    const lower = content.toLowerCase();
    const closeIdx = lower.lastIndexOf("</main>");
    if (closeIdx === -1) {
      errors.push(`${file}: has <main> but no </main> and no #related-topics`);
      skippedError++;
      continue;
    }
    newContent = content.slice(0, closeIdx) + FORM + "\n" + content.slice(closeIdx);
  }

  try {
    fs.writeFileSync(file, newContent, "utf8");
    updated++;
  } catch (err) {
    skippedError++;
    errors.push(`${file}: write ${err.message}`);
  }
}

console.log(
  JSON.stringify(
    {
      updated,
      skippedNoMain,
      skippedHasApply,
      skippedError,
      totalHtml: files.length,
      errors: errors.slice(0, 30),
      errorTotal: errors.length,
    },
    null,
    2
  )
);
