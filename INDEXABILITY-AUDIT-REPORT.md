# Indexability & Content Quality Audit Report
**Site:** Commercial Vehicle Guide (Axiant Truck Financing Baseline)  
**Date:** March 12, 2026

---

## 1. Pages That Are Strong and Clearly Indexable

These pages meet indexable standards (unique title, meta, H1, AI Extractable Answer, Quick Answer, tables, FAQ, 5+ internal links):

- **index.html** – Homepage, strong hub
- **All vehicles/** pages (45+) – Full vehicle financing pages with rich content
- **All business-guides/** pages (45+) – Startup guides with HowTo schema, FAQs
- **All equipment-costs/** pages (20+) – Cost guides with tables
- **All hubs/** pages (6) – Commercial vehicle, truck, vocational, specialty, heavy-duty, equipment
- **All industries/** pages (10) – Industry-specific financing
- **All guides/** pages (12) – How-to guides
- **All questions/** pages (20) – Licensing, credit, documents
- **All comparisons/** pages (4) – Vehicle comparisons
- **All vehicle-index/** pages (6) – Category indexes
- **All data/** pages (9) – Cost data, charts
- **glossary/index.html** and **glossary/** term pages – Definitions
- **get-started.html** – CTA/conversion page, distinct purpose

---

## 2. Pages That May Be Thin or Redundant

| Page | Issue | Recommendation |
|------|-------|----------------|
| **Root baseline pages** (semi-truck-financing.html, dump-truck-financing.html, box-truck-financing.html, vac-truck-financing.html, tow-truck-financing.html, bucket-truck-financing.html, service-truck-financing.html) | Thin stub content; duplicate intent with vehicles/ versions; generic "Baseline" meta descriptions | Add canonical to vehicles/ version; improve meta descriptions |
| **truck-financing-for-construction-companies.html** | Duplicate intent with industries/construction-truck-financing.html; stub H1 "Support Truck Financing Pages" | Add canonical to industries/ version; update internal links |
| **truck-financing-for-utility-contractors.html** | Duplicate intent with industries/utility-contractor-truck-financing.html | Add canonical to industries/ version |
| **truck-financing-for-environmental-services.html** | Duplicate intent with industries/environmental-service-vehicle-financing.html | Add canonical to industries/ version |
| **fleet-truck-financing.html** | Generic "Baseline" meta description | Improve meta description; page is unique (fleet vs trucking company) |

---

## 3. Pages That Should Be Improved Before Indexing

- **Root baseline vehicle pages** – Either redirect to vehicles/ or add canonical + improve meta. Canonical preferred to avoid redirect chains.
- **fleet-truck-financing.html** – Replace "Baseline fleet truck financing page starter" meta with unique, descriptive copy.

---

## 4. Pages That Should Be Noindexed, Merged, or Redirected

| Page | Action |
|------|--------|
| Root semi-truck-financing.html, dump-truck-financing.html, box-truck-financing.html, vac-truck-financing.html, tow-truck-financing.html, bucket-truck-financing.html, service-truck-financing.html | **Canonical** to vehicles/ version (no noindex; canonical consolidates) |
| truck-financing-for-construction-companies.html | **Canonical** to industries/construction-truck-financing.html |
| truck-financing-for-utility-contractors.html | **Canonical** to industries/utility-contractor-truck-financing.html |
| truck-financing-for-environmental-services.html | **Canonical** to industries/environmental-service-vehicle-financing.html |

**Note:** Canonical is preferred over noindex for duplicate content—Google consolidates to the canonical URL. Noindex would hide the page entirely; canonical keeps it crawlable but attributes value to the preferred page.

---

## 5. Orphan Pages or Weak Crawl Paths

| Page | Status |
|------|--------|
| Root baseline vehicle pages | Linked from each other (root-to-root) but **index.html links to vehicles/**, not root. Weak. Canonical fixes this. |
| equipment-costs/charter-bus, limousine, crop-duster, agricultural-tractor, agricultural-sprayer, under-bridge-inspection-unit | In equipment-costs/index.html; **not in main index.html** equipment cards. Acceptable—"View all" links to equipment-costs/. |
| get-started.html | Linked from root baseline pages and CTA buttons. Adequate. |

**Recommendation:** Update root baseline pages' internal links to point to **vehicles/** and **industries/** instead of root duplicates, so users and crawlers follow strong content.

---

## 6. Duplicate or Overlapping Search Intents

| Intent | Pages | Resolution |
|--------|-------|------------|
| Semi truck financing | semi-truck-financing.html (root) vs vehicles/semi-truck-financing.html | Canonical to vehicles/ |
| Dump truck financing | dump-truck-financing.html (root) vs vehicles/dump-truck-financing.html | Canonical to vehicles/ |
| Construction truck financing | truck-financing-for-construction-companies.html vs industries/construction-truck-financing.html | Canonical to industries/ |
| Utility contractor financing | truck-financing-for-utility-contractors.html vs industries/utility-contractor-truck-financing.html | Canonical to industries/ |
| Environmental services financing | truck-financing-for-environmental-services.html vs industries/environmental-service-vehicle-financing.html | Canonical to industries/ |

---

## 7. Specific Fixes Implemented

### Indexability
- [x] Add canonical tags to root baseline pages → vehicles/
- [x] Add canonical tags to truck-financing-for-* → industries/
- [x] Replace generic "Baseline" meta descriptions on root pages with unique copy
- [x] Add robots.txt
- [x] Add sitemap.xml
- [x] Update internal links in root baseline pages to point to vehicles/ and industries/

### Quality Threshold (Phase 2)
- [x] **Remove weak pages; use 301 redirects only:** Root vehicle pages and truck-financing-for-* deleted. Server-side 301 redirects in `_redirects` (Cloudflare Pages). No meta refresh, no redirect HTML files.
- [x] **Index link update:** index.html now links directly to guides/commercial-fleet-financing-guide.html
- [x] **Sitemap:** Excludes noindex redirect pages
- [x] **_redirects file:** Added for Netlify (301 redirects) — use server config for proper SEO redirects
- [x] **get-started.html:** Fixed typos (? → –), added vehicle links in table, added Fleet Financing Guide link

### Content Quality
- [x] Fix typo in truck-financing-for-construction-companies.html ("$80 and $200" → "$80k and $200k")
- [x] Fix industries/construction-truck-financing.html Key Takeaways ("12-24 months" → "36-84 months" for terms)

---

## 8. Technical Indexing Summary

| Item | Status |
|------|--------|
| noindex/robots meta | None found; all pages indexable |
| Canonical tags | Added to duplicate/stub pages |
| robots.txt | Created |
| sitemap.xml | Created |
| Duplicate titles | None |
| Duplicate meta descriptions | None (after fixes) |
| Orphan pages | 0 (after canonical + link updates) |

---

## 9. Sitewide Indexing Strategy

**SHOULD be indexed:**
- index.html, get-started.html
- All vehicles/, business-guides/, equipment-costs/, hubs/, industries/, guides/, questions/, comparisons/, vehicle-index/, data/, glossary/

**Canonical (consolidate to preferred URL):**
- Root vehicle pages → vehicles/
- truck-financing-for-* → industries/

**fleet-truck-financing.html:** Keep indexed; unique fleet financing intent. Meta improved.
