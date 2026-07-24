import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Shared mock handles (hoisted)
// ============================================================================

const mockHandles = vi.hoisted(() => {
  const mockCollection = {
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
  return { mockCollection, mockDb };
});

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockHandles.mockDb }),
}));

// ============================================================================
// Imports after mocks
// ============================================================================

import { normalizeRequestInput, containsHealthClaims } from '@/lib/batches/validation';
import {
  toGallonEquivalent,
  gallonsToBottles,
  effectiveYieldOunces,
  marketBottleCount,
  calculateReservationPrice,
} from '@/lib/batches/quantity-converter';
import { calculateReservationPrice, setupFeeCents, standardGallonPriceCents } from '@/lib/batches/pricing';
import { DEFAULT_BATCH_OWNER_CONFIG } from '@/lib/batches/types';

describe('fresh-batch request form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    email: 'customer@example.com',
    requestedProductSlug: 'kissed-by-gods',
    quantity: 1,
    quantityUnit: 'gallon',
    preferredMarketId: 'serenbe',
    requestSource: 'homepage_hero',
    marketingEmailConsent: false,
    smsConsent: false,
  };

  it('accepts a valid known-flavor request', () => {
    const result = normalizeRequestInput(validInput);
    expect(result.email).toBe('customer@example.com');
    expect(result.requestedProductSlug).toBe('kissed-by-gods');
    expect(result.quantityUnit).toBe('gallon');
  });

  it('rejects missing email', () => {
    expect(() => normalizeRequestInput({ ...validInput, email: '' })).toThrow('Email address is required');
  });

  it('rejects invalid email', () => {
    expect(() =>
      normalizeRequestInput({ ...validInput, email: 'not-an-email' })
    ).toThrow('Valid email address is required');
  });

  it('rejects missing quantity', () => {
    expect(() =>
      normalizeRequestInput({ ...validInput, quantity: 0 })
    ).toThrow('Quantity must be at least 1');
  });

  it('rejects missing market', () => {
    expect(() =>
      normalizeRequestInput({ ...validInput, preferredMarketId: '' })
    ).toThrow('Preferred pickup market is required');
  });

  it('accepts flavor profile when product slug is absent', () => {
    const result = normalizeRequestInput({
      ...validInput,
      requestedProductSlug: null,
      flavorProfile: 'tropical',
    });
    expect(result.flavorProfile).toBe('tropical');
  });

  it('accepts free-text flavor when product and profile are absent', () => {
    const result = normalizeRequestInput({
      ...validInput,
      requestedProductSlug: null,
      flavorProfile: null,
      requestedFlavorText: 'mango-pineapple lemonade',
    });
    expect(result.requestedFlavorText).toBe('mango-pineapple lemonade');
  });

  it('rejects when no flavor information is provided', () => {
    expect(() =>
      normalizeRequestInput({
        ...validInput,
        requestedProductSlug: null,
        flavorProfile: null,
        requestedFlavorText: '',
      })
    ).toThrow('Please select a flavor, a flavor profile, or describe a flavor.');
  });

  it('rejects SMS consent without phone', () => {
    expect(() =>
      normalizeRequestInput({
        ...validInput,
        phone: null,
        smsConsent: true,
      })
    ).toThrow('SMS consent requires a phone number.');
  });

  it('requires need-by date to be at least 48 hours in the future', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(() =>
      normalizeRequestInput({ ...validInput, needByDate: tomorrow })
    ).toThrow('Need-by date must be at least 48 hours in the future');
  });

  it('flags health-claim language in notes', () => {
    expect(containsHealthClaims('This drink helps with my diabetes.')).toBe(true);
    expect(containsHealthClaims('I love the basil and lemon flavor.')).toBe(false);
  });
});

describe('fresh-batch volume math', () => {
  it('converts gallons and bottles correctly', () => {
    expect(toGallonEquivalent(1, 'gallon')).toBe(1);
    expect(toGallonEquivalent(1, 'half_gallon')).toBe(0.5);
    expect(toGallonEquivalent(1, 'bottle_16oz')).toBe(0.125);
    expect(toGallonEquivalent(4, 'multi_bottle')).toBe(0.5);
    expect(gallonsToBottles(1)).toBe(8);
    expect(gallonsToBottles(5)).toBe(40);
  });

  it('applies process loss correctly', () => {
    expect(effectiveYieldOunces(5, 0.08)).toBe(640 * 0.92); // 588.8
    expect(effectiveYieldOunces(5, 0)).toBe(640);
  });

  it('calculates market bottle count after reservation and sampling', () => {
    // 5 gallons, 1 reserved, 16 oz samples, 8% loss => 27 market bottles
    expect(marketBottleCount(5, 1, 16, 0.08)).toBe(27);
  });
});

describe('fresh-batch pricing', () => {
  it('derives gallon price from curated lemonade bottle price', () => {
    expect(standardGallonPriceCents('kissed-by-gods')).toBe(8800);
    expect(standardGallonPriceCents('strawberry-bliss')).toBe(8000);
  });

  it('returns null for unknown product slug', () => {
    expect(standardGallonPriceCents('nonexistent-flavor')).toBeNull();
  });

  it('uses category-specific setup fee', () => {
    expect(setupFeeCents('kissed-by-gods', null)).toBe(
      DEFAULT_BATCH_OWNER_CONFIG.setupFeeCentsLemonade
    );
  });

  it('calculates reservation price, deposit, and balance', () => {
    const price = calculateReservationPrice(1, 8800, 3500, 0.5);
    expect(price.finalPriceCents).toBe(12300); // $88 + $35 setup
    expect(price.depositCents).toBe(6150); // 50%
    expect(price.balanceDueCents).toBe(6150);
  });
});
