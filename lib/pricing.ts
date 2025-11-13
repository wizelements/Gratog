/**
 * Pricing utilities
 */
import { getSquareClient } from './square';

export { getSquareClient };

// Re-export for backwards compatibility
export const square = getSquareClient;

export interface PriceCalculation {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export function calculatePrice(items: any[]): PriceCalculation {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total,
    currency: 'USD'
  };
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}
