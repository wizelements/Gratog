/** Pure filter for products already exposed by the customer storefront.
 * Sitemap URLs must never be fabricated from Square's broader historical catalog.
 * Missing checkout stock alone must not erase a legitimate product's SEO page.
 */
const SAFE_REFERENCE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
export function collectIndexableStorefrontProducts(payload) {
  if (!payload || typeof payload !== 'object' || payload.success !== true ||
      !Array.isArray(payload.products)) return [];
  const seen = new Set();
  return payload.products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    const ref = String(product.slug || product.id || '').trim();
    if (!SAFE_REFERENCE.test(ref) || !String(product.name || '').trim()) return false;
    if (product.available === false || product.squareIsArchived === true ||
        product.isArchived === true || product.is_archived === true ||
        String(product.seoTitle || '').trim().toLowerCase() === 'archived product') return false;
    if (seen.has(ref)) return false;
    seen.add(ref);
    return true;
  }).map(product => ({
    reference: String(product.slug || product.id).trim(),
    updatedAt: product.updatedAt,
  }));
}