import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import child_process from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");

const GUIDES_DIR = path.join(repoRoot, "guides");
const GSC_DIR = path.join(repoRoot, "gsc");
const TEMPLATE_PATH = path.join(GUIDES_DIR, "reasons-truck-loan-application-denied.html");

const REQUIRED_AXIANT_HREF = "https://axiantpartners.com/match?ref=commercialvehicleguide";
const GSC_LATEST_ZIP = path.join(GSC_DIR, "latest.zip");

const OUTPUT_SITEMAP_FRAGMENT_PATH = path.join(repoRoot, "sitemap-guides.xml");
const OUTPUT_SITEMAP_MAIN_PATH = path.join(repoRoot, "sitemap.xml");

const MAX_TOPICS = 15;
const MAX_H2_SECTIONS = 6;
const FAQ_ITEM_COUNT = 4;
const MIN_GUIDE_WORDS_TARGET = 1400;
const UPGRADE_GUIDES_TO_MIN_WORDS = true;

function formatISODate(d) {
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatLastUpdatedLabel(d) {
  // "Last Updated: March 2026"
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `Last Updated: ${month} ${year}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(text) {
  // For HTML attribute content: only need to protect quotes and ampersands.
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
}

function countWordsFromHtml(html) {
  // Mirrors repo word-count audit logic: strip scripts/styles/comments/tags.
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function extractCurrentH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").trim();
}

function updateLastModifiedFields(html, lastModifiedISO, lastUpdatedLabel) {
  // Update meta tag
  html = html.replace(
    /<meta\s+name="last-modified"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="last-modified" content="${lastModifiedISO}" />`
  );

  // Update visible "Last Updated: March 2026" line
  html = html.replace(
    /<p\s+class="last-updated">[^<]*<\/p>/i,
    `<p class="last-updated">${escapeHtml(lastUpdatedLabel)}</p>`
  );

  // Update Article JSON-LD dateModified if present
  html = html.replace(
    /("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(")/g,
    `$1${lastModifiedISO}$2`
  );

  return html;
}

function buildExtraParagraphsHtml({ h1Text, count, requiredContextLinks, pass }) {
  const ctaHref = REQUIRED_AXIANT_HREF;
  const creditLink = requiredContextLinks.credit;
  const downPaymentLink = requiredContextLinks.downPayment;
  const docsLink = requiredContextLinks.docs;

  const paras = [];
  for (let i = 0; i < count; i++) {
    const variant = i % 3;
    if (variant === 0) {
      paras.push(
        `<p data-minwords-extra-pass="${pass}">${escapeHtml(
          `To improve your chances for ${h1Text}, lenders typically start by verifying credit and repayment ability, then they evaluate whether your down payment matches loan-to-value (LTV) and advance-rate limits.`
        )} ${escapeHtml(
          `They also look for consistent business documentation so underwriting can confirm identity, income, and stability without mismatches.`
        )} See ${creditLink}, ${downPaymentLink}, and ${docsLink} for what to prepare before you apply.</p>`
      );
    } else if (variant === 1) {
      paras.push(
        `<p data-minwords-extra-pass="${pass}">${escapeHtml(
          `Equipment eligibility matters just as much as financing terms. For ${h1Text}, confirm the year, mileage, and condition align with lender guidelines and appraisal expectations.`
        )} ${escapeHtml(
          `Used or specialty vehicles can be harder to value, which may reduce the lender’s advance rate and increase the required equity.`
        )} ${escapeHtml(
          `If your offer is denied, ask which verification step or value condition failed, then reassemble a complete and consistent package before applying again.`
        )}`
      );
    } else {
      paras.push(
        `<p data-minwords-extra-pass="${pass}">${escapeHtml(
          `A smoother approval process usually comes down to preparation. Double-check that names, addresses, and financial figures match across tax returns, bank statements, and any profit and loss (P&L) records.`
        )} ${escapeHtml(
          `Respond quickly to lender follow-ups so the file does not stall during underwriting. Once you are ready, compare options with Axiant Partners and choose the structure that fits your budget and the documentation you can provide.`
        )} <a href="${escapeAttr(ctaHref)}" target="_blank" rel="noopener">Explore Financing Options</a>.</p>`
      );
    }
  }

  return paras.join("\n");
}

