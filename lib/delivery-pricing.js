/**
 * Distance-based Delivery Pricing Calculator with Order-based Discounts
 */

// Pricing tiers: [maxMiles, price]
const PRICING_TIERS = [
  { maxMiles: 5, price: 0, label: 'Within 5 miles' },
  { maxMiles: 10, price: 3.99, label: '5-10 miles' },
  { maxMiles: 15, price: 7.99, label: '10-15 miles' },
  { maxMiles: 20, price: 11.99, label: '15-20 miles' },
  { maxMiles: 25, price: 15.99, label: '20-25 miles' }
];

// Discount tiers: [minSubtotal, discountPercent]
const DISCOUNT_TIERS = [
  { minSubtotal: 85, discount: 10, label: '10% off delivery' },
  { minSubtotal: 65, discount: 5, label: '5% off delivery' }
];

const MAX_DELIVERY_RADIUS = 25; // miles

/**
 * Calculate delivery fee based on distance
 * @param {number} distance - Distance in miles
 * @param {number} subtotal - Order subtotal (optional, for discount calculation)
 * @returns {object} - { fee, originalFee, discount, tier, eligible, message }
 */
export function calculateDeliveryFee(distance, subtotal = 0) {
  if (distance > MAX_DELIVERY_RADIUS) {
    return {
      eligible: false,
      fee: 0,
      originalFee: 0,
      discount: 0,
      discountPercent: 0,
      tier: null,
      distance: Math.round(distance * 10) / 10,
      message: `Sorry, delivery is not available for addresses more than ${MAX_DELIVERY_RADIUS} miles away.`
    };
  }
  
  // Find appropriate distance-based tier
  let baseFee = 0;
  let tierLabel = '';
  
  for (const tier of PRICING_TIERS) {
    if (distance <= tier.maxMiles) {
      baseFee = tier.price;
      tierLabel = tier.label;
      break;
    }
  }
  
  // Apply discount based on subtotal
  let discountPercent = 0;
  let discountLabel = '';
  
  if (subtotal > 0) {
    for (const discountTier of DISCOUNT_TIERS) {
      if (subtotal >= discountTier.minSubtotal) {
        discountPercent = discountTier.discount;
        discountLabel = discountTier.label;
        break;
      }
    }
  }
  
  const discountAmount = baseFee * (discountPercent / 100);
  const finalFee = Math.max(0, baseFee - discountAmount);
  
  let message = '';
  if (baseFee === 0) {
    message = '✨ FREE delivery (0-5 miles)';
  } else if (discountPercent === 100) {
    message = '✨ FREE delivery (order over $100)';
  } else if (discountPercent > 0) {
    message = `${tierLabel} - $${baseFee.toFixed(2)} with ${discountPercent}% off = $${finalFee.toFixed(2)}`;
  } else {
    message = `${tierLabel} - $${baseFee.toFixed(2)}`;
  }
  
  return {
    eligible: true,
    fee: finalFee,
    originalFee: baseFee,
    discount: discountAmount,
    discountPercent,
    discountLabel,
    tier: tierLabel,
    distance: Math.round(distance * 10) / 10,
    message
  };
}

/**
 * Get all pricing tiers for display
 */
export function getPricingTiers() {
  return PRICING_TIERS;
}

/**
 * Get delivery fee display text with discount info
 * @param {number} subtotal - Order subtotal
 * @param {object} pricingInfo - Result from calculateDeliveryFee
 * @returns {string}
 */
export function getDeliveryFeeDisplay(subtotal, pricingInfo) {
  if (!pricingInfo) return '$0.00';
  
  if (pricingInfo.originalFee === 0) {
    return 'FREE (0-5 miles)';
  }
  
  if (pricingInfo.discountPercent === 100) {
    return 'FREE (order over $100)';
  }
  
  if (pricingInfo.discountPercent > 0) {
    return `$${pricingInfo.fee.toFixed(2)} (${pricingInfo.discountPercent}% off)`;
  }
  
  return `$${pricingInfo.fee.toFixed(2)}`;
}

/**
 * Get next discount tier info
 * @param {number} subtotal - Current order subtotal
 * @returns {object|null} - Next discount tier or null
 */
export function getNextDiscountTier(subtotal) {
  for (let i = DISCOUNT_TIERS.length - 1; i >= 0; i--) {
    const tier = DISCOUNT_TIERS[i];
    if (subtotal < tier.minSubtotal) {
      const remaining = tier.minSubtotal - subtotal;
      return {
        minSubtotal: tier.minSubtotal,
        discount: tier.discount,
        label: tier.label,
        remaining: remaining.toFixed(2),
        message: `Add $${remaining.toFixed(2)} more for ${tier.label}!`
      };
    }
  }
  return null;
}

export { MAX_DELIVERY_RADIUS, PRICING_TIERS, DISCOUNT_TIERS };
