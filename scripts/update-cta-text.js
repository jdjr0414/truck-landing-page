#!/usr/bin/env node
/**
 * Update CTA button text to softer, informational tone:
 * - "Get Financing" -> "Explore Financing Options"
 * - "Get Matched with Lenders" -> "Compare Financing Options"
 * URLs remain unchanged (axiantpartners.com/match?ref=commercialvehicleguide)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function getAllHtmlFiles() {
  const files = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(full);
        } else if (e.name.endsWith('.html')) {
          files.push(full);
        }
      }
    } catch (err) {}
  }
  walk(ROOT);
  return files;
}

let count = 0;
for (const fp of getAllHtmlFiles()) {
  let html = fs.readFileSync(fp, 'utf8');
  const original = html;
  html = html.replace(/>Get Financing</g, '>Explore Financing Options<');
  html = html.replace(/>Get Matched with Lenders</g, '>Explore Financing Options<');
  html = html.replace(/>Compare Financing Options</g, '>Explore Financing Options<');
  if (html !== original) {
    fs.writeFileSync(fp, html, 'utf8');
    count++;
  }
}
console.log('Updated', count, 'files');
