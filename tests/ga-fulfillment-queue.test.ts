import { describe, it, expect } from 'vitest';
import { shouldUseQueue } from '@/lib/queue-integration';

describe('market queue routing isolates appointment pickup', () => {
  it('never routes a non-market pickup to a farmers-market queue', () => {
    expect(shouldUseQueue('pickup_appointment', { marketId: 'serenbe' })).toBe(false);
    expect(shouldUseQueue('pickup', { mode: 'appointment', marketId: 'serenbe' })).toBe(false);
    expect(shouldUseQueue('pickup', { marketId: '507f1f77bcf86cd799439011' })).toBe(false);
  });
  it('retains the known verified market queue cases', () => {
    expect(shouldUseQueue('pickup', { marketId: 'serenbe', mode: 'market' })).toBe(true);
    expect(shouldUseQueue('pickup_dunwoody', { marketId: 'dunwoody', mode: 'market' })).toBe(true);
    expect(shouldUseQueue('shipping', { marketId: '' })).toBe(false);
    expect(shouldUseQueue('delivery', { marketId: '' })).toBe(false);
  });
});
