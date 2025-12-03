/**
 * Distance-based Delivery Pricing Calculator
 */

// Pricing tiers: [maxMiles, price]
const PRICING_TIERS = [
  { maxMiles: 5, price: 4.99, label: 'Within 5 miles' },
  { maxMiles: 10, price: 7.99, label: '5-10 miles' },
  { maxMiles: 15, price: 10.99, label: '10-15 miles' },
  { maxMiles: 20, price: 13.99, label: '15-20 miles' },
  { maxMiles: 25, price: 16.99, label: '20-25 miles' }
];

const MAX_DELIVERY_RADIUS = 25; // miles

/**
 * Calculate delivery fee based on distance
 * @param {number} distance - Distance in miles
 * @returns {object} - { fee, tier, eligible, message }
 */
export function calculateDeliveryFee(distance) {
  if (distance > MAX_DELIVERY_RADIUS) {
    return {
      eligible: false,
      fee: 0,
      tier: null,
      distance: Math.round(distance * 10) / 10,
      message: `Sorry, delivery is not available for addresses more than ${MAX_DELIVERY_RADIUS} miles away.`
    };
  }
  
  // Find appropriate tier
  for (const tier of PRICING_TIERS) {
    if (distance <= tier.maxMiles) {
      return {
        eligible: true,
        fee: tier.price,
        tier: tier.label,
        distance: Math.round(distance * 10) / 10,
        message: `Delivery available! ${tier.label} - $${tier.price.toFixed(2)} fee`
      };
    }
  }
  
  // Fallback (shouldn't reach here if tiers are configured correctly)
  return {
    eligible: false,
    fee: 0,
    tier: null,
    distance: Math.round(distance * 10) / 10,
    message: 'Distance calculation error'
  };
}

/**
 * Get all pricing tiers for display
 */
export function getPricingTiers() {
  return PRICING_TIERS;
}

/**
 * Get delivery fee display text
 * @param {number} subtotal - Order subtotal
 * @param {number} deliveryFee - Calculated delivery fee
 * @returns {string}
 */
export function getDeliveryFeeDisplay(subtotal, deliveryFee) {
  if (subtotal >= 75) {
    return 'FREE (order over $75)';
  }
  return `$${deliveryFee.toFixed(2)}`;
}

export { MAX_DELIVERY_RADIUS, PRICING_TIERS };
