import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

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

let fixed = 0;
for (const file of walkHtml(ROOT)) {
  let c = fs.readFileSync(file, "utf8");
  const orig = c;
  // Fix doubled indent before #apply (8 spaces -> 4)
  c = c.replace(
    /\n {8}<section class="section" id="apply"/g,
    '\n    <section class="section" id="apply"'
  );
  // Fix #related-topics line that lost leading spaces after bulk insert
  c = c.replace(
    /\n<section class="section" id="related-topics">/g,
    '\n    <section class="section" id="related-topics">'
  );
  if (c !== orig) {
    fs.writeFileSync(file, c, "utf8");
    fixed++;
  }
}
console.log("files fixed:", fixed);
