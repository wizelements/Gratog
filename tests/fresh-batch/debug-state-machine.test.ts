import { describe, it, expect } from 'vitest';
import { isValidRequestTransition } from '@/lib/batches/state-machine';

describe('state-machine debug', () => {
  it('imports correctly', () => {
    expect(typeof isValidRequestTransition).toBe('function');
  });

  it('validates transitions', () => {
    expect(isValidRequestTransition('approved', 'canceled')).toBe(true);
    expect(isValidRequestTransition('requested', 'confirmed')).toBe(false);
    expect(isValidRequestTransition('completed', 'canceled')).toBe(false);
  });
});