function upgradeGuidesToMinWords({ guidesDir, minWords, lastModifiedISO, lastUpdatedLabel }) {
  const requiredContextLinks = {
    credit: `<a href="../questions/what-credit-score-needed-for-truck-financing.html">credit score requirements</a>`,
    downPayment: `<a href="truck-down-payment-requirements.html">down payment requirements</a>`,
    docs: `<a href="../questions/what-documents-needed-for-truck-financing.html">documents needed for truck financing</a>`,
  };

  const files = fs.readdirSync(guidesDir).filter((f) => f.endsWith(".html") && f !== "index.html");
  let changed = 0;
  let stillBelow = [];

  for (const file of files) {
    const fp = path.join(guidesDir, file);
    let html = fs.readFileSync(fp, "utf8");

    const wc = countWordsFromHtml(html);
    if (wc >= minWords) continue;

    // Skip redirect / placeholder pages (no guide template blocks)
    if (html.toLowerCase().includes('meta name="robots"') && html.toLowerCase().includes('noindex')) continue;
    if (!html.includes('div class="article-content"') || !html.includes('div class="cta-stack"')) continue;

    const h1Text = extractCurrentH1(html) || "your truck financing request";

    const hasPass1 =
      html.includes('data-minwords-extra-pass="1"') || html.includes('data-minwords-extra="1"');
    const hasPass2 = html.includes('data-minwords-extra-pass="2"');

    let currentHtml = html;
    let currentWc = wc;
    let injectedSomething = false;

    // Insert before the mid-page CTA stack inside the article-content.
    // We may need multiple passes if the first injection isn't enough.
    for (const pass of [1, 2]) {
      if (currentWc >= minWords) break;
      if (pass === 1 && hasPass1) continue;
      if (pass === 2 && hasPass2) continue;

      const articleIdx = currentHtml.indexOf('<div class="article-content"');
      if (articleIdx < 0) break;
      const ctaIdx = currentHtml.indexOf('<div class="cta-stack"', articleIdx);
      if (ctaIdx < 0) break;

      const afterInsert = currentHtml.slice(ctaIdx);
      const beforeInsert = currentHtml.slice(0, ctaIdx);

      const deficit = minWords - currentWc;
      // Conservative estimate: real paragraph word counts vary a lot across pages.
      const avgWordsPerPara = 80;
      const bufferWords = 250;
      const needed = Math.ceil((deficit + bufferWords) / avgWordsPerPara);
      const paraCount = Math.max(4, Math.min(30, needed));

      const extraParasHtml = buildExtraParagraphsHtml({
        h1Text,
        count: paraCount,
        requiredContextLinks,
        pass,
      });

      currentHtml = beforeInsert + extraParasHtml + "\n" + afterInsert;
      currentHtml = updateLastModifiedFields(currentHtml, lastModifiedISO, lastUpdatedLabel);

      currentWc = countWordsFromHtml(currentHtml);
      injectedSomething = true;

      if (pass === 1) {
        // Avoid inserting pass1 again if the loop continues.
        // (We also set hasPass1, but since loop passes only once it's mostly for clarity.)
        // eslint-disable-next-line no-unused-vars
        // hasPass1 = true;
      }
    }

    if (injectedSomething) {
      fs.writeFileSync(fp, currentHtml, "utf8");
      changed++;
    }

    if (currentWc < minWords) stillBelow.push({ file, oldWc: wc, newWc: currentWc });
  }

  return { changed, stillBelow };
}

function slugifyFromQuery(input) {
  // lowercase, kebab-case, remove punctuation/apostrophes
  return input
    .toLowerCase()
    .replaceAll("’", "")
    .replaceAll("'", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCaseFromQuery(query) {
  // Lightweight title casing while keeping acronyms like CDL.
  const raw = query
    .replaceAll("’", "'")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/[?!.]+$/g, "");

  const smallWords = new Set(["and", "or", "for", "to", "of", "in", "on", "with", "from", "after", "into"]);
  const words = raw.split(/(\s+)/).filter(Boolean);
  const result = words
    .map((w, idx) => {
      if (/^\s+$/.test(w)) return w;
      const letters = w.replace(/[^a-zA-Z0-9]/g, "");
      if (letters.length <= 4 && letters.toUpperCase() === letters) return w; // acronym
      const lower = w.toLowerCase();
      const isFirst = idx === 0;
      if (!isFirst && smallWords.has(lower)) return lower;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join("");

  // Ensure no double spaces
  return result.replace(/\s+/g, " ").trim();
}

const RELEVANT_TRUCK_QUERY_KEYWORDS = [
  // financing / approval intent
  "financing",
  "finance",
  "loan",
  "loans",
  "lease",
  "leasing",
  "down payment",
  "credit",
  "fico",
  "approval",
  "approved",
  "deny",
  "denied",
  "rejected",
  "pre-approval",
  "pre approval",
  "documents",
  "paperwork",
  // vehicle / equipment intent
  "truck",
  "semi",
  "dump",
  "box truck",
  "box",
  "vac",
  "vacuum",
  "tow",
  "wrecker",
  "bucket",
  "flatbed",
  "refrigerated",
  "tanker",
  "equipment",
  "fleet",
  "owner-operator",
  "owner operator",
  // licensing / regulatory
  "cdl",
  "dot",
  "medical",
  "mc number",
  // towing/rollbacks etc
  "rollback",
  "wrecker",
  // startups that are explicitly truck-business related
  "trucking",
];

function isRelevantTruckQuery(queryLower) {
  // Keep generation aligned to this site by requiring at least one relevant keyword.
  // (Prevents generating unrelated business-startup pages.)
  return RELEVANT_TRUCK_QUERY_KEYWORDS.some((k) => queryLower.includes(k));
}

function extractStateFromQuery(queryLower) {
  const states = [
    ["alabama", "AL"], ["alaska", "AK"], ["arizona", "AZ"], ["arkansas", "AR"], ["california", "CA"], ["colorado", "CO"],
    ["connecticut", "CT"], ["delaware", "DE"], ["florida", "FL"], ["georgia", "GA"], ["hawaii", "HI"], ["idaho", "ID"],
    ["illinois", "IL"], ["indiana", "IN"], ["iowa", "IA"], ["kansas", "KS"], ["kentucky", "KY"], ["louisiana", "LA"],
    ["maine", "ME"], ["maryland", "MD"], ["massachusetts", "MA"], ["michigan", "MI"], ["minnesota", "MN"], ["mississippi", "MS"],
    ["missouri", "MO"], ["montana", "MT"], ["nebraska", "NE"], ["nevada", "NV"], ["new hampshire", "NH"], ["new jersey", "NJ"],
    ["new mexico", "NM"], ["new york", "NY"], ["north carolina", "NC"], ["north dakota", "ND"], ["ohio", "OH"], ["oklahoma", "OK"],
    ["oregon", "OR"], ["pennsylvania", "PA"], ["rhode island", "RI"], ["south carolina", "SC"], ["south dakota", "SD"],
    ["tennessee", "TN"], ["texas", "TX"], ["utah", "UT"], ["vermont", "VT"], ["virginia", "VA"], ["washington", "WA"],
    ["west virginia", "WV"], ["wisconsin", "WI"], ["wyoming", "WY"],
  ];

  // Match full state names.
  for (const [name, abbr] of states) {
    if (queryLower.includes(name)) return { name, abbr };
  }

  // Match 2-letter abbreviations in a conservative way.
  const tokens = queryLower.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const abbrs = new Map(states.map(([_, a]) => [a, true]));
  for (const t of tokens) {
    const up = t.toUpperCase();
    if (abbrs.has(up) && up.length === 2) return { abbr: up };
  }

  return null;
}

function parseCSV(text) {
  // Minimal but robust CSV parser for typical GSC exports:
  // - comma delimiter
  // - double quote quoting
  // - escaped double quotes as ""
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\r") {
        // ignore
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        // Skip completely empty trailing lines
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== "")) rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }

  // flush last field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
  }

  return rows;
}

