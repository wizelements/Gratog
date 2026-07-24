/**
 * Fresh Batch Request System — volume and conversion utilities
 *
 * All physical volume math uses US fluid ounces. Public helper functions
 * convert customer quantity units into gallons and bottles, applying the
 * configured process-loss percentage.
 */

export const OUNCES_PER_BOTTLE = 16;
export const OUNCES_PER_GALLON = 128;
export const BOTTLES_PER_GALLON = OUNCES_PER_GALLON / OUNCES_PER_BOTTLE; // 8

export type QuantityUnit =
  | 'bottle_16oz'
  | 'multi_bottle'
  | 'half_gallon'
  | 'gallon'
  | 'two_gallons'
  | 'three_plus_gallons'
  | 'sample_interest';

const UNIT_GALLON_EQUIVALENTS: Record<QuantityUnit, number> = {
  bottle_16oz: 1 / BOTTLES_PER_GALLON, // 0.125
  multi_bottle: 1 / BOTTLES_PER_GALLON, // caller must multiply by quantity
  half_gallon: 0.5,
  gallon: 1,
  two_gallons: 2,
  three_plus_gallons: 3,
  sample_interest: 0,
};

/**
 * Convert a customer quantity + unit into a gallon-equivalent value.
 * `multi_bottle` is treated as `quantity` 16-oz bottles.
 */
export function toGallonEquivalent(quantity: number, unit: QuantityUnit): number {
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  if (unit === 'multi_bottle') {
    return (quantity * OUNCES_PER_BOTTLE) / OUNCES_PER_GALLON;
  }
  return quantity * UNIT_GALLON_EQUIVALENTS[unit];
}

/**
 * Convert gallons into 16-oz bottle count before process loss.
 */
export function gallonsToBottles(gallons: number): number {
  return gallons * BOTTLES_PER_GALLON;
}

/**
 * Convert gallons into total fluid ounces.
 */
export function gallonsToOunces(gallons: number): number {
  return gallons * OUNCES_PER_GALLON;
}

/**
 * Convert ounces into 16-oz bottles, rounding down to whole bottles.
 */
export function ouncesToBottles(ounces: number): number {
  return Math.floor(ounces / OUNCES_PER_BOTTLE);
}

/**
 * Apply process loss to a gross volume. Loss is a decimal (e.g., 0.08).
 */
export function effectiveYieldOunces(
  grossGallons: number,
  processLossPercentage: number
): number {
  if (!Number.isFinite(grossGallons) || grossGallons <= 0) return 0;
  if (!Number.isFinite(processLossPercentage)) return 0;
  const grossOunces = gallonsToOunces(grossGallons);
  return grossOunces * (1 - Math.max(0, Math.min(processLossPercentage, 1)));
}

/**
 * Compute how many 16 oz bottles are available for the market after
 * subtracting reserved gallons and sampling allocation.
 */
export function marketBottleCount(
  targetGallons: number,
  reservedGallons: number,
  samplingOunces: number,
  processLossPercentage: number
): number {
  if (!Number.isFinite(targetGallons) || targetGallons <= 0) return 0;
  const effectiveOunces = effectiveYieldOunces(targetGallons, processLossPercentage);
  const reservedOunces = gallonsToOunces(Math.max(0, reservedGallons));
  const availableOunces = Math.max(0, effectiveOunces - reservedOunces - Math.max(0, samplingOunces));
  return ouncesToBottles(availableOunces);
}

/**
 * Compute fluid ounces reserved for customers.
 */
export function reservedOunces(gallons: number): number {
  return gallonsToOunces(Math.max(0, gallons));
}

/**
 * Safe multiplication for cents: round to nearest integer.
 */
export function centsFromDollars(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format cents as a dollar string for display. Does not include currency symbol.
 */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return '0.00';
  return (cents / 100).toFixed(2);
}
