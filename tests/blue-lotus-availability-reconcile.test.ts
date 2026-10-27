import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mergeWithCuratedProduct } from '@/data/products';
import { checkInventoryForPayment } from '@/lib/custom-inventory';
import { normalizeRequestInput } from '@/lib/batches/validation';
import { toGallonEquivalent } from '@/lib/batches/quantity-converter';
import { getSquareCatalog } from '@/lib/square-api-edge';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');
afterEach(() => vi.unstubAllGlobals());

describe('Blue Lotus genuine availability / Square catalog reconciliation', () => {
  it('does not claim a negative-stock 16oz Blue Lotus can complete checkout', () => {
    const live = mergeWithCuratedProduct({
      id: 'DSROEB4HMZK63V7IGBH6SSJH', slug: 'blue-lotus', name: 'Blue Lotus',
      source: 'square_sync', stock: -6, inStock: false, preorderOnly: true,
      checkoutReady: true, price: 36,
      variations: [{ id: 'QIX6D5PRQKX4TKEMTQUJPZUX', name: '16oz', priceCents: 3600 }],
    });
    expect(live.price).toBe(36);
    expect(live.variations).toHaveLength(1);
    expect(live.checkoutReady).toBe(false);
    expect(live.isPreorder).toBe(false);
    expect(live.checkoutUnavailableReason).toMatch(/next confirmed batch/i);
  });

  it('prevents a payment before Square when inventory is negative or missing', async () => {
    const makeDb = (records: any[]) => ({
      collection: () => ({
        find: () => ({ project: () => ({ toArray: async () => records }) }),
      }),
    });
    const lines = [{ productId: 'DSROEB4HMZK63V7IGBH6SSJH', quantity: 1 }];
    expect(await checkInventoryForPayment(makeDb([{productId:lines[0].productId,currentStock:-6}]),lines))
      .toMatchObject({ valid:false,code:'INVENTORY_UNAVAILABLE' });
    expect(await checkInventoryForPayment(makeDb([]),lines))
      .toMatchObject({ valid:false,code:'INVENTORY_UNAVAILABLE' });
    expect(await checkInventoryForPayment(makeDb([{productId:lines[0].productId,currentStock:2,stockVerified:true}]),lines))
      .toEqual({valid:true});
    // Two order lines cannot evade the aggregate stock requirement.
    expect(await checkInventoryForPayment(makeDb([{productId:lines[0].productId,currentStock:1}]),[...lines,...lines]))
      .toMatchObject({valid:false,code:'INVENTORY_UNAVAILABLE'});
    const api = read('app/api/payments/route.ts');
    expect(api.indexOf('const stockAdmission = await checkInventoryForPayment(db, order.items);'))
      .toBeLessThan(api.indexOf('const atomicTransition = await db.collection'));
  });

  it('accepts a specific no-charge 16oz gel jar request without accepting gallon or sample variants', () => {
    const fields = {
      email: 'request@example.invalid', phone: null,
      requestedProductSlug: 'blue-lotus-gel', flavorProfile: null, requestedFlavorText: null,
      quantity: 1, quantityUnit: 'jar_16oz', preferredMarketId: 'georgia_online_inquiry',
      needByDate: null, notes: null, requestSource: 'product_page',
      marketingEmailConsent: false,
    };
    expect(normalizeRequestInput(fields).quantityUnit).toBe('jar_16oz');
    expect(toGallonEquivalent(1, 'jar_16oz')).toBe(0.125);
    expect(() => normalizeRequestInput({...fields,requestedProductSlug:'calm-waters'})).toThrow();
    const page = read('app/product/[slug]/ProductDetailClient.jsx');
    expect(page).toContain('/request-a-flavor?product=blue-lotus-gel');
    expect(page).toContain('before collecting payment');
  });

  it('shows only canonical Calm Waters on the public Square catalog feed', async () => {
    vi.stubEnv('SQUARE_ACCESS_TOKEN','sandbox-test-not-real');
    vi.stubEnv('SQUARE_ENVIRONMENT','sandbox');
    const mk = (id: string, name: string) => ({
      id, type: 'ITEM', item_data: {name, variations:[{
        item_variation_data:{name:'Regular',price_money:{amount:1199,currency:'USD'}}
      }]},
    });
    vi.stubGlobal('fetch',vi.fn(async()=>({
      ok:true,
      json:async()=>({objects:[
        mk('CIEYXH3G7FHAST6DLWMCFYS5','Calm Waters'),
        mk('NOD76PUJZP7QRJ2YTHY7S3K5','Calm waters '),
      ]}),
    })));
    const products = await getSquareCatalog({limit:99,category:null});
    expect(products.map(p=>p.id)).toEqual(['CIEYXH3G7FHAST6DLWMCFYS5']);
    expect(products[0].price).toBe(11.99);
  });
});
