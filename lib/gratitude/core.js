/**
 * 🌿 Gratitude Credits Core — Business Logic
 * 
 * The profit-optimized loyalty system for Gratog
 * - 2% effective discount rate
 * - Behavior-driven tier progression
 * - High perceived value, low business cost
 */

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const TIERS = {
  seedling: {
    id: 'seedling',
    name: 'Seedling',
    emoji: '🌱',
    color: '#84cc16', // lime-500
    requirements: { purchases: 0, spent: 0, credits: 0 },
    benefits: {
      multiplier: 2, // 2 credits per $1
      perks: ['Earn credits on every purchase', 'Access to basic rewards']
    }
  },
  sprout: {
    id: 'sprout', 
    name: 'Sprout',
    emoji: '🌿',
    color: '#10b981', // emerald-500
    requirements: { purchases: 1, spent: 0, credits: 200 },
    benefits: {
      multiplier: 2.5,
      perks: ['25% bonus credits', 'Early access to sales', 'Exclusive Sprout rewards']
    }
  },
  bloom: {
    id: 'bloom',
    name: 'Bloom', 
    emoji: '🌸',
    color: '#ec4899', // pink-500
    requirements: { purchases: 3, spent: 0, credits: 500 },
    benefits: {
      multiplier: 3,
      perks: ['50% bonus credits', 'Free shipping monthly', 'Birthday bonus', 'Bloom-only rewards']
    }
  },
  harvest: {
    id: 'harvest',
    name: 'Harvest',
    emoji: '🌾',
    color: '#f59e0b', // amber-500
    requirements: { purchases: 5, spent: 25000, credits: 1000 }, // $250 spent
    benefits: {
      multiplier: 4,
      perks: ['2x base credits', 'Exclusive flavors', 'Skip-the-line pickup', 'Referral bonuses', 'VIP events']
    }
  }
};

export const TIER_ORDER = ['seedling', 'sprout', 'bloom', 'harvest'];

// ============================================================================
// EARNING CONFIGURATION
// ============================================================================

export const EARNING_RATES = {
  signup: 50,
  firstPurchase: 100,
  perDollarSpent: 2, // 2 credits per $1 = 4% effective discount
  review: 25,
  referral: 200, // When referred friend makes first purchase
  birthday: 100,
  socialShare: 15,
  thirdMarketVisit: 150,
  preorderBonus: 0.25 // +25% on preorder pickups
};

// ============================================================================
// REWARDS CATALOG
// ============================================================================

export const DEFAULT_REWARDS = [
  {
    id: 'discount-5',
    name: '$5 Off',
    description: '$5 off your next order',
    creditsCost: 250,
    rewardType: 'discount_fixed',
    rewardValue: 500, // cents
    minimumOrder: 3000, // $30 minimum
    tierRequirement: null,
    active: true,
    expiresDays: 30
  },
  {
    id: 'free-shipping',
    name: 'Free Shipping',
    description: 'Free standard shipping on your order',
    creditsCost: 300,
    rewardType: 'free_shipping',
    rewardValue: 800, // ~$8 value
    minimumOrder: 2500,
    tierRequirement: null,
    active: true,
    expiresDays: 30
  },
  {
    id: 'discount-10',
    name: '$10 Off',
    description: '$10 off your next order',
    creditsCost: 450,
    rewardType: 'discount_fixed',
    rewardValue: 1000,
    minimumOrder: 4000,
    tierRequirement: 'sprout',
    active: true,
    expiresDays: 30
  },
  {
    id: 'free-sample',
    name: 'Free Sea Moss Sample',
    description: 'Try our newest flavor for free',
    creditsCost: 350,
    rewardType: 'free_product',
    rewardValue: 1200, // ~$12 value
    minimumOrder: 2000,
    tierRequirement: null,
    active: true,
    expiresDays: 60
  },
  {
    id: 'bogo-50',
    name: 'BOGO 50% Off',
    description: 'Buy one, get second 50% off',
    creditsCost: 500,
    rewardType: 'discount_percent',
    rewardValue: 25, // 25% off second item ~ 50% off one
    minimumOrder: 3600, // Price of sea moss gel
    tierRequirement: 'sprout',
    active: true,
    expiresDays: 30
  },
  {
    id: 'early-access',
    name: 'Early Access',
    description: 'Get first access to new flavors (limited spots)',
    creditsCost: 200,
    rewardType: 'experience',
    rewardValue: 0,
    minimumOrder: 0,
    tierRequirement: 'sprout',
    active: true,
    expiresDays: 90
  },
  {
    id: 'skip-line',
    name: 'Skip the Line',
    description: 'Priority pickup at any market (valid for 1 visit)',
    creditsCost: 150,
    rewardType: 'experience',
    rewardValue: 0,
    minimumOrder: 0,
    tierRequirement: 'bloom',
    active: true,
    expiresDays: 30
  },
  {
    id: 'upgrade-large',
    name: 'Free Size Upgrade',
    description: 'Upgrade any drink to large for free',
    creditsCost: 400,
    rewardType: 'free_product',
    rewardValue: 300, // ~$3 COGS difference
    minimumOrder: 0,
    tierRequirement: 'bloom',
    active: true,
    expiresDays: 30
  },
  {
    id: 'discount-25',
    name: '$25 Off',
    description: '$25 off your next order',
    creditsCost: 800,
    rewardType: 'discount_fixed',
    rewardValue: 2500,
    minimumOrder: 7500,
    tierRequirement: 'harvest',
    active: true,
    expiresDays: 60
  },
  {
    id: 'birthday-treat',
    name: 'Birthday Treat Box',
    description: 'Special curated box of goodies for your birthday month',
    creditsCost: 600,
    rewardType: 'free_product',
    rewardValue: 800, // ~$8 COGS
    minimumOrder: 0,
    tierRequirement: 'bloom',
    active: true,
    expiresDays: 31 // Birthday month only
  }
];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate credits earned from a purchase
 * @param {number} orderTotal - Order total in cents
 * @param {string} tier - Customer's current tier
 * @param {Object} options - Additional options
 * @returns {number} Credits earned
 */