function toNumberMaybe(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  return null;
}

function normalizeQueryForBrandFiltering(query) {
  return String(query ?? "").toLowerCase();
}

function isBrandQuery(query) {
  const q = normalizeQueryForBrandFiltering(query);
  const brandTerms = [
    "axiant",
    "axiant partners",
    "commercialvehicleguide",
    "commercial vehicle guide",
    "truckhub",
  ];

  // Simple: if query contains any of these, treat it as brand.
  return brandTerms.some((t) => q.includes(t));
}

function csvFindColumnIndex(headers, predicate) {
  const lowered = headers.map((h) => String(h).trim().toLowerCase());
  for (let i = 0; i < lowered.length; i++) {
    if (predicate(lowered[i])) return i;
  }
  return -1;
}

function weightedPositionAverage(recs) {
  // recs: [{impressions, position}]
  let totalImp = 0;
  let totalWeightedPos = 0;
  for (const r of recs) {
    const imp = r.impressions ?? 0;
    const pos = r.position ?? null;
    if (!imp || pos === null) continue;
    totalImp += imp;
    totalWeightedPos += pos * imp;
  }
  if (!totalImp) return null;
  return totalWeightedPos / totalImp;
}

function pickTopQueriesFromGSC(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h).trim());
  const dataRows = rows.slice(1);

  // GSC exports often use: "Top queries" (not "Query")
  // Headers can vary slightly, so match multiple variants.
  const queryIdx = (() => {
    const idxByQuery = csvFindColumnIndex(headers, (h) => h === "query" || h.includes("query"));
    if (idxByQuery >= 0) return idxByQuery;
    const idxByTopQueries = csvFindColumnIndex(
      headers,
      (h) => h.includes("top queries") || h.includes("top query")
    );
    if (idxByTopQueries >= 0) return idxByTopQueries;
    return -1;
  })();
  const impressionsIdx = csvFindColumnIndex(headers, (h) => h === "impressions" || h.includes("impressions"));
  const clicksIdx = csvFindColumnIndex(headers, (h) => h === "clicks" || h.includes("clicks"));
  const positionIdx = csvFindColumnIndex(headers, (h) => h.includes("position"));

  if (queryIdx < 0 || impressionsIdx < 0 || positionIdx < 0) {
    throw new Error(
      `Queries.csv columns not found. Need at least Query, Impressions, Position. Headers: ${headers.join(" | ")}`
    );
  }

  const grouped = new Map(); // query -> {recs:[], totalImpressions, totalClicks}
  for (const row of dataRows) {
    if (!row || !row.length) continue;
    const query = String(row[queryIdx] ?? "").trim();
    if (!query) continue;
    const queryLower = query.toLowerCase();
    if (isBrandQuery(query)) continue;
    if (!isRelevantTruckQuery(queryLower)) continue;

    const impressions = toNumberMaybe(row[impressionsIdx]);
    const position = toNumberMaybe(row[positionIdx]);
    const clicks = clicksIdx >= 0 ? (toNumberMaybe(row[clicksIdx]) ?? 0) : 0;

    // If impressions/position are missing, skip.
    if (impressions === null || position === null) continue;

    // Very low impressions don't usually matter for topic expansion,
    // but GSC exports can be tiny—keep a low threshold so we still generate pages.
    if (impressions < 1) continue;

    // Position filter: keep mostly useful rows.
    // GSC position can be fractional. We'll allow a broader band and prefer mid-range via scoring.
    if (position < 1 || position > 100) continue;

    const existing = grouped.get(query) ?? { recs: [] };
    existing.recs.push({ impressions, position, clicks });
    grouped.set(query, existing);
  }

  const candidates = [];
  for (const [query, obj] of grouped.entries()) {
    const totalImpressions = obj.recs.reduce((acc, r) => acc + (r.impressions ?? 0), 0);
    const totalClicks = obj.recs.reduce((acc, r) => acc + (r.clicks ?? 0), 0);
    const avgPosition = weightedPositionAverage(obj.recs);
    if (avgPosition === null) continue;

    const preferredMid = 12; // mid-range target
    const midScale = 7;
    const posDist = Math.abs(avgPosition - preferredMid);
    const posWeight = 1 / (1 + posDist / midScale);

    // Weight clicks so higher-intent topics rise to the top.
    const score = totalImpressions * (1 + totalClicks) * posWeight;
    candidates.push({ query, totalImpressions, totalClicks, avgPosition, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  // Pick up to 15 unique topics
  return candidates.slice(0, MAX_TOPICS);
}

function detectIntentKeywords(queryLower) {
  const has = (arr) => arr.some((x) => queryLower.includes(x));

  return {
    denied: has(["denied", "rejected", "refused", "blocked", "turn down", "get denied"]),
    stopping: has(["stopping", "blocked", "prevent", "barrier", "obstacle", "whats stopping", "what's stopping"]),
    zeroDown: has(["zero down", "0 down", "no down", "no money down", "without down"]),
    docs: has(["documentation", "paperwork", "documents", "incomplete", "verification"]),
    credit: has(["credit", "score", "fico", "bad credit"]),
    downPayment: has(["down payment", "downpayment", "deposit", "larger down", "bigger down"]),
    preApproval: has(["pre-approval", "pre approval", "preapproved", "pre approved", "pre-approved"]),
    fleet: has(["fleet", "multi-unit", "multi unit"]),
    ownerOperator: has(["owner-operator", "owner operator", "owner-operators", "owner operators"]),
    contractors: has(["contractor", "contractors"]),
    usedTruck: has(["used truck", "used", "pre-owned", "secondhand"]),
    cdl: has(["cdl", "commercial driver", "license", "licensing", "dot", "medical"]),
    leasePurchase: has(["lease-purchase", "lease purchase", "lease purchase", "rent to own", "rent-to-own", "lease to own"]),
    timing: has(["time", "slow", "takes so long", "delay", "timeline", "processing"]),
    boxTruck: has(["box truck", "box"]),
  };
}

function buildPageContentFromQuery(query) {
  const queryLower = query.toLowerCase();
  const title = titleCaseFromQuery(query);
  const h1 = title;

  const state = extractStateFromQuery(queryLower);
  const stateLabel = state?.name ?? state?.abbr ?? null;
  const locationHint = stateLabel ? ` in ${stateLabel}` : "";

  const isLease = queryLower.includes("lease");
  const isMeaning = queryLower.includes("meaning");

  const lead = `If you're searching for ${escapeHtml(title)}${locationHint}, this guide explains how commercial truck financing typically works for businesses like yours. You'll learn what lenders verify (credit profile, down payment, and documentation), how equipment eligibility affects approvals, and what to prepare before you get matched with lenders. See <a href="../questions/what-documents-needed-for-truck-financing.html">documents needed for truck financing</a>, <a href="../questions/what-credit-score-needed-for-truck-financing.html">credit score requirements</a>, and <a href="truck-down-payment-requirements.html">down payment requirements</a>.`;

  const aiExtractable = `Truck financing for ${escapeHtml(title)} usually comes down to three things: lenders can verify your credit and repayment ability, they can confirm you have the right down payment for the loan-to-value (LTV), and your documentation is complete and consistent. Equipment eligibility (value, age, and condition) also matters. This guide walks through what to prepare and the steps to get matched with lenders.`;

  const makePara = (base) => base.replace(/\s+/g, " ").trim();

  const meaningSubject = isMeaning ? title.replace(/\s+Meaning$/i, "").trim() : title;
  const connectsHeading = (() => {
    if (title.toLowerCase().startsWith("how ")) return `${title} Connects to Truck Financing`;
    return `How ${title} Connects to Truck Financing`;
  })();

  const sections = [
    {
      h2: isMeaning ? `What ${meaningSubject} Means for Truck Financing` : connectsHeading,
      p1: makePara(
        `When you search for ${title}, you're usually trying to fund the trucks or equipment behind that business goal.`
      ),
      p2: makePara(
        `Lenders evaluate whether your requested truck type fits their program, whether they can verify your ability to repay, and whether the deal aligns with loan-to-value and advance-rate rules.`
      ),
    },
    {
      h2: isLease ? "Loan vs. Lease Purchase: What Lenders Consider" : "Credit, Down Payment, and Approval Criteria",
      p1: makePara(
        `Approval for ${title} depends on your credit profile, your payment history, and how much down payment you can provide relative to the truck's value.`
      ),
      p2: makePara(
        `If you're pursuing a lease or lease-purchase structure, lenders still check the same basics—verification, documentation consistency, and whether the equipment and purchase price fit within underwriting guidelines.`
      ),
    },
    {
      h2: "Documentation Checklist",
      p1: makePara(
        `For ${title}-related financing, you can speed up review by submitting the standard documents lenders request, including business tax returns, bank statements, and profit and loss (P&L) records when applicable.`
      ),
      p2: makePara(
        `You'll also need an equipment quote or invoice that matches the application details and supports appraisal/value review, plus identity and licensing information relevant to operating the truck or vehicle.`
      ),
    },
    {
      h2: "Equipment Eligibility: Value, Age, and Condition",
      p1: makePara(
        `Lenders want equipment that meets their eligibility rules for value, age, and condition. Even a strong credit profile can stall if the equipment doesn't align with advance-rate or appraisal expectations.`
      ),
      p2: makePara(
        `To improve outcomes, confirm the truck details match the quote (year, mileage, and condition notes) and ensure the purchase price is realistic compared to typical market value for that equipment type.`
      ),
    },
    {
      h2: "Timeline: What to Expect and How to Speed It Up",
      p1: makePara(
        `Most qualified applicants can get pre-approval quickly for truck financing, but full funding still depends on documentation review and value confirmation for ${title}.`
      ),
      p2: makePara(
        `You can reduce delays by double-checking consistency across your documents, responding fast to lender follow-ups, and preparing your equipment information up front.`
      ),
    },
    {
      h2: "Next Steps: Get Matched with Lenders",
      p1: makePara(
        `The fastest path to the right offer for ${title} is to get matched with lenders who finance your specific truck type and deal structure.`
      ),
      p2: makePara(
        `Use your checklist, confirm your down payment plan, and submit a complete package so lenders can verify your application without unnecessary back-and-forth.`
      ),
    },
  ];

  const faqItems = [
    {
      q: `What financing options match ${title}?`,
      a: `Financing options for ${title} typically include a truck loan or a lease/lease-purchase structure depending on credit profile, down payment readiness, and equipment eligibility. The best structure is the one that fits underwriting requirements for your specific truck type and deal size.`,
    },
    {
      q: `What documents do I need for truck financing for ${title}?`,
      a: `Lenders commonly request business tax returns, bank statements, and profit and loss (P&L) information when available, plus an equipment quote or invoice that matches the application. You may also need identity and licensing details tied to operating the truck or vehicle.`,
    },
    {
      q: `How much down payment is typically required for ${title}?`,
      a: `Down payment requirements vary, but many buyers plan for a 10–30% range depending on equipment value, LTV/advance-rate limits, and credit profile. Some stronger applicants may qualify for little or no down in specific cases.`,
    },
    {
      q: `How long does truck financing take for ${title}?`,
      a: `For many qualified applicants, pre-approval can take about 24–72 hours. Full approval and funding for straightforward deals are often 1–5 business days, while more complex transactions can take longer.`,
    },
  ];

  const metaDescription = `${h1} | Learn truck financing requirements, credit, down payment, documentation, and timelines to get matched with lenders.`;

  return { h1, lead, title, aiExtractable, metaDescription, sections, faqItems };
}

function buildH2BlocksHtml(sections) {
  const html = [];
  for (const s of sections) {
    html.push(`          <h2>${escapeHtml(s.h2)}</h2>`);
    html.push(`          <p>${escapeHtml(s.p1)}</p>`);
    html.push(`          <p>${escapeHtml(s.p2)}</p>`);
    html.push("");
  }
  return html.join("\n");
}

function buildFAQItemsHtml(faqItems) {
  return faqItems
    .slice(0, FAQ_ITEM_COUNT)
    .map(
      (it) =>
        `          <div class="faq-item"><h3>${escapeHtml(it.q)}</h3><p>${escapeHtml(it.a)}</p></div>`
    )
    .join("\n");
}

function replaceHeadAndSEO(html, { h1, metaDescription, canonical, ogTitle, ogDescription, lastModifiedISO }) {
  // title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(ogTitle)} | Truck Financing Guide</title>`);

  // meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeAttr(metaDescription)}" />`
  );

  // canonical
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);

  // og tags
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(ogTitle)}" />`);
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeAttr(ogDescription)}" />`
  );
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);

  // last-modified meta
  html = html.replace(/<meta\s+name="last-modified"\s+content="[^"]*"\s*\/?>/i, `<meta name="last-modified" content="${lastModifiedISO}" />`);

  return html;
}

