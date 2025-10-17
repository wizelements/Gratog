// Simple Square Product Link Management
// Handles direct redirects to Square's hosted checkout pages

/**
 * Generate Square checkout URL for single or multiple products
 * @param {Object} order - Order object with items
 * @returns {string} Square checkout URL
 */
export function generateSquareCheckoutUrl(order) {
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }

  if (order.items.length === 1) {
    // Single product - use direct Square product link
    const item = order.items[0];
    const baseUrl = item.squareProductUrl || `https://square.link/u/${item.slug}`;
    
    // Add quantity parameter if supported
    if (item.quantity > 1) {
      const url = new URL(baseUrl);
      url.searchParams.set('quantity', item.quantity.toString());
      return url.toString();
    }
    
    return baseUrl;
  } else {
    // Multiple products - for now, redirect to first item
    // In production, you might want to create a Square bundle or cart
    const firstItem = order.items[0];
    return firstItem.squareProductUrl || `https://square.link/u/${firstItem.slug}`;
  }
}

/**
 * Validate Square product URL
 * @param {string} url - Square product URL
 * @returns {boolean} Whether URL is valid
 */
export function isValidSquareUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'square.link' || 
           parsedUrl.hostname.includes('squareup.com');
  } catch {
    return false;
  }
}

/**
 * Extract product slug from Square URL
 * @param {string} url - Square product URL
 * @returns {string|null} Product slug or null
 */
export function extractSlugFromSquareUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'square.link') {
      const pathParts = parsedUrl.pathname.split('/');
      return pathParts[pathParts.length - 1] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Track Square checkout analytics
 * @param {string} productSlug - Product slug
 * @param {string} customerEmail - Customer email
 * @param {Object} metadata - Additional metadata
 */
export async function trackSquareCheckoutAnalytics(productSlug, customerEmail, metadata = {}) {
  try {
    // Send analytics to your tracking system
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'square_checkout_redirect',
        productSlug,
        customerEmail,
        timestamp: new Date().toISOString(),
        ...metadata
      })
    });
  } catch (error) {
    console.warn('Failed to track Square checkout analytics:', error);
  }
}