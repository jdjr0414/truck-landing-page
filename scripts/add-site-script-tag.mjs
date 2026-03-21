/**
 * Adds <script src="/script.js" defer></script> after mobile-nav on each page once.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEEDLE = '<script src="/scripts/mobile-nav.js" defer></script>';
const REPLACEMENT = `${NEEDLE}\n  <script src="/script.js" defer></script>`;

function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walkHtml(p, out);
    } else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let n = 0;
for (const file of walkHtml(ROOT)) {
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes(NEEDLE)) continue;
  if (c.includes('src="/script.js"')) continue;
  if (!c.includes(NEEDLE)) continue;
  const next = c.replace(NEEDLE, REPLACEMENT);
  if (next !== c) {
    fs.writeFileSync(file, next, "utf8");
    n++;
  }
}
console.log("HTML files updated:", n);
