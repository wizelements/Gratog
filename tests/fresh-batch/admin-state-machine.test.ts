import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks (hoisted)
// ============================================================================

const mockHandles = vi.hoisted(() => {
  const mockCollection = {
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    countDocuments: vi.fn().mockResolvedValue(0),
    updateMany: vi.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 }),
    updateOne: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
      limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
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

import {
  isValidRequestTransition,
  isValidBatchTransition,
  isValidReservationPaymentTransition,
  canCreatePaymentLink,
  canApproveBatch,
  canCancelBatch,
} from '@/lib/batches/state-machine';

describe('fresh-batch state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request transitions', () => {
    it('allows new → collecting_demand', () => {
      expect(isValidRequestTransition('requested', 'collecting_demand')).toBe(true);
    });

    it('allows owner_review → approved', () => {
      expect(isValidRequestTransition('owner_review', 'approved')).toBe(true);
    });

    it('allows approved → reservation_offered', () => {
      expect(isValidRequestTransition('approved', 'reservation_offered')).toBe(true);
    });

    it('allows reservation_offered → confirmed', () => {
      expect(isValidRequestTransition('reservation_offered', 'confirmed')).toBe(true);
    });

    it('allows any state → canceled when not terminal', () => {
      expect(isValidRequestTransition('approved', 'canceled')).toBe(true);
      expect(isValidRequestTransition('reservation_offered', 'canceled')).toBe(true);
    });

    it('rejects completed → canceled', () => {
      expect(isValidRequestTransition('completed', 'canceled')).toBe(false);
    });

    it('rejects canceled → any', () => {
      expect(isValidRequestTransition('canceled', 'approved')).toBe(false);
    });

    it('rejects requested → confirmed without payment', () => {
      expect(isValidRequestTransition('requested', 'confirmed')).toBe(false);
    });

    it('considers same-state transitions valid', () => {
      expect(isValidRequestTransition('approved', 'approved')).toBe(true);
    });
  });

  describe('batch transitions', () => {
    it('allows collecting_interest → owner_review', () => {
      expect(isValidBatchTransition('collecting_interest', 'owner_review')).toBe(true);
    });

    it('allows owner_review → confirmed', () => {
      expect(isValidBatchTransition('owner_review', 'confirmed')).toBe(true);
    });

    it('allows confirmed → reservations_open', () => {
      expect(isValidBatchTransition('confirmed', 'reservations_open')).toBe(true);
    });

    it('allows reservations_open → fully_reserved', () => {
      expect(isValidBatchTransition('reservations_open', 'fully_reserved')).toBe(true);
    });

    it('rejects draft-equivalent collecting_interest → in_production without confirmation', () => {
      expect(isValidBatchTransition('collecting_interest', 'in_production')).toBe(false);
    });

    it('rejects canceled → reservations_open', () => {
      expect(isValidBatchTransition('canceled', 'reservations_open')).toBe(false);
    });

    it('rejects sold_out → reservations_open', () => {
      expect(isValidBatchTransition('sold_out', 'reservations_open')).toBe(false);
    });
  });

  describe('reservation payment transitions', () => {
    it('allows pending → fully_paid', () => {
      expect(isValidReservationPaymentTransition('pending', 'fully_paid')).toBe(true);
    });

    it('allows pending → deposit_paid', () => {
      expect(isValidReservationPaymentTransition('pending', 'deposit_paid')).toBe(true);
    });

    it('allows deposit_paid → fully_paid', () => {
      expect(isValidReservationPaymentTransition('deposit_paid', 'fully_paid')).toBe(true);
    });

    it('allows fully_paid → refunded', () => {
      expect(isValidReservationPaymentTransition('fully_paid', 'refunded')).toBe(true);
    });

    it('rejects refunded → fully_paid', () => {
      expect(isValidReservationPaymentTransition('refunded', 'fully_paid')).toBe(false);
    });

    it('reverses failed → pending for retry', () => {
      expect(isValidReservationPaymentTransition('failed', 'pending')).toBe(true);
    });
  });

  describe('transition conditions', () => {
    it('requires price, market, and production date for batch approval', () => {
      expect(canApproveBatch({ hasPrice: false, hasMarketId: true, hasProductionDate: true }).ok).toBe(false);
      expect(canApproveBatch({ hasPrice: true, hasMarketId: false, hasProductionDate: true }).ok).toBe(false);
      expect(canApproveBatch({ hasPrice: true, hasMarketId: true, hasProductionDate: false }).ok).toBe(false);
      expect(canApproveBatch({ hasPrice: true, hasMarketId: true, hasProductionDate: true }).ok).toBe(true);
    });

    it('only allows payment links for confirmed or open batches', () => {
      expect(canCreatePaymentLink('confirmed').ok).toBe(true);
      expect(canCreatePaymentLink('reservations_open').ok).toBe(true);
      expect(canCreatePaymentLink('fully_reserved').ok).toBe(true);
      expect(canCreatePaymentLink('collecting_interest').ok).toBe(false);
      expect(canCreatePaymentLink('canceled').ok).toBe(false);
    });

    it('prevents canceling a batch with paid reservations', () => {
      expect(canCancelBatch('confirmed', true).ok).toBe(false);
      expect(canCancelBatch('confirmed', false).ok).toBe(true);
      expect(canCancelBatch('completed', false).ok).toBe(false);
    });
  });
});