export function calculatePurchaseCredits(orderTotal, tier = 'seedling', options = {}) {
  const tierConfig = TIERS[tier] || TIERS.seedling;
  const baseCredits = Math.floor(orderTotal / 100) * EARNING_RATES.perDollarSpent;
  const multiplier = tierConfig.benefits.multiplier / 2; // Normalize (base is 2)
  
  let credits = Math.round(baseCredits * multiplier);
  
  // Preorder bonus
  if (options.isPreorder) {
    credits = Math.round(credits * (1 + EARNING_RATES.preorderBonus));
  }
  
  // First purchase bonus
  if (options.isFirstPurchase) {
    credits += EARNING_RATES.firstPurchase;
  }
  
  return credits;
}

/**
 * Determine tier based on progress
 * @param {Object} progress - Customer progress
 * @returns {string} Tier ID
 */
export function determineTier(progress = {}) {
  const { purchases = 0, spent = 0, credits = 0 } = progress;
  
  // Check tiers from highest to lowest
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    const tierId = TIER_ORDER[i];
    const tier = TIERS[tierId];
    
    const meetsPurchases = purchases >= tier.requirements.purchases;
    const meetsSpent = spent >= tier.requirements.spent;
    const meetsCredits = credits >= tier.requirements.credits;
    
    // Must meet at least 2 of 3 requirements (OR logic with threshold)
    const metRequirements = [meetsPurchases, meetsSpent, meetsCredits].filter(Boolean).length;
    
    if (metRequirements >= 2 || (tierId === 'seedling')) {
      return tierId;
    }
  }
  
  return 'seedling';
}

/**
 * Check if customer qualifies for tier upgrade
 * @param {string} currentTier - Current tier
 * @param {Object} progress - Current progress
 * @returns {Object|null} Upgrade info or null
 */
export function checkTierUpgrade(currentTier, progress) {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex >= TIER_ORDER.length - 1) return null;
  
  const nextTierId = TIER_ORDER[currentIndex + 1];
  const nextTier = TIERS[nextTierId];
  
  const { purchases = 0, spent = 0, credits = 0 } = progress;
  
  const meetsPurchases = purchases >= nextTier.requirements.purchases;
  const meetsSpent = spent >= nextTier.requirements.spent;
  const meetsCredits = credits >= nextTier.requirements.credits;
  
  const metRequirements = [meetsPurchases, meetsSpent, meetsCredits].filter(Boolean).length;
  
  if (metRequirements >= 2) {
    return {
      upgraded: true,
      from: currentTier,
      to: nextTierId,
      tier: nextTier,
      newBenefits: nextTier.benefits
    };
  }
  
  // Return progress toward next tier
  return {
    upgraded: false,
    currentTier,
    nextTier: nextTierId,
    progress: {
      purchases: { current: purchases, needed: nextTier.requirements.purchases },
      spent: { current: spent, needed: nextTier.requirements.spent },
      credits: { current: credits, needed: nextTier.requirements.credits }
    }
  };
}

/**
 * Calculate expiration date for credits
 * @param {Date} fromDate - Starting date (default: now)
 * @returns {Date} Expiration date
 */
export function calculateExpiration(fromDate = new Date()) {
  const expiration = new Date(fromDate);
  expiration.setFullYear(expiration.getFullYear() + 1); // 12 months
  return expiration;
}

