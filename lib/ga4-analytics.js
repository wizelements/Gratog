/**
 * GA4 E-commerce Analytics Utilities
 * Enhanced tracking for Google Analytics 4
 * 
 * Required Environment Variable: NEXT_PUBLIC_GA_ID
 */

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Safely call gtag with error handling
 */
function safeGtag(...args) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag(...args);
      if (DEBUG) {
        console.log('📊 GA4 Event:', args);
      }
    } catch (error) {
      console.error('GA4 tracking error:', error);
    }
  } else if (DEBUG) {
    console.log('📊 GA4 (mock):', args);
  }
}

/**
 * Format product item for GA4 e-commerce
 */
function formatItem(product, index = 0) {
  return {
    item_id: product.id || product.sku || product.catalogObjectId,
    item_name: product.name || product.title,
    item_brand: 'Taste of Gratitude',
    item_category: product.category || 'Sea Moss',
    item_variant: product.variant || product.variantName || undefined,
    price: typeof product.price === 'number' 
      ? product.price / 100 
      : parseFloat(product.price) || 0,
    quantity: product.quantity || 1,
    index,
    ...(product.coupon && { coupon: product.coupon }),
    ...(product.discount && { discount: product.discount / 100 }),
  };
}

/**
 * Track when a user views a product
 * @param {Object} product - Product details
 */
export function trackViewItem(product) {
  safeGtag('event', 'view_item', {
    currency: 'USD',
    value: (product.price || 0) / 100,
    items: [formatItem(product)],
  });
}

/**
 * Track when a user views a list of products
 * @param {Array} products - Array of products
 * @param {string} listName - Name of the list (e.g., "Homepage Products", "Search Results")
 */
export function trackViewItemList(products, listName = 'Product List') {
  if (!products?.length) return;
  
  const items = products.map((product, index) => ({
    ...formatItem(product, index),
    item_list_name: listName,
  }));

  safeGtag('event', 'view_item_list', {
    item_list_name: listName,
    items,
  });
}

/**
 * Track when a product is added to cart
 * @param {Object} product - Product details
 * @param {number} quantity - Quantity added
 */
export function trackAddToCart(product, quantity = 1) {
  const item = formatItem({ ...product, quantity });
  
  safeGtag('event', 'add_to_cart', {
    currency: 'USD',
    value: item.price * quantity,
    items: [item],
  });
}

/**
 * Track when a product is removed from cart
 * @param {Object} product - Product details
 * @param {number} quantity - Quantity removed
 */
export function trackRemoveFromCart(product, quantity = 1) {
  const item = formatItem({ ...product, quantity });
  
  safeGtag('event', 'remove_from_cart', {
    currency: 'USD',
    value: item.price * quantity,
    items: [item],
  });
}

/**
 * Track when a user starts checkout
 * @param {Array} cartItems - Array of cart items
 * @param {number} totalValue - Total cart value in cents
 * @param {string} coupon - Optional coupon code
 */
export function trackBeginCheckout(cartItems, totalValue, coupon = null) {
  const items = cartItems.map((item, index) => formatItem(item, index));
  
  safeGtag('event', 'begin_checkout', {
    currency: 'USD',
    value: totalValue / 100,
    items,
    ...(coupon && { coupon }),
  });
}

/**
 * Track when shipping info is added
 * @param {Array} cartItems - Array of cart items
 * @param {string} shippingTier - Shipping method name
 */
export function trackAddShippingInfo(cartItems, shippingTier = 'Standard') {
  const items = cartItems.map((item, index) => formatItem(item, index));
  
  safeGtag('event', 'add_shipping_info', {
    currency: 'USD',
    shipping_tier: shippingTier,
    items,
  });
}

/**
 * Track when payment info is added
 * @param {Array} cartItems - Array of cart items
 * @param {string} paymentType - Payment method type
 */
export function trackAddPaymentInfo(cartItems, paymentType = 'Credit Card') {
  const items = cartItems.map((item, index) => formatItem(item, index));
  
  safeGtag('event', 'add_payment_info', {
    currency: 'USD',
    payment_type: paymentType,
    items,
  });
}

/**
 * Track successful purchase
 * @param {Object} orderDetails - Order details
 */
export function trackPurchase(orderDetails) {
  const {
    orderId,
    items,
    totalValue,
    tax = 0,
    shipping = 0,
    coupon = null,
  } = orderDetails;

  const formattedItems = items.map((item, index) => formatItem(item, index));

  safeGtag('event', 'purchase', {
    transaction_id: orderId,
    currency: 'USD',
    value: totalValue / 100,
    tax: tax / 100,
    shipping: shipping / 100,
    items: formattedItems,
    ...(coupon && { coupon }),
  });
}

/**
 * Track refund
 * @param {string} orderId - Transaction ID
 * @param {number} refundValue - Refund amount in cents
 * @param {Array} items - Optional array of refunded items (for partial refunds)
 */
export function trackRefund(orderId, refundValue, items = null) {
  const eventData = {
    transaction_id: orderId,
    currency: 'USD',
    value: refundValue / 100,
  };

  if (items) {
    eventData.items = items.map((item, index) => formatItem(item, index));
  }

  safeGtag('event', 'refund', eventData);
}

/**
 * Track product click from a list
 * @param {Object} product - Product clicked
 * @param {string} listName - Name of the list
 * @param {number} index - Position in list
 */
export function trackSelectItem(product, listName = 'Product List', index = 0) {
  safeGtag('event', 'select_item', {
    item_list_name: listName,
    items: [{
      ...formatItem(product, index),
      item_list_name: listName,
    }],
  });
}

/**
 * Track promotion view
 * @param {Object} promotion - Promotion details
 */
export function trackViewPromotion(promotion) {
  safeGtag('event', 'view_promotion', {
    promotion_id: promotion.id,
    promotion_name: promotion.name,
    creative_name: promotion.creative || undefined,
    creative_slot: promotion.slot || undefined,
  });
}

/**
 * Track promotion click
 * @param {Object} promotion - Promotion details
 */
export function trackSelectPromotion(promotion) {
  safeGtag('event', 'select_promotion', {
    promotion_id: promotion.id,
    promotion_name: promotion.name,
    creative_name: promotion.creative || undefined,
    creative_slot: promotion.slot || undefined,
  });
}

export default {
  trackViewItem,
  trackViewItemList,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackRefund,
  trackSelectItem,
  trackViewPromotion,
  trackSelectPromotion,
};
