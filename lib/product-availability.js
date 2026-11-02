/**
 * Taste of Gratitude customer-facing availability policy.
 *
 * Catalog visibility, physical inventory, merchant-approved preorders and
 * checkout eligibility are different facts. Do not infer permission to take
 * money from zero stock, a curated menu entry or an unverified Square SKU.
 *
 * This pure helper is shared by client components and server-side admission.
 * The payment API MUST still reload authoritative catalog/inventory records.
 */
export function resolveProductAvailability(product) {
  const blocked = (reason, label = 'Currently unavailable') => ({
    status: 'unavailable', label, reason,
    canOrder: false, canAddToCart: false, canMarketPreorder: false,
    schemaAvailability: 'https://schema.org/OutOfStock',
  });

  if (!product) return blocked('missing_product');

  const normalized = value => String(value || '').trim().toLowerCase();
  const weekly = normalized(product.weeklyStatus);
  const inventory = normalized(product.inventoryStatus);
  const category = normalized(product.category);
  const squareVisibility = normalized(product.squareEcomVisibility || product.ecomVisibility);
  const inactive = product.available === false || product.soldOut === true ||
    product.squareIsArchived === true || product.isArchived === true ||
    category === 'inactive' || (product.activeWeeklyMenu === false &&
      (product.seasonal === true || weekly === 'seasonal' ||
       product.preorderOnly === true || product.marketPickupOnly === true || product.marketExclusive === true)) ||
    weekly === 'inactive' || weekly === 'sold_out' ||
    inventory === 'inactive' || inventory === 'sold_out' ||
    product.purchaseStatus === 'sold_out' ||
    squareVisibility === 'hidden' || squareVisibility === 'unindexed';
  if (inactive) {
    const seasonal = product.activeWeeklyMenu === false && (product.seasonal === true || weekly === 'seasonal');
    return blocked(seasonal ? 'not_on_weekly_menu' : 'merchant_unavailable',
      seasonal ? 'Not on this week’s menu' : 'Currently unavailable');
  }

  const prices = [
    product.priceCents != null ? Number(product.priceCents) / 100 : Number(product.price),
    ...(Array.isArray(product.variations) ? product.variations.map(variation =>
      variation?.priceCents != null ? Number(variation.priceCents) / 100 : Number(variation?.price)
    ) : []),
  ];
  if (!prices.some(price => Number.isFinite(price) && price > 0)) {
    return blocked('price_unverified', 'Check price and availability');
  }

  // A curated/local tog-* variant or a marketing item is not proof that
  // Square can accept its payment. Missing checkout readiness fails closed.
  if (product.checkoutReady !== true) {
    return blocked('checkout_unverified', 'Request availability');
  }

  const numberOrNull = value =>
    value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
      ? Number(value) : null;
  const stock = numberOrNull(product.currentStock ?? product.stock);
  const outOfStock = product.inStock === false || inventory === 'out_of_stock' ||
    product.purchaseStatus === 'out_of_stock' || (stock !== null && stock <= 0);
  const approvedPreorder = product.preorderOnly === true ||
    product.acceptsPreorders === true;
  const pickupOnly = product.marketPickupOnly === true ||
    product.marketExclusive === true ||
    ['market_pickup', 'market_pickup_only'].includes(normalized(product.fulfillmentType));

  if (outOfStock && !approvedPreorder) return blocked('out_of_stock', 'Sold out');
  if (approvedPreorder) {
    return {
      status: 'preorder', label: 'Preorder for market pickup',
      reason: 'merchant_approved_preorder',
      canOrder: true, canAddToCart: false, canMarketPreorder: pickupOnly,
      schemaAvailability: 'https://schema.org/PreOrder',
    };
  }
  if (outOfStock) return blocked('out_of_stock', 'Sold out');

  const lowStockThreshold = numberOrNull(product.lowStockThreshold) ?? 5;
  const limited = weekly === 'limited' || inventory === 'limited' ||
    (stock !== null && stock > 0 && stock <= lowStockThreshold);
  return {
    status: limited ? 'limited' : (stock === null ? 'stock_unverified' : 'available'),
    label: limited ? 'Small batch' : stock === null ? 'Availability confirmed at checkout' : 'Available now',
    reason: stock === null ? 'inventory_not_confirmed' : 'ready',
    canOrder: true,
    canAddToCart: !pickupOnly,
    canMarketPreorder: pickupOnly,
    schemaAvailability: 'https://schema.org/InStock',
  };
}
