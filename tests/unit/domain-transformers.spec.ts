import { describe, expect, it } from 'vitest';
import { FINAL_TRANSFORMER_COLLECTIONS, transformDocument } from '../../scripts/migrate/transformers.mjs';

const id = '507f1f77bcf86cd799439011';
describe('critical domain transformers', () => {
  it('covers every MIGRATE/TRANSFORM collection explicitly', () => expect(FINAL_TRANSFORMER_COLLECTIONS).toHaveLength(37));
  it('normalizes an order into one parent and N items with exact cents', () => {
    const result = transformDocument('orders', { _id: id, status: 'paid', total: '12.34', createdAt: new Date(0), items: [{ name: 'A', quantity: 2, price: '6.17' }] });
    expect(result.statements.map((x) => x.table)).toEqual(['orders', 'order_items']);
    expect(result.statements[0].row.total_cents).toBe(1234);
    expect(result.statements[1].row.total_cents).toBe(1234);
  });
  it('preserves market-order totalCents without multiplying', () => expect(transformDocument('marketorders', { _id: id, totalCents: 1234, total: 12.34, items: [] }).statements[0].row.total_cents).toBe(1234));
  it('normalizes customer addresses and dollar LTV', () => {
    const result = transformDocument('customers', { _id: id, totalSpent: '12.34', addresses: [{ city: 'Sanitized' }] });
    expect(result.statements).toHaveLength(2); expect(result.statements[0].row.total_spent_cents).toBe(1234);
  });
  it('normalizes inventory variations and rejects missing product identity', () => {
    expect(transformDocument('inventory', { _id: id, productId: 'p1', variationIds: ['v1'], currentStock: 2 }).statements).toHaveLength(2);
    expect(() => transformDocument('inventory', { _id: id })).toThrow('RELATIONSHIP_MISSING');
  });
  it('preserves payment provider minor units and archives legacy null amounts', () => {
    expect(transformDocument('payment_records', { _id: id, amountCents: 1234 }).statements[0].row.amount_cents).toBe(1234);
    expect(transformDocument('payments', { _id: id, amountMoney: null }).statements[0].table).toBe('operational_records');
  });
  it('requires webhook event identity', () => {
    expect(transformDocument('webhook_events_processed', { _id: id, eventId: 'evt_1' }).statements[0].row.event_id).toBe('evt_1');
    expect(() => transformDocument('webhook_events_processed', { _id: id })).toThrow('EXTERNAL_ID_MISSING');
  });
});
