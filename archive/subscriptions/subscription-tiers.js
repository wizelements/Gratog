/**
 * Subscription Tier Definitions & Validation Helpers
 * Shared between API routes and tests
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const SUBSCRIPTION_TIERS = {
  daily_gel_club: {
    name: 'Daily Gel Club',
    description: '1 Sea Moss Gel (16oz) per month',
    squarePlanId: process.env.SQUARE_PLAN_DAILY_GEL,
    price: 3199,
    retailValue: 3600,
    discount: 0.11,
    mrrTarget: 8000,
    benefits: ['Choose flavor or rotate monthly', 'Market pickup priority', '11% savings'],
    productIds: ['gel_1', 'gel_2', 'gel_3', 'gel_4', 'gel_5'],
  },
  glow_getters_bundle: {
    name: 'Glow Getters Bundle',
    description: '1 Sea Moss Gel + 3 Wellness Shots',
    squarePlanId: process.env.SQUARE_PLAN_GLOW_GETTERS,
    price: 4499,
    retailValue: 5100,
    discount: 0.12,
    mrrTarget: 3600,
    benefits: ['Premium gel + 3 wellness shots', 'Priority fulfillment', 'Market pickup priority'],
    productIds: ['gel_1', 'shot_1', 'shot_2', 'shot_3'],
  },
  recovery_duo: {
    name: 'Recovery Duo',
    description: '2 Sea Moss Gels (16oz each) per month',
    squarePlanId: process.env.SQUARE_PLAN_RECOVERY_DUO,
    price: 6199,
    retailValue: 7200,
    discount: 0.14,
    mrrTarget: 2170,
    benefits: ['2 gels per month', 'Mix & match flavors', 'Market pickup priority', 'Best value'],
    productIds: ['gel_1', 'gel_2', 'gel_3', 'gel_4', 'gel_5'],
  },
  starter_sips: {
    name: 'Starter Sips',
    description: '6 Wellness Shots (2oz each) per month',
    squarePlanId: process.env.SQUARE_PLAN_STARTER_SIPS,
    price: 2499,
    retailValue: 3000,
    discount: 0.17,
    mrrTarget: 1250,
    benefits: ['6 wellness shots', 'Local pickup preferred', 'Entry-level price'],
    productIds: ['shot_1', 'shot_2', 'shot_3', 'shot_4', 'shot_5'],
  },
};

export const PAYMENT_RETRY_SCHEDULE = {
  attempt_1: { dayOffset: 0, delayHours: 0 },
  attempt_2: { dayOffset: 2, delayHours: 0 },
  attempt_3: { dayOffset: 4, delayHours: 0 },
  attempt_4: { dayOffset: 6, delayHours: 0 },
};

export function sanitizeString(value, { toLower = false } = {}) {
  if (typeof value !== 'string') return '';
  const sanitized = value.trim().replace(/[<>]/g, '');
  return toLower ? sanitized.toLowerCase() : sanitized;
}

export function getNextRetryDate(attemptNum, now = new Date()) {
  const schedule = Object.values(PAYMENT_RETRY_SCHEDULE)[attemptNum - 1];
  if (!schedule) return null;
  const retryDate = new Date(now);
  retryDate.setDate(retryDate.getDate() + schedule.dayOffset);
  return retryDate;
}

export function validateCreatePayload(payload = {}) {
  const errors = [];

  if (!payload.planId || !SUBSCRIPTION_TIERS[payload.planId]) {
    errors.push('Invalid subscription plan');
  }

  if (!payload.customerEmail || !EMAIL_REGEX.test(payload.customerEmail)) {
    errors.push('Valid customerEmail is required');
  }

  if (!payload.customerPhone || !PHONE_REGEX.test(payload.customerPhone)) {
    errors.push('Valid customerPhone is required (E.164 format)');
  }

  if (
    payload.planId &&
    SUBSCRIPTION_TIERS[payload.planId] &&
    !SUBSCRIPTION_TIERS[payload.planId].squarePlanId
  ) {
    errors.push(`Square plan ID is not configured for ${payload.planId}`);
  }

  return { valid: errors.length === 0, errors };
}
