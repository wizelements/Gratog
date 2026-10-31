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
export function getPurchaseState(currentStock, preorderEligible = false) {
  const stock = typeof currentStock === 'number' && Number.isSafeInteger(currentStock)
    ? currentStock : null;
  if (stock === null) {
    // Missing or expired stock is UNKNOWN, never a fabricated 25 units.
    // A preorder is offered only when the merchant explicitly opts in.
    return {
      stockStatus: 'unknown',
      purchaseStatus: preorderEligible ? 'preorder' : 'check_availability',
      isPreorder: preorderEligible,
      schemaAvailability: preorderEligible
        ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
    };
  }
  if (stock > 0) {
    return {
      stockStatus: stock > 5 ? 'in_stock' : 'low',
      purchaseStatus: 'in_stock',
      isPreorder: false,
      schemaAvailability: 'https://schema.org/InStock',
    };
  }
  return {
    stockStatus: 'out_of_stock',
    purchaseStatus: preorderEligible ? 'preorder' : 'check_availability',
    isPreorder: preorderEligible,
    schemaAvailability: preorderEligible
      ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
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
