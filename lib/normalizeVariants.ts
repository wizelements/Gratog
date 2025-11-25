/**
 * Canonical Variant Normalization System
 * Single source of truth for product variant logic across the entire app
 * 
 * Handles 3 product data formats:
 * 1. Unified format: product.variations[] array
 * 2. Legacy format: product.priceMini + product.sizes[]
 * 3. Single-price: product.price only
 */

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  label: string;
  sizeOz: number | null;
  price: number;
  sku?: string;
};

/**
 * Normalize product variants from any format to canonical ProductVariant[]
 * @param product - Product object from any source (API, static, Square)
 * @returns Normalized array of variants with consistent structure
 */
export function normalizeVariants(product: any): ProductVariant[] {
  if (!product) return [];

  const variants: ProductVariant[] = [];

  // CASE A: Product already has variations array (Unified/Square format)
  if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
    return product.variations
      .filter(v => v.price && v.price > 0) // Filter $0 prices
      .map(v => ({
        id: v.id || `${product.id}-${v.name}`,
        productId: product.id,
        name: v.name || v.label || 'Regular',
        label: v.name || v.label || 'Regular',
        sizeOz: extractSizeOz(v.name || v.label),
        price: Number(v.price),
        sku: v.sku || v.id
      }));
  }

  // CASE B: Legacy format with priceMini + sizes array
  if (product.priceMini && product.sizes && Array.isArray(product.sizes)) {
    // Add mini variant
    variants.push({
      id: `${product.id}-mini`,
      productId: product.id,
      name: product.sizes[0] || '4oz',
      label: product.sizes[0] || '4oz',
      sizeOz: extractSizeOz(product.sizes[0]),
      price: Number(product.priceMini),
      sku: `${product.sku || product.id}-mini`
    });

    // Add regular variant (if different price)
    if (product.price && product.price > 0 && product.price !== product.priceMini) {
      variants.push({
        id: `${product.id}-regular`,
        productId: product.id,
        name: product.sizes[1] || '16oz',
        label: product.sizes[1] || '16oz',
        sizeOz: extractSizeOz(product.sizes[1]),
        price: Number(product.price),
        sku: `${product.sku || product.id}-regular`
      });
    }

    return variants.filter(v => v.price > 0);
  }

  // CASE C: Single-price product (no variations)
  if (product.price && product.price > 0) {
    return [{
      id: product.id,
      productId: product.id,
      name: product.size || 'Regular',
      label: product.size || 'Regular',
      sizeOz: extractSizeOz(product.size),
      price: Number(product.price),
      sku: product.sku || product.id
    }];
  }

  // Fallback: Empty array (product has no valid pricing)
  console.warn(`[normalizeVariants] Product ${product.id} has no valid price data`);
  return [];
}

/**
 * Extract numeric size in ounces from variant label
 * @param label - Variant label like "4oz", "16oz", "2oz Shot", etc.
 * @returns Size in ounces or null if not found
 */
function extractSizeOz(label?: string): number | null {
  if (!label) return null;
  
  const match = label.match(/(\d+)\s*oz/i);
  return match ? Number(match[1]) : null;
}

/**
 * Pick the default/primary variant for a product
 * Prefers smaller sizes (entry point) or first valid variant
 * @param variants - Normalized ProductVariant[]
 * @returns Primary variant or null
 */
export function pickPrimaryVariant(variants: ProductVariant[]): ProductVariant | null {
  if (!variants || variants.length === 0) return null;
  
  // Sort by size (smallest first) or price (cheapest first)
  const sorted = [...variants].sort((a, b) => {
    if (a.sizeOz && b.sizeOz) {
      return a.sizeOz - b.sizeOz; // Prefer smaller sizes
    }
    return a.price - b.price; // Fallback to cheapest
  });
  
  return sorted[0];
}

/**
 * Format variant for cart display
 * @param product - Product object
 * @param variant - Selected ProductVariant
 * @returns Formatted cart item
 */
export function createCartItem(
  product: any,
  variant: ProductVariant,
  quantity: number = 1
) {
  return {
    id: `${product.id}-${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    variantLabel: variant.label,
    displayName: `${product.name} - ${variant.label}`,
    image: product.image || product.images?.[0],
    unitPrice: variant.price,
    quantity,
    subtotal: variant.price * quantity,
    sku: variant.sku || variant.id
  };
}

/**
 * Validate variant selection before adding to cart
 * @param variant - ProductVariant to validate
 * @returns true if valid, throws error if invalid
 */
export function validateVariant(variant: ProductVariant): boolean {
  if (!variant) {
    throw new Error('No variant selected');
  }
  
  if (!variant.price || variant.price <= 0) {
    throw new Error(`Invalid price for variant ${variant.label}`);
  }
  
  return true;
}