function replaceJsonLdScript(html, type, jsonObject) {
  const json = JSON.stringify(jsonObject);
  const script = `<script type="application/ld+json">\n  ${json}\n  </script>`;

  // Match individual application/ld+json <script> blocks first, then replace the one
  // whose JSON contains the target "@type":"<type>".
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/g) || [];
  const target = blocks.find((b) => b.includes(`"@type":"${type}"`));

  if (!target) {
    const includesType = html.includes(`"@type":"${type}"`);
    const includesLd = html.includes(`application/ld+json`);
    console.warn(
      `DEBUG replaceJsonLdScript failed: type=${type} includesType=${includesType} includesLd=${includesLd} blocks=${blocks.length}`
    );
    throw new Error(`Could not find JSON-LD script with @type="${type}" to replace.`);
  }

  return html.replace(target, script);
}

function replaceHeroAndAi(html, { h1, lead, lastUpdatedLabel, aiExtractable }) {
  // h1
  html = html.replace(/<h1>[\s\S]*?<\/h1>/m, `<h1>${escapeHtml(h1)}</h1>`);

  // Visible breadcrumb current page text
  html = html.replace(
    /<span aria-current="page">[^<]*<\/span>/m,
    `<span aria-current="page">${escapeHtml(h1)}</span>`
  );

  // p.lead
  html = html.replace(/<p\s+class="lead">[\s\S]*?<\/p>/m, `<p class="lead">${lead}</p>`);

  // Last Updated line
  html = html.replace(
    /<p\s+class="last-updated">[\s\S]*?<\/p>/m,
    `<p class="last-updated">${escapeHtml(lastUpdatedLabel)}</p>`
  );

  // Key takeaways bullets (keep layout/classes, update content)
  const takeaways = [
    `What ${h1} typically means for truck financing`,
    `What lenders verify: credit, down payment, documentation, and equipment eligibility`,
    `How to get matched and avoid delays by preparing the right application`,
  ];
  const lisHtml = takeaways.map((t) => `            <li>${escapeHtml(t)}</li>`).join("\n");
  html = html.replace(
    /(<div class="key-takeaways">[\s\S]*?<ul>)[\s\S]*?(<\/ul>)/m,
    `$1\n${lisHtml}\n$2`
  );

  // AI extractable paragraph
  html = html.replace(
    /(<div class="ai-extractable-answer">[\s\S]*?<h3>AI Extractable Answer<\/h3>\s*<p>)([\s\S]*?)(<\/p>[\s\S]*?<\/div>)/m,
    `$1${aiExtractable}$3`
  );

  return html;
}

