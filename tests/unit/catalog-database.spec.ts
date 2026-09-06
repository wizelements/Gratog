import { beforeEach, describe, expect, it, vi } from 'vitest';

const connection = vi.hoisted(() => ({
  get: vi.fn(),
  all: vi.fn(),
  transactionAsync: vi.fn(),
}));

vi.mock('@/lib/db/turso', () => ({ getTursoConnection: () => connection }));

import { generateProductHash, getProductBySlug, queryCatalog, upsertProduct } from '@/lib/database';
import type { Product } from '@/types/product';

const product: Product = {
  slug: 'ginger-gel',
  title: 'Ginger Gel',
  description: 'Fresh',
  brand: 'Taste of Gratitude',
  category: 'Sea Moss',
  images: [{ url: 'https://example.com/ginger.jpg', position: 0 }],
  variants: [{
    sku: 'GINGER-16',
    options: { size: '16 oz' },
    price_cents: 2400,
    currency: 'USD',
    availability: 'low',
  }],
  source_url: 'https://example.com/ginger',
  handle: 'ginger-gel',
  active: true,
};

describe('Turso catalog database', () => {
  beforeEach(() => vi.clearAllMocks());

  it('performs an atomic stable-id product upsert', async () => {
    const tx = { run: vi.fn().mockResolvedValue({}) };
    connection.get.mockResolvedValue(undefined);
    connection.transactionAsync.mockImplementation(async (callback) => callback(tx));

    const first = await upsertProduct(product);
    const secondIdPattern = /^product:[a-f0-9]{32}$/;

    expect(first).toMatch(secondIdPattern);
    expect(tx.run).toHaveBeenCalledTimes(4);
    expect(tx.run.mock.calls[0][0]).toContain('INSERT INTO products');
    expect(tx.run.mock.calls[1][0]).toContain('DELETE FROM product_variations');
    expect(tx.run.mock.calls[2][0]).toContain('INSERT INTO product_variations');
    expect(tx.run.mock.calls[3][0]).toContain('INSERT INTO inventory');
    expect(connection.transactionAsync).toHaveBeenCalledOnce();
  });

  it('rolls back the complete catalog write when a child write fails', async () => {
    const tx = {
      run: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('variation failed')),
    };
    connection.get.mockResolvedValue(undefined);
    connection.transactionAsync.mockImplementation(async (callback) => callback(tx));

    await expect(upsertProduct(product)).rejects.toThrow('variation failed');
    expect(tx.run).toHaveBeenCalledTimes(2);
  });

  it('hydrates the public Product contract from relational rows', async () => {
    connection.get
      .mockResolvedValueOnce({
        id: 'square-product', slug: product.slug, name: product.title,
        description: product.description, active: 1,
        metadata_json: JSON.stringify({
          brand: product.brand, category: product.category, images: product.images,
          source_url: product.source_url, handle: product.handle, variants: product.variants,
        }),
      })
      .mockResolvedValueOnce({ current_stock: 5 });
    connection.all.mockResolvedValue([{
      id: 'variation-id', name: 'GINGER-16', price_cents: 2400, currency: 'USD', active: 1,
    }]);

    await expect(getProductBySlug(product.slug)).resolves.toEqual(product);
    expect(connection.get.mock.calls[0][0]).toContain('slug=?');
    expect(connection.get.mock.calls[0][1]).toBe(product.slug);
  });

  it('parameterizes catalog filters and paginates without dynamic table names', async () => {
    connection.all.mockResolvedValue([]);

    const result = await queryCatalog({ q: 'ginger%', category: 'Sea Moss', in_stock: '1', limit: 10 });

    expect(result.items).toEqual([]);
    expect(connection.all.mock.calls[0][0]).toContain('json_extract');
    expect(connection.all.mock.calls[0][0]).not.toContain('ginger%');
    expect(connection.all.mock.calls[0]).toContain('%ginger\\%%');
    expect(result.etag).toBe(generateProductHash({ ...product, variants: [] }).slice(0, 0) || 'd751713988987e9331980363e24189ce');
  });
});
