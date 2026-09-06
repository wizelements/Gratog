import { beforeEach, describe, expect, it, vi } from 'vitest';

const connection = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: () => connection }));

import { getPaymentStatusByOrderId } from '@/lib/payments/repository';

describe('Turso payments repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses bound order IDs and preserves Square provider metadata', async () => {
    connection.get
      .mockResolvedValueOnce({
        id: 'order-1', order_number: '1001', status: 'paid', payment_status: 'COMPLETED',
        customer_snapshot_json: JSON.stringify({ email: 'buyer@example.test' }),
        fulfillment_json: '{}', updated_at: '2026-09-06T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'payment-1', status: 'COMPLETED', amount_cents: 2948, currency: 'USD',
        receipt_url: 'https://square.test/receipt',
        provider_metadata_json: JSON.stringify({ cardLast4: '1111', cardBrand: 'VISA', amountAuthority: 'square' }),
        created_at: '2026-09-06T00:00:00.000Z', updated_at: null,
      });

    const result = await getPaymentStatusByOrderId('order-1');

    expect(connection.get.mock.calls[0][0]).toContain('WHERE id = ?');
    expect(connection.get.mock.calls[0][1]).toBe('order-1');
    expect(connection.get.mock.calls[1][0]).toContain('WHERE order_id = ?');
    expect(result?.payment).toMatchObject({ amountCents: 2948, cardLast4: '1111', amountAuthority: 'square' });
  });

  it('returns no payment without inventing a legacy amount', async () => {
    connection.get
      .mockResolvedValueOnce({
        id: 'legacy-order', order_number: null, status: 'complete', payment_status: null,
        customer_snapshot_json: null, fulfillment_json: null, updated_at: '2026-09-06T00:00:00.000Z',
      })
      .mockResolvedValueOnce(undefined);

    const result = await getPaymentStatusByOrderId('legacy-order');

    expect(result?.payment).toBeNull();
    expect(result?.order.customer).toEqual({});
  });

  it('exposes an explicitly unavailable legacy amount as null', async () => {
    connection.get
      .mockResolvedValueOnce({
        id: 'legacy-order', order_number: null, status: 'complete', payment_status: 'legacy',
        customer_snapshot_json: null, fulfillment_json: null, updated_at: '2026-09-06T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'legacy-payment', status: 'legacy', amount_cents: 0, currency: 'USD', receipt_url: null,
        provider_metadata_json: JSON.stringify({ amountAuthority: 'unavailable' }),
        created_at: null, updated_at: null,
      });

    const result = await getPaymentStatusByOrderId('legacy-order');
    expect(result?.payment).toMatchObject({ amountCents: null, amountAuthority: 'unavailable' });
  });

  it('returns null for an unknown order without querying payments', async () => {
    connection.get.mockResolvedValueOnce(undefined);
    await expect(getPaymentStatusByOrderId('missing')).resolves.toBeNull();
    expect(connection.get).toHaveBeenCalledTimes(1);
  });
});