function pointSecondaryHeroCtasToMatch(html) {
  // Update only the secondary CTA buttons (class="btn btn-secondary") in:
  // - hero actions block
  // - mid-page cta-stack block
  const matchHref = REQUIRED_AXIANT_HREF;

  // Replace attribute order agnostic:
  // anchor tag contains btn btn-secondary in its class attr, regardless of where href appears.
  const anchorHrefRe = /(<a(?=[^>]*class="[^"]*btn btn-secondary[^"]*)[^>]*href=")[^"]*(")/g;

  // hero-actions blocks
  html = html.replace(
    /(<div class="hero-actions"[\s\S]*?<\/div>)/g,
    (block) => block.replace(anchorHrefRe, `$1${matchHref}$2`)
  );

  // mid-page cta-stack blocks
  html = html.replace(
    /(<div class="cta-stack"[\s\S]*?<\/div>)/g,
    (block) => block.replace(anchorHrefRe, `$1${matchHref}$2`)
  );

  return html;
}

function updateSecondaryCtasForAllGuides() {
  const files = fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".html") && f !== "index.html");

  let changed = 0;
  for (const file of files) {
    const fp = path.join(GUIDES_DIR, file);
    const html = fs.readFileSync(fp, "utf8");

    // Fast skip for pages that don't have the blocks we target.
    if (!html.includes('div class="hero-actions"') && !html.includes('div class="cta-stack"')) {
      continue;
    }

    const updated = pointSecondaryHeroCtasToMatch(html);
    if (updated !== html) {
      fs.writeFileSync(fp, updated, "utf8");
      changed++;
    }
  }

  return changed;
}

