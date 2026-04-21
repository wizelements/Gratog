/**
 * Purchase Status Helper
 * 
 * Separates internal stock status from customer-facing purchase status.
 * Stock status = physical inventory reality.
 * Purchase status = what the customer sees and can do.
 * 
 * All preorder-eligible products remain purchasable when stock is 0.
 * Schema.org uses PreOrder (customer can place an order for future fulfillment).
 */

/**
 * @param {number|null|undefined} currentStock - Actual inventory count
 * @returns {{ stockStatus: string, purchaseStatus: string, isPreorder: boolean, schemaAvailability: string }}
 */
export function getPurchaseState(currentStock) {
  const stock = typeof currentStock === 'number' ? currentStock : null;

  if (stock === null || stock === undefined) {
    // Unknown stock — treat as available (default stock is 25 in this system)
    return {
      stockStatus: 'unknown',
      purchaseStatus: 'in_stock',
      isPreorder: false,
      schemaAvailability: 'https://schema.org/InStock',
    };
  }

  if (stock > 5) {
    return {
      stockStatus: 'in_stock',
      purchaseStatus: 'in_stock',
      isPreorder: false,
      schemaAvailability: 'https://schema.org/InStock',
    };
  }

  if (stock > 0) {
    return {
      stockStatus: 'low',
      purchaseStatus: 'in_stock',
      isPreorder: false,
      schemaAvailability: 'https://schema.org/InStock',
    };
  }

  // stock <= 0 — out of stock but still orderable (preorder)
  return {
    stockStatus: 'out_of_stock',
    purchaseStatus: 'preorder',
    isPreorder: true,
    schemaAvailability: 'https://schema.org/PreOrder',
  };
}

/**
 * Get the customer-facing label for purchase status
 */
export function getPurchaseLabel(purchaseStatus) {
  switch (purchaseStatus) {
    case 'in_stock':
      return 'In Stock';
    case 'preorder':
      return 'Available for Preorder';
    default:
      return 'Check Availability';
  }
}

/**
 * Get the CTA button text based on purchase status
 * @param {string} purchaseStatus - 'in_stock' or 'preorder'
 */
export function getAddToCartLabel(purchaseStatus) {
  return purchaseStatus === 'preorder' ? 'Preorder Now' : 'Add to Cart';
}

/**
 * Get the toast message after adding to cart
 * @param {string} productName - name of the product
 * @param {string} purchaseStatus - 'in_stock' or 'preorder'
 * @param {string} variantText - variant info (e.g., "Size: 16oz")
 */
export function getAddedToCartMessage(productName, purchaseStatus, variantText = '') {
  if (purchaseStatus === 'preorder') {
    return `Preorder added: ${productName}${variantText}`;
  }
  return `Added ${productName}${variantText} to cart`;
}
