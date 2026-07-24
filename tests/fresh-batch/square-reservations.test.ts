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

vi.mock('@/lib/square-api', () => ({
  createPaymentLink: vi.fn(),
}));

// ============================================================================
// Imports after mocks
// ============================================================================

import { createReservationPaymentLink } from '@/lib/batches/square-reservations';
import { createPaymentLink } from '@/lib/square-api';

describe('fresh-batch Square reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const input = {
    reservation: {
      id: 'res-123',
      customerEmail: 'customer@example.com',
      quantity: 1,
      quantityUnit: 'gallon',
      gallonEquivalent: 1,
      finalPriceCents: 12300,
      setupFeeCents: 3500,
      marketId: 'serenbe',
    },
    batchName: 'Kissed by Gods — July 26',
    productSlug: 'kissed-by-gods',
    productionDate: new Date('2026-07-26'),
    redirectUrl: 'https://tasteofgratitude.shop/order/success?reservation=res-123',
  };

  it('creates a Square payment link with server-side price', async () => {
    vi.mocked(createPaymentLink).mockResolvedValue({
      success: true,
      data: {
        paymentLink: {
          id: 'link_abc',
          url: 'https://square.link/test',
          orderId: 'order_abc',
        },
      },
    });

    const result = await createReservationPaymentLink(input);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.squarePaymentLinkId).toBe('link_abc');
    expect(result.paymentUrl).toBe('https://square.link/test');

    const call = vi.mocked(createPaymentLink).mock.calls[0][0];
    expect(call.lineItems).toHaveLength(1);
    expect(call.lineItems[0].basePriceMoney?.amount).toBe(12300);
    expect(call.lineItems[0].name).toContain('Kissed by Gods');
    expect(call.idempotencyKey).toBe('freshbatch_reservation_res-123');
  });

  it('rejects a $0 reservation', async () => {
    const zeroInput = {
      ...input,
      reservation: { ...input.reservation, finalPriceCents: 0 },
    };

    const result = await createReservationPaymentLink(zeroInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('Reservation price must be greater than zero');
    }
    expect(createPaymentLink).not.toHaveBeenCalled();
  });

  it('surfaces Square API failures', async () => {
    vi.mocked(createPaymentLink).mockResolvedValue({
      success: false,
      errors: [{ category: 'API_ERROR', code: 'INVALID', detail: 'Bad request' }],
    });

    const result = await createReservationPaymentLink(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('Bad request');
    }
  });

  it('does not include invalid catalog object IDs', async () => {
    vi.mocked(createPaymentLink).mockResolvedValue({
      success: true,
      data: {
        paymentLink: {
          id: 'link_def',
          url: 'https://square.link/def',
        },
      },
    });

    await createReservationPaymentLink(input);

    const call = vi.mocked(createPaymentLink).mock.calls[0][0];
    // We intentionally do not set catalogObjectId because product data does
    // not contain a valid Square variation ID. The line item is ad-hoc.
    expect(call.lineItems[0].catalogObjectId).toBeUndefined();
  });
});
