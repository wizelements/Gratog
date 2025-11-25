/**
 * Money conversion utilities for Square API
 * Square uses integer cents for all monetary values
 */

// Convert USD dollars to cents (Square format)
export const toCents = (usd: number): number => Math.round(usd * 100);

// Convert cents to USD dollars
export const fromCents = (cents?: { amount?: bigint | number; currency?: string }): number => {
  if (!cents?.amount) return 0;
  const amount = typeof cents.amount === 'bigint' ? Number(cents.amount) : cents.amount;
  return amount / 100;
};

// Legacy alias for backwards compatibility
export const fromSquareMoney = fromCents;

// Legacy aliases for backwards compatibility
export const toMoney = fromCents;
export const fromMoney = toCents;

// Create Square Money object from USD amount
export const toSquareMoney = (usd: number, currency = 'USD') => ({
  amount: BigInt(toCents(usd)),
  currency
});

// Format money for display
export const formatMoney = (cents?: { amount?: bigint | number; currency?: string }): string => {
  if (!cents?.amount) return '$0.00';
  const dollars = fromCents(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cents.currency || 'USD'
  }).format(dollars);
};

// Calculate percentage
export const calculatePercentage = (amount: number, percentage: number): number => {
  return Math.round(amount * (percentage / 100));
};

// Apply discount
export const applyDiscount = (originalAmount: number, discountAmount: number): number => {
  return Math.max(0, originalAmount - discountAmount);
};

// Calculate tax
export const calculateTax = (subtotal: number, taxRate: number): number => {
  return Math.round(subtotal * (taxRate / 100));
};

// Validate money amount
export const isValidMoneyAmount = (amount: any): boolean => {
  if (typeof amount === 'number') {
    return amount >= 0 && Number.isFinite(amount);
  }
  if (typeof amount === 'bigint') {
    return amount >= BigInt(0);
  }
  return false;
};

// Round to nearest cent
export const roundToCents = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

// Convert various money formats to consistent format
export const normalizeMoney = (amount: any): { amount: number; currency: string } => {
  let normalizedAmount = 0;
  let currency = 'USD';
  
  if (typeof amount === 'number') {
    normalizedAmount = amount;
  } else if (typeof amount === 'bigint') {
    normalizedAmount = Number(amount) / 100;
  } else if (amount && typeof amount === 'object') {
    if (amount.amount) {
      normalizedAmount = typeof amount.amount === 'bigint' 
        ? Number(amount.amount) / 100 
        : amount.amount / 100;
    }
    if (amount.currency) {
      currency = amount.currency;
    }
  }
  
  return { amount: roundToCents(normalizedAmount), currency };
};
