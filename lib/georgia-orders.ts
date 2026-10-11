/**
 * Taste of Gratitude accepts pickup orders at Georgia markets and delivers or
 * ships eligible items only to Georgia destinations.
 *
 * This is a service boundary, not a geographic proof of residency. Validating
 * ZIP and state together prevents obvious contradictory addresses; actual
 * address verification and product eligibility remain separate requirements.
 */
export const GEORGIA_ONLY_NOTICE =
  'Taste of Gratitude currently accepts orders for fulfillment in Georgia only. Market pickup and eligible Georgia delivery or shipping are subject to availability.';

export const GEORGIA_ONLY_ERROR =
  'We currently fulfill orders in Georgia only. Please enter a Georgia delivery or shipping address, or choose a Georgia market pickup.';

export interface DestinationAddress {
  state?: unknown;
  zip?: unknown;
  country?: unknown;
  countryCode?: unknown;
}

export function validateGeorgiaDestination(address: DestinationAddress | null | undefined): {
  valid: boolean;
  code: 'GEORGIA_ONLY' | 'ADDRESS_REQUIRED';
  message: string;
} {
  if (!address || !address.state || !address.zip) {
    return { valid: false, code: 'ADDRESS_REQUIRED', message: 'A Georgia state and ZIP code are required.' };
  }
  const state = String(address.state).trim().toUpperCase();
  const zip = String(address.zip).trim();
  const country = String(address.countryCode || address.country || 'US').trim().toUpperCase();
  const countryOk = ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(country);
  const zipFormatOk = /^\d{5}(?:-\d{4})?$/.test(zip);
  const prefix = Number(zip.slice(0, 3));
  // USPS Georgia ZIP prefix blocks: 300–319 and 398–399.
  const georgiaZip = zipFormatOk && ((prefix >= 300 && prefix <= 319) || (prefix >= 398 && prefix <= 399));

  if (!['GA', 'GEORGIA'].includes(state) || !countryOk || !georgiaZip) {
    return { valid: false, code: 'GEORGIA_ONLY', message: GEORGIA_ONLY_ERROR };
  }
  return { valid: true, code: 'GEORGIA_ONLY', message: '' };
}
