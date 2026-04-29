/**
 * Waitlist number generator
 * Generates unique waitlist numbers for preorders
 */

import { createHash } from 'crypto';

// In-memory store for session-based waitlist numbers
// In production, this should use Redis or database
const waitlistStore = new Map();

const MARKET_PREFIXES = {
  'serenbe': 'S',
  'dunwoody': 'D',
  'sandy-springs': 'SS',
};

/**
 * Generate a unique waitlist number
 * Format: [MARKET_PREFIX]-[DAY_OF_MONTH][COUNTER] e.g., S-2815 (Serenbe, 28th, #15)
 */
export function generateWaitlistNumber(marketId, date = new Date()) {
  const prefix = MARKET_PREFIXES[marketId] || 'G';
  const dayOfMonth = date.getDate().toString().padStart(2, '0');
  
  // Get counter for this market/day
  const key = `${marketId}-${date.toISOString().split('T')[0]}`;
  const currentCount = waitlistStore.get(key) || 0;
  const nextCount = currentCount + 1;
  waitlistStore.set(key, nextCount);
  
  // Format: S-2815 (Serenbe, 28th, #15)
  const waitlistNumber = `${prefix}-${dayOfMonth}${nextCount.toString().padStart(2, '0')}`;
  
  return {
    waitlistNumber,
    marketPrefix: prefix,
    dayOfMonth,
    counter: nextCount,
    fullKey: key,
  };
}

/**
 * Get the current waitlist position for a market on a given date
 */
export function getWaitlistPosition(marketId, date = new Date()) {
  const key = `${marketId}-${date.toISOString().split('T')[0]}`;
  const count = waitlistStore.get(key) || 0;
  return count + 1; // Next position
}

/**
 * Validate a waitlist number format
 */
export function isValidWaitlistNumber(waitlistNumber) {
  const pattern = /^[SD]\d{2}\d{2,4}$/; // S-2815 or D-2801
  return pattern.test(waitlistNumber);
}

/**
 * Parse waitlist number to extract info
 */
export function parseWaitlistNumber(waitlistNumber) {
  const match = waitlistNumber.match(/^([SD])(\d{2})(\d{2,4})$/);
  if (!match) return null;
  
  const [, prefix, day, counter] = match;
  
  const marketMap = {
    'S': 'serenbe',
    'D': 'dunwoody',
  };
  
  return {
    prefix,
    marketId: marketMap[prefix],
    day: parseInt(day, 10),
    counter: parseInt(counter, 10),
  };
}

/**
 * Generate order number for preorders
 * Format: PRE-[TIMESTAMP]-[RANDOM]
 */
export function generatePreorderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `PRE-${timestamp}-${random}`;
}

/**
 * Clear old waitlist entries (call this periodically)
 * Keeps only last 7 days
 */
export function cleanupOldWaitlistEntries() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  
  for (const [key] of waitlistStore) {
    const keyDate = key.split('-').slice(1).join('-');
    if (new Date(keyDate) < cutoff) {
      waitlistStore.delete(key);
    }
  }
}

/**
 * Get estimated wait time based on position
 * Rough estimate: 2-3 minutes per customer at pickup
 */
export function getEstimatedWaitTime(position) {
  const minutesPerCustomer = 2.5;
  const estimatedMinutes = Math.ceil(position * minutesPerCustomer);
  
  if (estimatedMinutes < 60) {
    return `${estimatedMinutes} min`;
  }
  
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  return `${hours}h ${mins}m`;
}
