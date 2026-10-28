/**
 * Enforce the same line-item bounds and identity integrity for Square-hosted
 * market preorders as for regular online checkout.
 */
export class PreorderLineValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PreorderLineValidationError';
    this.code = code;
  }
}

export function validateMarketOrderLines(items: unknown): Array<Record<string, any> & { quantity: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new PreorderLineValidationError('CART_EMPTY', 'Add a product before checking out.');
  }
  if (items.length > 50) {
    throw new PreorderLineValidationError('CART_TOO_LARGE', 'The cart exceeds the 50-line limit.');
  }
  const seen = new Set<string>();
  return items.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new PreorderLineValidationError('INVALID_ITEM', 'Cart item ' + (index + 1) + ' is invalid.');
    }
    const item = raw as Record<string, any>;
    const quantity = Number(item.quantity);
    if (item.quantity === null || item.quantity === undefined || item.quantity === ''
        || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new PreorderLineValidationError('INVALID_QUANTITY',
        'Choose a whole-number quantity between 1 and 50 for each item.');
    }
    const stableId = String(item.variationId || item.catalogObjectId || item.productId || item.id || '').trim();
    if (!stableId) {
      throw new PreorderLineValidationError('PRODUCT_ID_REQUIRED', 'A cart item has no catalog identifier.');
    }
    if (seen.has(stableId)) {
      throw new PreorderLineValidationError('DUPLICATE_CART_LINE',
        'An item appears twice in your cart. Update its quantity instead.');
    }
    seen.add(stableId);
    return { ...item, quantity };
  });
}

/**
 * Product and variation IDs are two assertions about one selected SKU.
 * Do not silently accept an invalid/retired variation by falling back to
 * a legitimate product name or a different variant.
 */
export function validateSelectedMarketVariation(
  line: { productId?: string; id?: string; variationId?: string; catalogObjectId?: string },
  resolvedProduct: { id?: string; productId?: string; slug?: string },
  resolvedVariation: { id?: string } | null,
  lookup: Map<string, { product: any; variation: any }>,
): void {
  const normalize = (value: unknown) => String(value || '').trim().toLowerCase();
  for (const id of [line.productId, line.id]) {
    if (!id) continue;
    const found = lookup.get(normalize(id));
    if (!found || normalize(found.product.id || found.product.productId || found.product.slug)
        !== normalize(resolvedProduct.id || resolvedProduct.productId || resolvedProduct.slug)) {
      throw new PreorderLineValidationError('PRODUCT_SELECTION_CONFLICT',
        'The selected product changed. Refresh the menu and add it again.');
    }
  }
  for (const id of [line.variationId, line.catalogObjectId]) {
    if (!id) continue;
    const found = lookup.get(normalize(id));
    if (!found || normalize(found.product.id || found.product.slug)
        !== normalize(resolvedProduct.id || resolvedProduct.slug)) {
      throw new PreorderLineValidationError('VARIATION_NOT_FOUND',
        'The selected size or variation is no longer available. Refresh your cart.');
    }
    // Catalog aliases may refer to the product's default variation.
    if (found.variation?.id && resolvedVariation?.id
        && found.variation.id !== resolvedVariation.id) {
      throw new PreorderLineValidationError('VARIATION_CONFLICT',
        'The selected variations do not match. Please choose the option again.');
    }
  }
}
