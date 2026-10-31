import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('indexable storefront integrity', () => {
  it('filters Square archived and deleted items from the public product catalog', () => {
    const square = read('lib/square-api-edge.ts');
    expect(square).toContain("obj.item_data?.is_archived !== true");
    expect(square).toContain("obj.itemData?.isArchived !== true");
    expect(square).toContain("obj.is_deleted !== true");
    expect(square).toContain("obj.item_data?.is_archived === true");
  });
  it('keeps unavailable products out of public sitemap entries', () => {
    const sitemap = read('app/sitemap.ts');
    expect(sitemap).toContain('collectIndexableStorefrontProducts');
    expect(sitemap).toContain('/api/products');
    const eligibility = read('lib/seo-product-sitemap.mjs');
    for (const rule of ['available === false', 'squareIsArchived === true', 'isArchived === true', 'seoTitle', 'SAFE_REFERENCE']) {
      expect(eligibility).toContain(rule);
    }
  });
  it('noindexes archived product detail URLs and refuses ordering archived items', () => {
    const page = read('app/product/[slug]/page.jsx');
    expect(page).toContain('robots: isArchivedProduct(product) || isArchivedProduct(enrichedProduct)');
    expect(page).toContain('checkoutReady: isArchivedProduct(product) ? false');
  });
  it('uses exact server-side product lookups, not user-controlled Mongo regex', () => {
    const page = read('app/product/[slug]/page.jsx');
    expect(page).toContain('return { $or: [{ slug: String(slug) }, { id: String(slug) }] };');
    expect(page).not.toContain('{ $regex: slug, $options:');
    expect(page).toContain('NEXT_HTTP_ERROR_FALLBACK');
    expect(page).toContain('notFound();');
  });
  it('provides primary headings on every checkout stage', () => {
    const root = read('components/checkout/CheckoutRoot.tsx');
    expect(root).toContain('<h1 className="text-2xl font-bold text-gray-900 mb-2">Review your cart</h1>');
    expect(root).toContain('<h1 className="text-2xl font-bold text-gray-900">Contact and fulfillment</h1>');
    expect(root).toContain('<h1 className="text-2xl font-bold text-gray-900 mb-6">Review your order request</h1>');
  });
});
