/**
 * Waitlist number utilities
 * 
 * DEPRECATED: generateWaitlistNumber / getWaitlistPosition — use repository.getNextWaitlistNumber()
 * Pure utility functions (parse, validate, estimate, generatePreorderNumber) kept as-is.
 */

const MARKET_PREFIXES: Record<string, string> = {
  'serenbe': 'S',
  'dunwoody': 'D',
  'sandy-springs': 'SS',
};

/**
 * @deprecated Use repository.getNextWaitlistNumber() for atomic MongoDB counters.
 * This sync fallback is kept only for backward-compat imports that haven't migrated.
 */
export function generateWaitlistNumber(_marketId: string, _date = new Date()) {
  throw new Error(
    'generateWaitlistNumber is deprecated. Use getNextWaitlistNumber from @/lib/preorder/repository instead.'
  );
}

/**
 * @deprecated Use repository-based lookup instead.
 */
export function getWaitlistPosition(_marketId: string, _date = new Date()) {
  throw new Error(
    'getWaitlistPosition is deprecated. Use findPreorderByOrderNumber from @/lib/preorder/repository instead.'
  );
}

/**
 * Validate a waitlist number format
 */
export function isValidWaitlistNumber(waitlistNumber: string) {
  const pattern = /^(SS|S|D)-\d{2}\d{2,4}$/;
  return pattern.test(waitlistNumber);
}

/**
 * Parse waitlist number to extract info
 */
export function parseWaitlistNumber(waitlistNumber: string) {
  const match = waitlistNumber.match(/^(SS|S|D)-(\d{2})(\d{2,4})$/);
  if (!match) return null;

  const [, prefix, day, counter] = match;

  const marketMap: Record<string, string> = {
    'S': 'serenbe',
    'D': 'dunwoody',
    'SS': 'sandy-springs',
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
 * Get estimated wait time based on position
 * Rough estimate: 2-3 minutes per customer at pickup
 */
export function getEstimatedWaitTime(position: number) {
  const minutesPerCustomer = 2.5;
  const estimatedMinutes = Math.ceil(position * minutesPerCustomer);

  if (estimatedMinutes < 60) {
    return `${estimatedMinutes} min`;
  }

  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  return `${hours}h ${mins}m`;
}

export { MARKET_PREFIXES };