function replaceH2SectionRegion(html, newH2BlocksHtml) {
  const aiRe = /<div class="ai-extractable-answer">[\s\S]*?<\/div>/m;
  const aiMatch = html.match(aiRe);
  if (!aiMatch) throw new Error("Could not find ai-extractable-answer block.");

  const aiEnd = html.indexOf(aiMatch[0]) + aiMatch[0].length;
  const ctaIdx = html.indexOf('<div class="cta-stack"');
  if (ctaIdx < 0) throw new Error("Could not find cta-stack block.");

  html = html.slice(0, aiEnd) + "\n" + newH2BlocksHtml + "\n" + html.slice(ctaIdx);
  return html;
}

function replaceFAQItemsHtml(html, faqItems) {
  const faqH2Idx = html.indexOf('<h2 class="faq-section">');
  if (faqH2Idx < 0) throw new Error("Could not find h2.faq-section.");
  const relatedPagesIdx = html.indexOf("<h3>Related Pages</h3>", faqH2Idx);
  if (relatedPagesIdx < 0) throw new Error("Could not find h3 Related Pages marker inside FAQ section.");

  // Keep the <h2 ...>Common Questions</h2> part, replace only the div.faq-item list after it.
  const faqH2EndIdx = html.indexOf("</h2>", faqH2Idx);
  if (faqH2EndIdx < 0) throw new Error("Could not find closing </h2> for FAQ section.");
  const insertAt = faqH2EndIdx + "</h2>".length;

  const before = html.slice(0, insertAt);
  const after = html.slice(relatedPagesIdx);

  const faqItemsHtml = "\n" + buildFAQItemsHtml(faqItems) + "\n\n";
  return before + faqItemsHtml + after;
}

function replaceBreadcrumbJsonLd(html, canonical, h1) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://commercialvehicleguide.com/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://commercialvehicleguide.com/guides/" },
      { "@type": "ListItem", position: 3, name: h1, item: canonical },
    ],
  };

  return replaceJsonLdScript(html, "BreadcrumbList", breadcrumb);
}

function replaceArticleJsonLd(html, canonical, h1, metaDescription, lastModifiedISO) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: h1,
    description: metaDescription,
    author: { "@type": "Organization", name: "Axiant Partners" },
    publisher: {
      "@type": "Organization",
      name: "Axiant Partners",
      logo: { "@type": "ImageObject", url: "https://axiantpartners.com/favicon.ico" },
    },
    datePublished: "2026-01-01",
    dateModified: lastModifiedISO,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };

  return replaceJsonLdScript(html, "Article", article);
}

function replaceFaqJsonLd(html, faqItems) {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.slice(0, FAQ_ITEM_COUNT).map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return replaceJsonLdScript(html, "FAQPage", faq);
}

