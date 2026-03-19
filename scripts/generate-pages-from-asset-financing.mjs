import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");

const GUIDES_DIR = path.join(repoRoot, "guides");
const TEMPLATE_PATH = path.join(GUIDES_DIR, "reasons-truck-loan-application-denied.html");

const REQUIRED_AXIANT_HREF = "https://axiantpartners.com/match?ref=commercialvehicleguide";

const OUTPUT_SITEMAP_FRAGMENT_PATH = path.join(repoRoot, "sitemap-guides.xml");
const OUTPUT_SITEMAP_MAIN_PATH = path.join(repoRoot, "sitemap.xml");

const MIN_GUIDE_WORDS_TARGET = 1400;
const MAX_H2_SECTIONS = 6;
const FAQ_ITEM_COUNT = 4;

function formatISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatLastUpdatedLabel(d) {
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `Last Updated: ${month} ${year}`;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAttr(text) {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function countWordsFromHtml(html) {
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

function updateLastModifiedFields(html, lastModifiedISO, lastUpdatedLabel) {
  html = html.replace(/<meta\s+name="last-modified"\s+content="[^"]*"\s*\/?>/i, `<meta name="last-modified" content="${lastModifiedISO}" />`);
  html = html.replace(/<p\s+class="last-updated">[^<]*<\/p>/i, `<p class="last-updated">${escapeHtml(lastUpdatedLabel)}</p>`);
  html = html.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(")/g, `$1${lastModifiedISO}$2`);
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
          `Asset eligibility matters just as much as financing terms. For ${h1Text}, confirm the vessel/aircraft details align with lender guidelines and appraisal expectations.`
        )} ${escapeHtml(
          `Used or specialty equipment can be harder to value, which may reduce the lender’s advance rate and increase the required equity.`
        )} ${escapeHtml(
          `If your offer is denied, ask which verification step or value condition failed, then reassemble a complete and consistent package before applying again.`
        )}</p>`
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

function ensureMinWordsInFile({ html, h1Text, lastModifiedISO, lastUpdatedLabel, minWords }) {
  let currentHtml = html;
  let currentWc = countWordsFromHtml(currentHtml);
  if (currentWc >= minWords) return { html: currentHtml, words: currentWc, changed: false };

  const requiredContextLinks = {
    credit: `<a href="../questions/what-credit-score-needed-for-truck-financing.html">credit score requirements</a>`,
    downPayment: `<a href="truck-down-payment-requirements.html">down payment requirements</a>`,
    docs: `<a href="../questions/what-documents-needed-for-truck-financing.html">documents needed for truck financing</a>`,
  };

  let changed = false;
  for (const pass of [1, 2]) {
    if (currentWc >= minWords) break;
    const hasPass1 = currentHtml.includes('data-minwords-extra-pass="1"');
    const hasPass2 = currentHtml.includes('data-minwords-extra-pass="2"');
    if (pass === 1 && hasPass1) continue;
    if (pass === 2 && hasPass2) continue;

    const ctaIdx = currentHtml.indexOf('<div class="cta-stack"');
    if (ctaIdx < 0) break;

    const deficit = minWords - currentWc;
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

    currentHtml = currentHtml.slice(0, ctaIdx) + extraParasHtml + "\n" + currentHtml.slice(ctaIdx);
    currentHtml = updateLastModifiedFields(currentHtml, lastModifiedISO, lastUpdatedLabel);
    currentWc = countWordsFromHtml(currentHtml);
    changed = true;
  }

  return { html: currentHtml, words: currentWc, changed };
}

function replaceJsonLdScript(html, type, jsonObject) {
  const json = JSON.stringify(jsonObject);
  const script = `<script type="application/ld+json">\n  ${json}\n  </script>`;

  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/g) || [];
  const target = blocks.find((b) => b.includes(`"@type":"${type}"`));

  if (!target) {
    const includesType = html.includes(`"@type":"${type}"`);
    const includesLd = html.includes("application/ld+json");
    console.warn(`DEBUG replaceJsonLdScript failed: type=${type} includesType=${includesType} includesLd=${includesLd} blocks=${blocks.length}`);
    throw new Error(`Could not find JSON-LD script with @type="${type}" to replace.`);
  }

  return html.replace(target, script);
}

function replaceHeadAndSEO(html, { h1, metaDescription, canonical, ogTitle, ogDescription, lastModifiedISO, titleSuffix }) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(ogTitle)} | ${escapeHtml(titleSuffix)}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeAttr(metaDescription)}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);

  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(ogTitle)}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(ogDescription)}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);

  html = html.replace(/<meta\s+name="last-modified"\s+content="[^"]*"\s*\/?>/i, `<meta name="last-modified" content="${lastModifiedISO}" />`);
  return html;
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

function replaceHeroAndAi(html, { h1, lead, lastUpdatedLabel, aiExtractable, keyTakeaways }) {
  html = html.replace(/<h1>[\s\S]*?<\/h1>/m, `<h1>${escapeHtml(h1)}</h1>`);
  html = html.replace(/<span aria-current="page">[^<]*<\/span>/m, `<span aria-current="page">${escapeHtml(h1)}</span>`);
  html = html.replace(/<p\s+class="lead">[\s\S]*?<\/p>/m, `<p class="lead">${lead}</p>`);
  html = html.replace(/<p\s+class="last-updated">[\s\S]*?<\/p>/m, `<p class="last-updated">${escapeHtml(lastUpdatedLabel)}</p>`);

  const lisHtml = keyTakeaways.map((t) => `            <li>${escapeHtml(t)}</li>`).join("\n");
  html = html.replace(/(<div class="key-takeaways">[\s\S]*?<ul>)[\s\S]*?(<\/ul>)/m, `$1\n${lisHtml}\n$2`);

  html = html.replace(
    /(<div class="ai-extractable-answer">[\s\S]*?<h3>AI Extractable Answer<\/h3>\s*<p>)([\s\S]*?)(<\/p>[\s\S]*?<\/div>)/m,
    `$1${aiExtractable}$3`
  );

  return html;
}

function replaceH2SectionRegion(html, newH2BlocksHtml) {
  const aiRe = /<div class="ai-extractable-answer">[\s\S]*?<\/div>/m;
  const aiMatch = html.match(aiRe);
  if (!aiMatch) throw new Error("Could not find ai-extractable-answer block.");

  const aiEnd = html.indexOf(aiMatch[0]) + aiMatch[0].length;
  const ctaIdx = html.indexOf('<div class="cta-stack"');
  if (ctaIdx < 0) throw new Error("Could not find cta-stack block.");

  return html.slice(0, aiEnd) + "\n" + newH2BlocksHtml + "\n" + html.slice(ctaIdx);
}

function replaceFAQItemsHtml(html, faqItems) {
  const faqH2Idx = html.indexOf('<h2 class="faq-section">');
  if (faqH2Idx < 0) throw new Error("Could not find h2.faq-section.");
  const relatedPagesIdx = html.indexOf("<h3>Related Pages</h3>", faqH2Idx);
  if (relatedPagesIdx < 0) throw new Error("Could not find h3 Related Pages marker inside FAQ section.");

  const faqH2EndIdx = html.indexOf("</h2>", faqH2Idx);
  if (faqH2EndIdx < 0) throw new Error("Could not find closing </h2> for FAQ section.");

  const insertAt = faqH2EndIdx + "</h2>".length;
  const before = html.slice(0, insertAt);
  const after = html.slice(relatedPagesIdx);

  const faqItemsHtml = "\n" + buildFAQItemsHtml(faqItems) + "\n\n";
  return before + faqItemsHtml + after;
}

function buildFAQItemsHtml(faqItems) {
  return faqItems
    .slice(0, FAQ_ITEM_COUNT)
    .map((it) => `          <div class="faq-item"><h3>${escapeHtml(it.q)}</h3><p>${escapeHtml(it.a)}</p></div>`)
    .join("\n");
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

function pointSecondaryHeroCtasToMatch(html) {
  const matchHref = REQUIRED_AXIANT_HREF;
  const anchorHrefRe = /(<a(?=[^>]*class="[^"]*btn btn-secondary[^"]*)[^>]*href=")[^"]*(")/g;

  html = html.replace(/(<div class="hero-actions"[\s\S]*?<\/div>)/g, (block) => block.replace(anchorHrefRe, `$1${matchHref}$2`));
  html = html.replace(/(<div class="cta-stack"[\s\S]*?<\/div>)/g, (block) => block.replace(anchorHrefRe, `$1${matchHref}$2`));
  return html;
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${label} (${filePath})`);
}

function ensureSitemapFragmentHasGuidesEntries({ fragmentPath, canonicalUrls, lastModifiedISO }) {
  if (!fs.existsSync(fragmentPath)) throw new Error(`Sitemap fragment not found: ${fragmentPath}`);
  let xml = fs.readFileSync(fragmentPath, "utf8");
  let updated = false;

  for (const url of canonicalUrls) {
    const loc = `<loc>${url}</loc>`;
    if (xml.includes(loc)) continue;
    xml = xml.replace("</urlset>", `  <url><loc>${url}</loc><lastmod>${lastModifiedISO}</lastmod></url>\n</urlset>`);
    updated = true;
  }

  if (updated) fs.writeFileSync(fragmentPath, xml, "utf8");
  return updated;
}

function buildAssetContent({ assetType, title }) {
  const h1 = title;
  const assetLabel = assetType === "boat" ? "boat" : "aircraft";
  const assetPlural = assetType === "boat" ? "boats" : "aircrafts";
  const area = assetType === "boat" ? "marine vessel" : "aircraft";
  const titleSuffix = assetType === "boat" ? "Boat Financing Guide" : "Aircraft Financing Guide";

  const lead = `If you're searching for ${escapeHtml(h1)}, this guide explains how commercial ${area} financing typically works for businesses like yours. You'll learn what lenders verify (credit profile, down payment, and documentation), how asset eligibility affects approvals, and what to prepare before you get matched with lenders.`;

  const aiExtractable = `Commercial financing for ${escapeHtml(h1)} usually comes down to three things: lenders can verify your credit and repayment ability, they can confirm you have the right down payment for the loan-to-value (LTV) and advance-rate limits, and your documentation is complete and consistent. Asset eligibility (value, condition, registrations, and appraisals) also matters.`;

  const metaDescription = `${h1} | Learn ${assetPlural} financing requirements, credit, down payment, documentation, and timelines to get matched with lenders.`;

  // Asset-specific, but general enough to cover many lender programs.
  const sections = [
    {
      h2: `Asset Value, Condition, and Eligibility`,
      p1: `Lenders evaluate whether your ${assetLabel} fits their underwriting rules. That includes appraised value, build/model details, maintenance and condition records, and whether the asset can be reliably valued for collateral purposes. If the purchase price looks high relative to appraised value, lenders may approve a smaller advance rate or require more equity upfront.`,
      p2: `For commercial transactions, lenders often want proof the asset is insurable, legally usable, and appropriately registered for the intended operation. Missing or inconsistent condition documentation can slow approval, because underwriters need confidence that the collateral matches the deal terms. Preparing a clean asset packet helps reduce back-and-forth and can improve approval speed.`,
    },
    {
      h2: `Credit and Repayment Readiness`,
      p1: `Even for asset-backed lending, lenders still verify repayment ability. They review credit profile, payment history, and business stability to estimate whether the business can fund required payments through the term. If your credit profile is borderline, lenders may still approve but adjust terms, require a larger down payment, or limit the maximum loan amount.`,
      p2: `To strengthen your application, compare your credit report and current obligations to what lenders typically look for. If you have recent derogatories or late payments, address errors, pay down revolving balances when possible, and document business cash flow that supports the new payment. The clearer your repayment story, the smoother underwriting typically becomes.`,
    },
    {
      h2: `Down Payment, LTV, and Advance Rate`,
      p1: `Down payment requirements are tied to lender risk and the loan-to-value (LTV) limits on the collateral. If the lender can only advance a percentage of the ${assetLabel}'s appraised value, you need enough cash to cover the gap. Used or specialty assets often face lower advance rates because appraisal risk is higher.`,
      p2: `If you want better terms, plan your down payment early. A larger down payment can reduce the monthly payment, improve debt-service coverage, and lower the chance of approval delays. When you're close to the required amount, even a short savings plan can turn a tentative approval into a final approval.`,
    },
    {
      h2: `Documentation Checklist for Underwriting`,
      p1: `Lenders expect a consistent set of documents that match the application details. Common items include proof of ownership/identity, financing application forms, business financials (such as tax returns and bank statements), and the transaction paperwork for the ${assetLabel}. For many deals, the lender also asks for insurance information and appraisal or valuation support.`,
      p2: `Prepare your documentation so it is internally consistent: names, addresses, and financial figures should match across statements and forms. If any section is incomplete or conflicting, underwriters may pause the file while they request corrections. A documentation checklist reduces delays and helps lenders move faster from underwriting to funding.`,
    },
    {
      h2: assetType === "boat" ? "Lease vs. Loan: What Lenders Consider" : "Lease vs. Loan Purchase: What Lenders Consider",
      p1: `Your structure matters. Whether you pursue a loan, a lease, or a lease-purchase arrangement, lenders still evaluate credit, documentation accuracy, and whether the asset and purchase price fit underwriting guidelines. Lease-based products may shift how the lender values collateral, but they still need reliable documentation and repayment confidence.`,
      p2: `To choose the best structure, compare the total cost over time, expected maintenance or operating realities, and how terms change when your down payment or credit profile varies. If you want flexibility, focus on lenders that support the arrangement that matches your business model and cash flow goals.`,
    },
    {
      h2: `Next Steps: Get Matched with Lenders`,
      p1: `The fastest path to the right offer for ${escapeHtml(h1)} is to get matched with lenders that finance assets like yours. When your asset packet is ready and your documents are consistent, lenders can verify your details with fewer interruptions.`,
      p2: `Before you submit, confirm your down payment plan, gather the core underwriting documents, and ensure the collateral details match the deal terms. Once you are matched, you can compare options and move forward with a structure that fits your budget.`,
    },
  ];

  const faqItems = [
    {
      q: `What financing options match ${h1}?`,
      a: `Most lenders that finance commercial ${assetPlural} evaluate credit profile, down payment readiness, and documentation completeness. Depending on your collateral and deal structure, you may qualify for an asset-backed loan, a lease, or a lease-purchase arrangement.`,
    },
    {
      q: `What documents do I need for ${assetPlural} financing?`,
      a: `Lenders commonly request business identity information, tax returns and/or bank statements, application forms, and transaction documents for the ${assetLabel}. Many deals also require insurance information and valuation or appraisal support so underwriting can confirm the asset fits the collateral requirements.`,
    },
    {
      q: `How much down payment is typically required for ${h1}?`,
      a: `Down payment requirements vary by lender and the asset's appraised value. Many applicants plan for a meaningful down payment because LTV/advance-rate limits determine how much cash the lender can advance. Better credit and stronger asset value support can help reduce the required equity.`,
    },
    {
      q: `How long does financing usually take for ${h1}?`,
      a: `If documents are ready and the asset packet is complete, pre-approval can move within a short window and full approval/funding can follow after underwriting and collateral validation. Deal complexity and documentation gaps are usually the biggest factors that affect timing.`,
    },
  ];

  const keyTakeaways = [
    `Asset value, condition, and eligibility strongly influence approval decisions`,
    `Credit and repayment readiness still matter even for asset-backed lending`,
    `A complete documentation packet can reduce delays and speed up funding`,
  ];

  return { h1, lead, aiExtractable, metaDescription, sections, faqItems, titleSuffix, keyTakeaways };
}

function main() {
  assertExists(TEMPLATE_PATH, "Guide template");
  if (!fs.existsSync(GUIDES_DIR)) fs.mkdirSync(GUIDES_DIR, { recursive: true });

  const today = new Date();
  const lastModifiedISO = formatISODate(today);
  const lastUpdatedLabel = formatLastUpdatedLabel(today);

  const topics = [
    // Boats (5)
    { assetType: "boat", title: "Commercial Boat Financing Requirements", slug: "commercial-boat-financing-requirements" },
    { assetType: "boat", title: "How to Finance a Yacht for Business", slug: "how-to-finance-a-yacht-for-business" },
    { assetType: "boat", title: "Boat Lease vs Loan: What Lenders Consider", slug: "boat-lease-vs-loan" },
    { assetType: "boat", title: "Boat Financing Documentation Checklist", slug: "boat-financing-documentation-checklist" },
    { assetType: "boat", title: "Common Reasons Commercial Boat Financing Gets Denied", slug: "common-reasons-commercial-boat-financing-gets-denied" },

    // Planes (5)
    { assetType: "aircraft", title: "Aircraft Financing Requirements for Business Owners", slug: "aircraft-financing-requirements-for-business" },
    { assetType: "aircraft", title: "How to Finance a Private Jet for a Company", slug: "how-to-finance-a-private-jet-for-a-company" },
    { assetType: "aircraft", title: "Aircraft Lease vs Loan Purchase: Underwriting Factors", slug: "aircraft-lease-vs-loan-purchase" },
    { assetType: "aircraft", title: "Aircraft Down Payment Requirements", slug: "aircraft-down-payment-requirements" },
    { assetType: "aircraft", title: "Common Reasons Aircraft Financing Gets Denied", slug: "common-reasons-aircraft-financing-gets-denied" },
  ];

  const templateHtml = fs.readFileSync(TEMPLATE_PATH, "utf8");

  const created = [];
  const skipped = [];
  const canonicalUrls = [];

  for (const t of topics) {
    const canonical = `https://commercialvehicleguide.com/guides/${t.slug}.html`;
    const outPath = path.join(GUIDES_DIR, `${t.slug}.html`);

    if (fs.existsSync(outPath)) {
      skipped.push({ title: t.title, slug: t.slug, reason: "file_exists" });
      canonicalUrls.push(canonical); // treat as present
      continue;
    }

    const content = buildAssetContent({ assetType: t.assetType, title: t.title });

    let html = templateHtml;

    html = replaceHeadAndSEO(html, {
      h1: content.h1,
      metaDescription: content.metaDescription,
      canonical,
      ogTitle: content.h1,
      ogDescription: content.metaDescription,
      lastModifiedISO,
      titleSuffix: content.titleSuffix,
    });

    html = replaceBreadcrumbJsonLd(html, canonical, content.h1);
    html = replaceArticleJsonLd(html, canonical, content.h1, content.metaDescription, lastModifiedISO);
    html = replaceFaqJsonLd(html, content.faqItems);

    html = replaceHeroAndAi(html, {
      h1: content.h1,
      lead: content.lead,
      lastUpdatedLabel,
      aiExtractable: content.aiExtractable,
      keyTakeaways: content.keyTakeaways,
    });

    const h2BlocksHtml = buildH2BlocksHtml(content.sections.slice(0, MAX_H2_SECTIONS));
    html = replaceH2SectionRegion(html, h2BlocksHtml);
    html = replaceFAQItemsHtml(html, content.faqItems);

    html = pointSecondaryHeroCtasToMatch(html);

    const minRes = ensureMinWordsInFile({
      html,
      h1Text: content.h1,
      lastModifiedISO,
      lastUpdatedLabel,
      minWords: MIN_GUIDE_WORDS_TARGET,
    });
    html = minRes.html;

    fs.writeFileSync(outPath, html, "utf8");
    created.push({ title: t.title, slug: t.slug, words: minRes.words });
    canonicalUrls.push(canonical);
  }

  // Update sitemap fragments (only the newly created ones is fine, but canonicalUrls includes skipped too)
  ensureSitemapFragmentHasGuidesEntries({
    fragmentPath: OUTPUT_SITEMAP_FRAGMENT_PATH,
    canonicalUrls,
    lastModifiedISO,
  });

  // Refresh sitemap lastmod + merge
  child_process.execFileSync("node", ["scripts/update-sitemap-lastmod.js"], { cwd: repoRoot, stdio: "inherit" });
  child_process.execFileSync("node", ["scripts/merge-sitemaps.js"], { cwd: repoRoot, stdio: "inherit" });

  const summary = {
    lastModifiedISO,
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
    validated: canonicalUrls.map((u) => ({ url: u, presentInSitemapXml: fs.readFileSync(OUTPUT_SITEMAP_MAIN_PATH, "utf8").includes(u) })),
  };

  fs.writeFileSync(path.join(repoRoot, "gsc", "generated-asset-pages.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log(`\nDone. created=${created.length} skipped=${skipped.length}`);
}

main();