/**
 * Check if credits are expired
 * @param {Date} expiresAt - Expiration date
 * @returns {boolean}
 */
export function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

/**
 * Generate unique coupon code
 * @param {string} tier - Customer tier
 * @returns {string} Coupon code
 */
export function generateCouponCode(tier = 'seedling') {
  const prefix = 'GRATOG';
  const tierCode = tier.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${tierCode}-${random}`;
}

/**
 * Generate referral code
 * @param {string} customerId - Customer ID
 * @returns {string} Referral code
 */
export function generateReferralCode(customerId) {
  // Take first 8 chars of customerId + random suffix
  const idPart = customerId.slice(0, 8).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GRATEFUL-${idPart}-${random}`;
}

/**
 * Format credits for display
 * @param {number} credits
 * @returns {string}
 */
export function formatCredits(credits) {
  return credits.toLocaleString();
}

/**
 * Calculate reward value in dollars (for liability tracking)
 * @param {number} credits
 * @returns {number} Dollar value
 */
export function creditsToDollarValue(credits) {
  // 50 credits ≈ $1 (at $5 off for 250 credits)
  return credits / 50;
}

/**
 * Get tier emoji
 * @param {string} tier
 * @returns {string}
 */
export function getTierEmoji(tier) {
  return TIERS[tier]?.emoji || '🌱';
}

/**
 * Get tier color
 * @param {string} tier
 * @returns {string}
 */
export function getTierColor(tier) {
  return TIERS[tier]?.color || '#84cc16';
}

/**
 * Get eligible rewards for a tier
 * @param {string} tier
 * @returns {Array} Filtered rewards
 */
export function getEligibleRewards(tier = 'seedling') {
  const tierIndex = TIER_ORDER.indexOf(tier);
  
  return DEFAULT_REWARDS.filter(reward => {
    if (!reward.active) return false;
    if (!reward.tierRequirement) return true;
    const requiredIndex = TIER_ORDER.indexOf(reward.tierRequirement);
    return tierIndex >= requiredIndex;
  });
}

/**
 * Validate a redemption request
 * @param {Object} account - Gratitude account
 * @param {Object} reward - Reward being redeemed
 * @param {number} cartTotal - Current cart total in cents
 * @returns {Object} Validation result
 */
export function validateRedemption(account, reward, cartTotal = 0) {
  const errors = [];
  
  if (!account) {
    return { valid: false, errors: ['Account not found'] };
  }
  
  if (!reward || !reward.active) {
    return { valid: false, errors: ['Reward not available'] };
  }
  
  if (account.credits.balance < reward.creditsCost) {
    errors.push(`Insufficient credits (need ${reward.creditsCost}, have ${account.credits.balance})`);
  }
  
  if (cartTotal < reward.minimumOrder) {
    const needed = reward.minimumOrder - cartTotal;
    errors.push(`Add $${(needed / 100).toFixed(2)} more to redeem this reward`);
  }
  
  // Check tier requirement
  if (reward.tierRequirement) {
    const accountTierIndex = TIER_ORDER.indexOf(account.tier.current);
    const requiredTierIndex = TIER_ORDER.indexOf(reward.tierRequirement);
    if (accountTierIndex < requiredTierIndex) {
      errors.push(`Requires ${TIERS[reward.tierRequirement].name} tier`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate progress percentage to next tier
 * @param {string} currentTier
 * @param {Object} progress
 * @returns {number} Percentage (0-100)
 */
export function calculateTierProgress(currentTier, progress) {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex >= TIER_ORDER.length - 1) return 100;
  
  const nextTier = TIERS[TIER_ORDER[currentIndex + 1]];
  const { purchases = 0, spent = 0, credits = 0 } = progress;
  
  // Calculate progress on each metric
  const purchaseProgress = Math.min(purchases / nextTier.requirements.purchases, 1);
  const spentProgress = Math.min(spent / nextTier.requirements.spent, 1) || 0;
  const creditsProgress = Math.min(credits / nextTier.requirements.credits, 1);
  
  // Average progress (same weight as requirements check)
  return Math.round(((purchaseProgress + spentProgress + creditsProgress) / 3) * 100);
}

export default {
  TIERS,
  TIER_ORDER,
  EARNING_RATES,
  DEFAULT_REWARDS,
  calculatePurchaseCredits,
  determineTier,
  checkTierUpgrade,
  calculateExpiration,
  isExpired,
  generateCouponCode,
  generateReferralCode,
  formatCredits,
  creditsToDollarValue,
  getTierEmoji,
  getTierColor,
  getEligibleRewards,
  validateRedemption,
  calculateTierProgress
};
