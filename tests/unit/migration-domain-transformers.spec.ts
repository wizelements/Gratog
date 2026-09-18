import { describe, expect, it } from 'vitest';

describe('Phase 4 domain transformers', () => {
  it('projects Square/unified product identity and exact variation cents', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const result = transformDocument('unified_products', {
      _id: 'mongo-product', id: 'square-item', squareId: 'square-item', name: 'Gel', slug: 'gel',
      priceCents: 1250, variations: [{ id: 'square-variation', name: 'Jar', price: 12.5, priceCents: 1250 }],
    });
    expect(result.statements[0]).toMatchObject({ table: 'products', row: { id: 'square-item', square_catalog_id: 'square-item' } });
    expect(result.statements[1]).toMatchObject({ table: 'product_variations', row: { id: 'square-variation', product_id: 'square-item', price_cents: 1250 } });
  });

  it('preserves storefront enrichment metadata from unified products', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const result = transformDocument('unified_products', {
      _id: 'mongo-rich', id: 'square-rich', name: 'Rich Gel', slug: 'rich-gel',
      image: '/rich.jpg', benefitStory: 'A real benefit story for this product.',
      ingredients: ['Sea Moss', 'Ginger'], benefits: ['Daily wellness'],
      variations: [{ id: 'variation-rich', name: 'Jar', priceCents: 1500 }],
    });
    const metadata = JSON.parse(result.statements[0].row.metadata_json);
    expect(metadata).toMatchObject({
      images: ['/rich.jpg'],
      benefitStory: 'A real benefit story for this product.',
      ingredients: ['Sea Moss', 'Ginger'],
      benefits: ['Daily wellness'],
    });
  });

  it('preserves a duplicate source slug in metadata while generating stable unique target slugs', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const context = { productSlugCounts: new Map([['same-name', 2]]) };
    const result = transformDocument('unified_products', { _id: 'mongo', id: 'SQUARE12345678', name: 'Same Name', slug: 'same-name', variations: [] }, context);
    expect(result.statements[0].row.slug).toBe('same-name-12345678');
    expect(JSON.parse(result.statements[0].row.metadata_json).sourceSlug).toBe('same-name');
  });

  it('normalizes modern dollars, Square-sync cents, and sparse legacy item subtotals', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const modern = transformDocument('orders', { _id: 'new', total: 12.34, totalCents: 1234, items: [] });
    const square = transformDocument('orders', { _id: 'square', source: 'square_sync', total: 1234, items: [{ price: 617, quantity: 2 }] });
    const sparse = transformDocument('orders', { _id: 'legacy', items: [{ price: 6.17, quantity: 2, subtotal: 12.34 }] });
    expect(modern.statements[0].row.total_cents).toBe(1234);
    expect(square.statements[0].row.total_cents).toBe(1234);
    expect(square.statements[1].row.unit_price_cents).toBe(617);
    expect(sparse.statements[0].row.total_cents).toBe(1234);
  });

  it('links only deterministic customer identities and preserves guests', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const context = { customerByEmail: new Map([['buyer@example.test', 'customer-1']]) };
    const linked = transformDocument('orders', { _id: 'linked', totalCents: 100, customerEmail: ' Buyer@Example.Test ', items: [] }, context);
    const guest = transformDocument('orders', { _id: 'guest', totalCents: 100, items: [] }, context);
    expect(linked.statements[0].row.customer_id).toBe('customer-1');
    expect(guest.statements[0].row.customer_id).toBeNull();
  });

  it('preserves an unmatched legacy market reference without violating the foreign key', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const result = transformDocument('marketorders', { _id: 'market-order', marketId: 'retired-market', totalCents: 500, items: [] }, { marketByReference: new Map() });
    expect(result.statements[0].row.market_id).toBeNull();
    expect(JSON.parse(result.statements[0].row.fulfillment_json).legacyMarketId).toBe('retired-market');
  });

  it('links only known payment orders and preserves unmatched provider references', async () => {
    const { transformDocument } = await import('../../scripts/migrate/transformers.mjs');
    const context = { orderByReference: new Map([['square-order', 'mongo-order']]) };
    const linked = transformDocument('payment_records', { _id: 'p1', orderId: 'square-order', amountCents: 100 }, context);
    const unmatched = transformDocument('payment_records', { _id: 'p2', orderId: 'external-order', amountCents: 100 }, context);
    expect(linked.statements[0].row.order_id).toBe('mongo-order');
    expect(unmatched.statements[0].row.order_id).toBeNull();
    expect(JSON.parse(unmatched.statements[0].row.provider_metadata_json).legacyOrderId).toBe('external-order');
  });
});
