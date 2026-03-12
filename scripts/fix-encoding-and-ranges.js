#!/usr/bin/env node
/**
 * Fix encoding and range formatting across the site:
 * 1. Replace ? and � (U+FFFD) with en dash (–) in number ranges
 * 2. Replace ") ? " with ") – " in Sources lists
 * 3. Replace other ?-as-dash patterns (e.g. "applying?knowing" -> "applying—knowing")
 * 4. Ensure <meta charset="UTF-8"> in all HTML files
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EN_DASH = '\u2013';  // –
const REPLACEMENT_CHAR = '\uFFFD';  // �

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
    } catch (err) {
      // skip
    }
  }
  walk(ROOT);
  return files;
}

function fixRangesAndEncoding(html) {
  let changed = html;

  // 1. Replace ? with – in number/dollar ranges (avoid URLs: ?ref=, ?family=, ?display=)
  changed = changed.replace(/([0-9kK,])\?([$0-9kK])/g, `$1${EN_DASH}$2`);

  // 2. Replace � (U+FFFD replacement char) and other corrupted dash chars with – in ranges
  changed = changed.replace(new RegExp(`([0-9kK,])${REPLACEMENT_CHAR}([$0-9kK])`, 'gu'), `$1${EN_DASH}$2`);
  changed = changed.replace(new RegExp(`([0-9kK]) ${REPLACEMENT_CHAR} `, 'gu'), `$1 ${EN_DASH} `);
  changed = changed.replace(new RegExp(`${REPLACEMENT_CHAR}`, 'gu'), EN_DASH);  // Any remaining �

  // 3. Replace " ? " with " – " in Sources (e.g. "</a> ? commercial") - use char code in case ? is non-ASCII
  changed = changed.replace(/<\/a> \? /g, `</a> ${EN_DASH} `);
  changed = changed.replace(/\) \? /g, `) ${EN_DASH} `);

  // 4. Replace %?% ranges (e.g. 10?30%)
  changed = changed.replace(/([0-9]+)\?([0-9]+%)/g, `$1${EN_DASH}$2`);

  // 5. Replace word?word where ? is clearly em dash (e.g. "credit?strong", "GVWR?gross")
  // Avoid URLs: exclude when followed by = (e.g. ?ref=, ?family=)
  changed = changed.replace(/([a-z]{2,})\?([a-z]{2,})(?![^<]*=)/g, '$1\u2014$2');
  // 5b. After closing tag: </strong>?startups -> </strong>—startups
  changed = changed.replace(/(>)\?([a-z]{2,})/g, '$1\u2014$2');
  // 5c. Uppercase before ?: GVWR?gross -> GVWR—gross (exclude URLs)
  changed = changed.replace(/([A-Z][A-Za-z0-9]*)\?([a-z]{2,})(?![^<]*=)/g, '$1\u2014$2');

  return changed;
}

function ensureCharset(html) {
  // Check if charset meta exists and is correct
  const charsetMatch = html.match(/<meta\s+charset\s*=\s*["']?([^"'>\s]+)["']?/i);
  if (charsetMatch) {
    const current = charsetMatch[1];
    if (current.toUpperCase() !== 'UTF-8') {
      return html.replace(charsetMatch[0], '<meta charset="UTF-8">');
    }
    // Normalize to <meta charset="UTF-8"> (without trailing /> for consistency)
    if (!charsetMatch[0].includes('charset="UTF-8"') || charsetMatch[0].includes('/>')) {
      return html.replace(charsetMatch[0], '<meta charset="UTF-8">');
    }
  } else {
    // Insert after <head> or at start of head
    if (html.includes('<head>')) {
      return html.replace('<head>', '<head>\n  <meta charset="UTF-8">');
    }
    if (html.includes('<head ')) {
      return html.replace(/<head[^>]*>/, (m) => m + '\n  <meta charset="UTF-8">');
    }
  }
  return html;
}

function main() {
  const files = getAllHtmlFiles();
  let rangeCount = 0;
  let charsetCount = 0;

  for (const fp of files) {
    let html = fs.readFileSync(fp, 'utf8');
    const original = html;

    html = fixRangesAndEncoding(html);
    if (html !== original) {
      rangeCount++;
    }

    const beforeCharset = html;
    html = ensureCharset(html);
    if (html !== beforeCharset) {
      charsetCount++;
    }

    if (html !== original || html !== beforeCharset) {
      fs.writeFileSync(fp, html, 'utf8');
    }
  }

  console.log('Range/encoding fixes:', rangeCount, 'files');
  console.log('Charset fixes:', charsetCount, 'files');
  console.log('Total HTML files:', files.length);
}

main();
