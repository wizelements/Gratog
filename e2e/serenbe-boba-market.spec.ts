/**
 * Serenbe Markets Only – Boba E2E Tests
 *
 * Validates the full "Serenbe Markets Only" creative marketing flow:
 * 1. API enrichment: boba products get marketExclusive flag
 * 2. Catalog: purple "🎪 Serenbe Markets Only" badge on boba cards
 * 3. Catalog: "Boba" category filter works
 * 4. Product detail: "Serenbe Farmers Market Exclusive" banner + pickup info
 * 5. Homepage hero: Boba Market Exclusive teaser + CTA link
 * 6. Homepage hero: "🧋 Boba at the Market" rotating headline
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Known boba product name substrings that the enrichment pipeline should flag
const BOBA_PRODUCT_NAMES = [
  'Boba', 'Taro Boba', 'Strawberry Matcha', 'Strawberry Milk Tea',
  'Brown Sugar', 'Vanilla Bean'
];

// ─── API Enrichment ──────────────────────────────────────────────────────────

test.describe('API: Boba product enrichment', () => {

  test('boba products have marketExclusive flag and label', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/products`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.products.length).toBeGreaterThan(0);

    const bobaProducts = data.products.filter((p: any) =>
      BOBA_PRODUCT_NAMES.some(name =>
        (p.name || '').toLowerCase().includes(name.toLowerCase())
      )
    );

    // Ensure we actually found boba products in the catalog
    expect(bobaProducts.length).toBeGreaterThan(0);

    for (const product of bobaProducts) {
      expect(product.marketExclusive, `${product.name} should be marketExclusive`).toBe(true);
      expect(
        product.marketExclusiveLabel,
        `${product.name} should have marketExclusiveLabel`
      ).toContain('Serenbe Markets Only');
    }
  });

  test('boba products are categorized as Boba', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/products`);
    const data = await res.json();

    const bobaProducts = data.products.filter((p: any) =>
      BOBA_PRODUCT_NAMES.some(name =>
        (p.name || '').toLowerCase().includes(name.toLowerCase())
      )
    );

    for (const product of bobaProducts) {
      const category = (
        product.intelligentCategory || product.categoryData?.name || ''
      ).toLowerCase();
      expect(category, `${product.name} category should be boba`).toContain('boba');
    }
  });

  test('non-boba products do NOT have marketExclusive', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/products`);
    const data = await res.json();

    const nonBoba = data.products.filter((p: any) =>
      !BOBA_PRODUCT_NAMES.some(name =>
        (p.name || '').toLowerCase().includes(name.toLowerCase())
      )
    );

    // At least some non-boba products should exist (sea moss, etc.)
    expect(nonBoba.length).toBeGreaterThan(0);

    for (const product of nonBoba) {
      expect(product.marketExclusive, `${product.name} should NOT be marketExclusive`).toBeFalsy();
    }
  });

  test('categories list includes Boba', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/products`);
    const data = await res.json();

    const categoryNames = (data.categories || []).map((c: any) =>
      (c.name || '').toLowerCase()
    );
    expect(categoryNames).toContain('boba');
  });
});

// ─── Catalog Page ────────────────────────────────────────────────────────────

test.describe('Catalog: Boba product cards', () => {

  test('boba card shows purple market-exclusive badge, not Featured', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalog`);
    await page.waitForLoadState('networkidle');

    // Wait for product grid to render
    const firstCard = page.locator('[data-testid^="enhanced-product-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    // Find a card with the market-exclusive badge
    const exclusiveBadges = page.locator('[data-testid="market-exclusive-badge"]');
    const badgeCount = await exclusiveBadges.count();
    expect(badgeCount, 'at least one boba product card should show market-exclusive badge').toBeGreaterThan(0);

    // Verify text content of the badge
    const firstBadge = exclusiveBadges.first();
    await expect(firstBadge).toContainText('Serenbe Markets Only');

    // The same card should NOT also show a Featured badge
    const parentCard = firstBadge.locator('xpath=ancestor::div[contains(@data-testid,"enhanced-product-card-")]');
    const featuredBadge = parentCard.locator('[data-testid="featured-badge"]');
    await expect(featuredBadge).toHaveCount(0);
  });

  test('Boba category filter shows only boba products', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalog?category=boba`);
    await page.waitForLoadState('networkidle');

    const cards = page.locator('[data-testid^="enhanced-product-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    const cardCount = await cards.count();
    expect(cardCount, 'filtered catalog should show boba products').toBeGreaterThan(0);

    // Every visible card should have the market-exclusive badge
    const exclusiveBadges = page.locator('[data-testid="market-exclusive-badge"]');
    const badgeCount = await exclusiveBadges.count();
    expect(badgeCount).toBe(cardCount);
  });
});

// ─── Product Detail Page ─────────────────────────────────────────────────────

test.describe('Product Detail: Boba market exclusive banner', () => {

  test('boba product detail page shows Serenbe Farmers Market Exclusive banner', async ({ page, request }) => {
    // Get a boba product slug from the API
    const res = await request.get(`${BASE_URL}/api/products`);
    const data = await res.json();
    const bobaProduct = data.products.find((p: any) => p.marketExclusive && p.slug);
    expect(bobaProduct, 'need at least one boba product with a slug').toBeTruthy();

    await page.goto(`${BASE_URL}/product/${bobaProduct.slug}`);
    await page.waitForLoadState('networkidle');

    // Wait for product to load (page fetches from API client-side)
    await expect(page.locator('h1')).toContainText(bobaProduct.name, { timeout: 15_000 });

    // Verify the exclusive banner
    await expect(page.getByText('Serenbe Farmers Market Exclusive')).toBeVisible();

    // Verify pickup info text
    await expect(page.getByText(/Serenbe Farmers Market every Saturday/i)).toBeVisible();

    // Verify the image area badge
    await expect(page.getByText('🎪 Serenbe Markets Only').first()).toBeVisible();
  });

  test('non-boba product detail page does NOT show exclusive banner', async ({ page, request }) => {
    const res = await request.get(`${BASE_URL}/api/products`);
    const data = await res.json();
    const nonBoba = data.products.find((p: any) => !p.marketExclusive && p.slug);
    expect(nonBoba, 'need at least one non-boba product with a slug').toBeTruthy();

    await page.goto(`${BASE_URL}/product/${nonBoba.slug}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(nonBoba.name, { timeout: 15_000 });

    // Should NOT have the exclusive banner
    await expect(page.getByText('Serenbe Farmers Market Exclusive')).not.toBeVisible();
  });
});

// ─── Homepage Hero ───────────────────────────────────────────────────────────

test.describe('Homepage Hero: Boba market teaser', () => {

  test('hero shows Boba Market Exclusive teaser with preview CTA', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Boba teaser section
    await expect(page.getByText('Market Exclusive')).toBeVisible();
    await expect(page.getByText('Handcrafted Boba — Only at Serenbe')).toBeVisible();

    // Flavor callouts
    await expect(page.getByText(/Taro Boba/)).toBeVisible();
    await expect(page.getByText(/Strawberry Matcha/)).toBeVisible();

    // CTA button
    const previewBtn = page.getByRole('button', { name: /Preview the Boba Menu/i });
    await expect(previewBtn).toBeVisible();

    // Verify the button navigates to the boba category
    // (checking href from the onClick would require navigation, so we verify the element exists)
  });

  test('"🧋 Boba at the Market" appears in rotating headlines within 20s', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Headlines rotate every 3s; 5 headlines = max ~15s cycle. Wait up to 20s.
    await expect(page.getByText('🧋 Boba at the Market')).toBeVisible({ timeout: 20_000 });
  });
});

// ─── Console Error Guard ─────────────────────────────────────────────────────

test.describe('Console: No critical errors on boba pages', () => {

  test('catalog with boba filter has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/catalog?category=boba`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('hydration')
    );

    expect(critical, 'no critical console errors on boba catalog').toHaveLength(0);
  });
});
