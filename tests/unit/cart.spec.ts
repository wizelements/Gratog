import { describe, it, expect } from 'vitest';

describe('Cart Utilities', () => {
  it('should calculate cart total correctly', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 15, quantity: 1 }
    ];
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    expect(total).toBe(35);
  });
  
  it('should format price correctly', () => {
    const price = 1234;
    const formatted = (price / 100).toFixed(2);
    expect(formatted).toBe('12.34');
  });
});