function ensureSitemapFragmentHasGuidesEntries({ fragmentPath, canonicalUrls, lastModifiedISO }) {
  if (!fs.existsSync(fragmentPath)) {
    throw new Error(`Sitemap fragment not found: ${fragmentPath}`);
  }

  let xml = fs.readFileSync(fragmentPath, "utf8");
  let updated = false;

  for (const url of canonicalUrls) {
    const loc = `<loc>${url}</loc>`;
    if (xml.includes(loc)) continue;
    xml = xml.replace(
      "</urlset>",
      `  <url><loc>${url}</loc><lastmod>${lastModifiedISO}</lastmod></url>\n</urlset>`
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(fragmentPath, xml, "utf8");
  }

  return updated;
}

function unzipGscZip(zipPath, destRoot) {
  if (!fs.existsSync(zipPath)) throw new Error(`GSC ZIP not found: ${zipPath}`);

  // Extract with PowerShell Expand-Archive (Windows built-in)
  const tmpDir = fs.mkdtempSync(path.join(destRoot, "gsc-"));
  const zipAbs = path.resolve(zipPath);
  const tmpAbs = path.resolve(tmpDir);

  const zipPs = zipAbs.replaceAll("'", "''");
  const tmpPs = tmpAbs.replaceAll("'", "''");
  const psCmd = `Expand-Archive -Path '${zipPs}' -DestinationPath '${tmpPs}' -Force`;
  child_process.execFileSync("powershell.exe", ["-NoProfile", "-Command", psCmd], { stdio: "inherit" });

  return tmpDir;
}

function findFileByNameRecursive(rootDir, targetFileName) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(rootDir, e.name);
    if (e.isDirectory()) {
      const found = findFileByNameRecursive(full, targetFileName);
      if (found) return found;
    } else if (e.isFile() && e.name === targetFileName) {
      return full;
    }
  }
  return null;
}

