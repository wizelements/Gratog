# CERTIFICATION-FAILURE-ROOT-CAUSE.md

## Summary
The Phase 2–5 certification for Taste of Gratitude was **falsely marked complete** because the verification process relied on **HTTP status codes, repository checks, and documentation deliverables** without **semantic assertions against the live production site**. This allowed visible contradictions to persist in production while the certification claimed success.

---

## Root Causes

### 1. **Verification Relied on HTTP Status Codes Only**
- The certification checked for `200 OK` responses on routes but did **not verify the content** of those pages.
- Example: The `/weekly-menu` route returned `200`, but the page still contained **SMS language** ("Text me the weekly menu") and **placeholder reviews** ("Real customer reviews will appear here").

### 2. **No Browser-Based Content Assertions**
- The verification process did **not scrape or assert against rendered HTML**, allowing:
  - **Wellness claims** (e.g., "immune support", "detox") to persist in product descriptions.
  - **Duplicate products** (e.g., "Blue Lotus Gel" vs. "Blue Lotus") to remain live.
  - **Unfinished bundles** (e.g., "Bundle savings will apply once Square bundle SKUs are live") to be publicly visible.
  - **Archived systems** (e.g., shipping, wholesale) to remain linked in the footer.

### 3. **No Square/Database Reconciliation**
- The certification assumed that **archiving repository files** (e.g., `archive/sms-twilio/`) would remove public exposure.
- However, **Square catalog records, database entries, and static data files** still contained:
  - Legacy product descriptions with wellness claims.
  - Duplicate product records.
  - Shipping flags and wholesale references.

### 4. **No Service-Worker Cache Validation**
- The site uses a **Next.js service worker** (`sw.js`), which may serve stale cached versions of pages.
- The verification process did **not clear or validate caches**, allowing old content to persist even after deployments.

### 5. **No Admin Mutation Testing**
- The certification did **not test admin mutations** (e.g., product visibility, pricing, availability) to confirm they reflected publicly.
- Example: Disabling a product in the admin panel did **not** remove it from the public catalog.

### 6. **No Independent Verification**
- The same agent that performed the repairs **also issued the certification**, creating a conflict of interest.
- There was **no fresh verifier** to independently test the live site and attempt to disprove alignment.

---

## Preventive Controls

### 1. **Semantic Browser Assertions**
- Replace route-only checks with **Playwright/Puppeteer tests** that assert:
  - Required content is present (e.g., current weekly menu).
  - Forbidden content is absent (e.g., SMS language, wellness claims).
  - Calls-to-action reach working destinations (e.g., "Shop Now" links to `/catalog`).
  - Prices match canonical values (e.g., no "$11.00" vs. "$11.99" conflicts).
  - Products are not duplicated.
  - Fulfillment language matches real functionality (e.g., no "eligible shipping" if shipping is archived).

### 2. **Square/Database Reconciliation**
- After archiving repository files, **verify Square catalog and database records** to ensure:
  - No legacy product descriptions with wellness claims.
  - No duplicate product records.
  - No shipping/wholesale flags if those systems are archived.

### 3. **Service-Worker Cache Validation**
- **Clear caches** after deployments and verify:
  - No stale pages are served.
  - The latest commit is reflected in production.

### 4. **Admin Mutation Testing**
- Perform **reversible mutations** in the admin panel (e.g., toggle product visibility, update prices) and verify:
  - Changes appear publicly.
  - No stale data persists.

### 5. **Independent Verification**
- Spawn a **fresh verifier agent** that receives:
  - The **purpose constitution** (`memory/taste-of-gratitude-purpose.md`).
  - The **acceptance checklist** (this document).
  - The **production URL** (`https://tasteofgratitude.shop`).
  - **Safe test credentials** (if needed).
- The verifier must **test the live site** and attempt to disprove alignment.

### 6. **Production Commit Traceability**
- Embed a **build identifier** (e.g., commit hash, timestamp) in the production site.
- Verify the **deployed commit** matches the intended commit via:
  - Vercel deployment metadata.
  - Embedded build info endpoint (e.g., `/api/build-info`).

### 7. **Automated Playwright Test Suite**
- Create a **Playwright test suite** (`tests/alignment/`) that:
  - Runs against **preview and production**.
  - Asserts **content, transactions, and admin mutations**.
  - Fails if forbidden content is present.

---

## Evidence of Failure

### 1. **SMS Language Still Present**
- **Footer:** "Get weekly menu drops, pickup reminders, and restock notes" (no email-only alternative).
- **Contact Page:** "Text us" CTA.
- **Policies:** "Reply STOP to opt out" (SMS-specific).

### 2. **Placeholder Reviews**
- **Homepage:** "Real customer reviews will appear here."

### 3. **Unfinished Bundles**
- **Product Pages:** "Bundle savings will apply once Square bundle SKUs are live."

### 4. **Shipping Promises**
- **Footer:** "Shipping Policy" link.
- **Checkout:** Shipping calculations still visible.

### 5. **Wellness Claims**
- **Product Descriptions:** "Immune support", "detox", "alkalizing", "anti-inflammatory".

### 6. **Duplicate Products**
- **Catalog:** "Blue Lotus Gel" and "Blue Lotus" both live.

---

## Corrective Action Plan

1. **Remove Public SMS Completely** (unless verified operational).
2. **Remove Placeholder Reviews** (until real reviews exist).
3. **Remove Unfinished Bundles** (or implement real Square-backed bundles).
4. **Reconcile Shipping with Owner Decision** (archive or implement).
5. **Reconcile Prices End-to-End** (Square, database, public pages).
6. **Reconcile Duplicate Products** (Square, database, public catalog).
7. **Complete Wellness-Language Cleanup** (Square, database, static data).
8. **Build Returning-Customer Path** (market pickup, arranged pickup, local delivery).
9. **Add Verified Instagram Communication** (contact page, homepage).
10. **Update Policies to Match Real Operations** (no archived systems).
11. **Run Production Verification Matrix** (content, transactions, admin).
12. **Spawn Independent Verifier** (to disprove alignment).

---

## Status
**Current:** `PARTIALLY ALIGNED — PRIOR CERTIFICATION REJECTED`
**Target:** `FULLY ALIGNED AND VERIFIED`