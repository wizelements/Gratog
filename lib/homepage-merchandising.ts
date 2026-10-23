// Only display homepage purchase cards when merchant-backed checkout data is present.
// Curated and demo fallbacks remain discoverable through the regular catalog,
// but never invent an orderable item or an unchecked price on the homepage.
export function selectHomepageCheckoutProducts(snapshot: {
  isFallback?: boolean;
  products?: Array<Record<string, any>>;
} | null, limit = 6) {
  if (!snapshot || snapshot.isFallback || !Array.isArray(snapshot.products)) return [];

  const seenVariations = new Set<string>();
  const results: Array<Record<string, any>> = [];
  for (const product of snapshot.products) {
    if (!product || product.checkoutReady !== true) continue;
    const variationId = product.variationId;
    if (typeof variationId !== 'string' || variationId.length === 0) continue;
    if (seenVariations.has(variationId)) continue;
    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) continue;
    if (product.available === false || product.squareEcomAvailable === false) continue;
    if (product.soldOut || product.purchaseStatus === 'sold_out' || product.availability === 'sold_out') continue;
    if (product.inventoryStatus === 'sold_out') continue;
    seenVariations.add(variationId);
    results.push(product);
    if (results.length >= limit) break;
  }
  return results;
}
