/**
 * Replace /scripts/mobile-nav.js and /script.js with paths relative to each HTML file
 * so pages work when opened via file:// (local disk) as well as on the live site.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAV_ABS = path.join(ROOT, "scripts", "mobile-nav.js");
const SITE_ABS = path.join(ROOT, "script.js");

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

function relTo(fromFile, absTarget) {
  const dir = path.dirname(fromFile);
  let r = path.relative(dir, absTarget).replace(/\\/g, "/");
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}

let n = 0;
for (const file of walkHtml(ROOT)) {
  const navSrc = relTo(file, NAV_ABS);
  const siteSrc = relTo(file, SITE_ABS);
  let c = fs.readFileSync(file, "utf8");
  const orig = c;
  c = c.replace(
    /<script src="\/scripts\/mobile-nav\.js" defer><\/script>/g,
    `<script src="${navSrc}" defer></script>`
  );
  c = c.replace(
    /<script src="\/script\.js" defer><\/script>/g,
    `<script src="${siteSrc}" defer></script>`
  );
  if (c !== orig) {
    fs.writeFileSync(file, c, "utf8");
    n++;
  }
}
console.log("HTML files updated:", n);