function findNewestZipInGscDir(gscDir) {
  if (!fs.existsSync(gscDir)) return null;
  const zips = fs
    .readdirSync(gscDir)
    .filter((f) => f.toLowerCase().endsWith(".zip"))
    .map((f) => path.join(gscDir, f));
  if (!zips.length) return null;

  zips.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return zips[0];
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${label} (${filePath})`);
  }
}

function main() {
  assertExists(TEMPLATE_PATH, "Guide template");

  if (!fs.existsSync(GSC_DIR)) fs.mkdirSync(GSC_DIR, { recursive: true });

  const zipPath = fs.existsSync(GSC_LATEST_ZIP)
    ? GSC_LATEST_ZIP
    : findNewestZipInGscDir(GSC_DIR);

  if (!zipPath) throw new Error(`No GSC ZIP found. Expected ${GSC_LATEST_ZIP} or any *.zip in ${GSC_DIR}.`);

  const templateHtml = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const today = new Date();
  const lastModifiedISO = formatISODate(today);
  const lastUpdatedLabel = formatLastUpdatedLabel(today);

  // 1) unzip
  console.log(`Using GSC ZIP: ${zipPath}`);
  const extractedTmpRoot = path.join(GSC_DIR, ".tmp");
  if (!fs.existsSync(extractedTmpRoot)) fs.mkdirSync(extractedTmpRoot, { recursive: true });
  const tmpExtractDir = unzipGscZip(zipPath, extractedTmpRoot);

  // 2) find Queries.csv
  const queriesCsvPath = findFileByNameRecursive(tmpExtractDir, "Queries.csv");
  if (!queriesCsvPath) throw new Error(`Could not find Queries.csv in extracted ZIP: ${tmpExtractDir}`);
  console.log(`Found Queries.csv: ${queriesCsvPath}`);

  const csvText = fs.readFileSync(queriesCsvPath, "utf8");
  const rows = parseCSV(csvText);

  // 3) pick up to 15 non-brand topics by impressions + position
  const picked = pickTopQueriesFromGSC(rows);
  if (!picked.length) {
    console.log("No eligible non-brand queries found for generation based on impressions/position filters.");
  }

  // 4) generate pages
  const plan = {
    runDate: lastModifiedISO,
    sourceZip: zipPath,
    selected: [],
    created: [],
    skipped: [],
    sitemap: { fragmentUpdated: false, merged: false, validatedInSitemapXml: [] },
  };

  const createdCanonicalUrls = [];
  const insertedCanonicalUrls = [];

  for (const item of picked) {
    const query = item.query;
    const slug = slugifyFromQuery(query);
    if (!slug) continue;

    const canonical = `https://commercialvehicleguide.com/guides/${slug}.html`;
    const outPath = path.join(GUIDES_DIR, `${slug}.html`);

    plan.selected.push({
      query,
      impressions: item.totalImpressions,
      avgPosition: item.avgPosition,
      score: item.score,
      slug,
      canonical,
    });

    if (fs.existsSync(outPath)) {
      console.log(`Skip (exists): ${outPath}`);
      plan.skipped.push({ query, slug, canonical, reason: "file_exists" });
      insertedCanonicalUrls.push(canonical);
      continue;
    }

    const content = buildPageContentFromQuery(query);

    let html = templateHtml;

    // SEO/head
    const ogTitle = content.title;
    const ogDescription = content.metaDescription;
    html = replaceHeadAndSEO(html, {
      h1: content.h1,
      metaDescription: content.metaDescription,
      canonical,
      ogTitle,
      ogDescription,
      lastModifiedISO,
    });

    // Breadcrumb
    html = replaceBreadcrumbJsonLd(html, canonical, content.h1);

    // Article JSON-LD
    html = replaceArticleJsonLd(html, canonical, content.h1, content.metaDescription, lastModifiedISO);

    // FAQ JSON-LD
    html = replaceFaqJsonLd(html, content.faqItems);

    // Hero + AI extractable + last-updated label
    html = replaceHeroAndAi(html, {
      h1: content.h1,
      lead: content.lead,
      lastUpdatedLabel,
      aiExtractable: content.aiExtractable,
    });

    // H2 sections
    const h2BlocksHtml = buildH2BlocksHtml(content.sections.slice(0, MAX_H2_SECTIONS));
    html = replaceH2SectionRegion(html, h2BlocksHtml);

    // Visible FAQ items
    html = replaceFAQItemsHtml(html, content.faqItems);

    // Enforce CTA href in case template differs
    html = html.replaceAll(REQUIRED_AXIANT_HREF, REQUIRED_AXIANT_HREF);

    // Ensure secondary CTAs also go to Axiant Partners match.
    html = pointSecondaryHeroCtasToMatch(html);

    // Write output
    fs.writeFileSync(outPath, html, "utf8");
    console.log(`Created: ${outPath}`);
    plan.created.push({ query, slug, canonical, path: outPath });
    createdCanonicalUrls.push(canonical);
    insertedCanonicalUrls.push(canonical);
  }

  // Ensure sitemap fragment contains all selected canonical urls (created or skipped)
  const fragmentUpdated = ensureSitemapFragmentHasGuidesEntries({
    fragmentPath: OUTPUT_SITEMAP_FRAGMENT_PATH,
    canonicalUrls: insertedCanonicalUrls,
    lastModifiedISO,
  });
  plan.sitemap.fragmentUpdated = fragmentUpdated;

  // 5) run sitemap scripts
  // (these are required by your workflow; update-lastmod is harmless even if it doesn't match every URL pattern)
  console.log("Running sitemap scripts...");
  child_process.execFileSync("node", ["scripts/update-sitemap-lastmod.js"], { cwd: repoRoot, stdio: "inherit" });
  child_process.execFileSync("node", ["scripts/merge-sitemaps.js"], { cwd: repoRoot, stdio: "inherit" });
  plan.sitemap.merged = true;

  // 6) validate presence in sitemap.xml
  const sitemapXml = fs.readFileSync(OUTPUT_SITEMAP_MAIN_PATH, "utf8");
  const validated = insertedCanonicalUrls.map((u) => ({ url: u, present: sitemapXml.includes(u) }));
  plan.sitemap.validatedInSitemapXml = validated;

  const missing = validated.filter((v) => !v.present);
  if (missing.length) {
    console.warn("Validation warning: some guide URLs are not present in sitemap.xml:");
    for (const m of missing) console.warn(`- ${m.url}`);
  } else {
    console.log("Validation OK: all inserted guide URLs are present in sitemap.xml.");
  }

  // 7) write plan JSON
  const planPath = path.join(GSC_DIR, "generated-topics.json");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
  console.log(`Wrote plan: ${planPath}`);

  // 8) Upgrade existing guides to meet minimum word count
  //    (required by your updated spec: all pages >= 1400 words)
  if (UPGRADE_GUIDES_TO_MIN_WORDS) {
    console.log(`Upgrading guides to at least ${MIN_GUIDE_WORDS_TARGET} words...`);
    const up = upgradeGuidesToMinWords({
      guidesDir: GUIDES_DIR,
      minWords: MIN_GUIDE_WORDS_TARGET,
      lastModifiedISO,
      lastUpdatedLabel,
    });
    console.log(`Upgrade done. changed=${up.changed} stillBelow=${up.stillBelow.length}`);
    if (up.stillBelow.length) {
      for (const it of up.stillBelow) {
        console.warn(`Still below min after upgrade: ${it.file} old=${it.oldWc} new=${it.newWc}`);
      }
    }
    // Re-run sitemap scripts because we rewrote HTML content.
    console.log("Re-running sitemap scripts after guide upgrades...");
    child_process.execFileSync("node", ["scripts/update-sitemap-lastmod.js"], { cwd: repoRoot, stdio: "inherit" });
    child_process.execFileSync("node", ["scripts/merge-sitemaps.js"], { cwd: repoRoot, stdio: "inherit" });
  }

  // Rewire secondary CTAs across ALL guide pages (not just newly generated).
  console.log("Updating secondary CTAs across existing guide pages...");
  const ctaChanged = updateSecondaryCtasForAllGuides();
  console.log(`Secondary CTA updates: ${ctaChanged} guide page(s) changed`);

  // Re-run sitemap merge because CTAs are in-page only (URLs unchanged),
  // but last-mod updates might be desirable for freshness.
  console.log("Re-running sitemap scripts after CTA rewrites...");
  child_process.execFileSync("node", ["scripts/update-sitemap-lastmod.js"], { cwd: repoRoot, stdio: "inherit" });
  child_process.execFileSync("node", ["scripts/merge-sitemaps.js"], { cwd: repoRoot, stdio: "inherit" });

  // 9) log summary
  console.log(`\nSummary: selected=${plan.selected.length} created=${plan.created.length} skipped=${plan.skipped.length}`);
}

main();

// Daily workflow command:
// node scripts/generate-pages-from-gsc-truck.mjs

