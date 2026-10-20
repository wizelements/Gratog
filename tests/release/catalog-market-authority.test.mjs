import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

// Execute actual TypeScript modules against isolated data boundaries. No live
// database, provider or invented sellable stock is used for certification.
async function load(file, dependencies = {}) {
  const source = stripTypeScriptTypes(await readFile(new URL('../../' + file, import.meta.url), 'utf8'));
  const context = vm.createContext({ console, process: { env: {} }, URL, Date });
  const module = new vm.SourceTextModule(source, { context });
  await module.link(specifier => {
    const values = dependencies[specifier];
    if (!values) throw new Error('Unexpected dependency: ' + specifier);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}
const blue = {
  id: 'DSROEB4HMZK63V7IGBH6SSJH', name: 'Blue Lotus', source: 'square_sync',
  slug: 'blue-lotus', stock: 2, inStock: true, checkoutReady: true, price: 35,
  variations: [{ id: 'QIX6D5PRQKX4TKEMTQUJPZUX', name: '16oz', priceCents: 3500 }],
};
const curated = await load('data/products.ts');

test('curated copy cannot manufacture inventory or in-stock availability', () => {
  for (const product of curated.getCuratedStorefrontProducts()) {
    assert.equal(product.inStock, false);
    assert.equal(product.checkoutReady, false);
    assert.ok(product.stock === null || product.stock === 0);
  }
});
test('Blue Lotus $35 provider conflict stays unavailable without hidden repricing', () => {
  const product = curated.mergeWithCuratedProduct(blue);
  assert.equal(product.checkoutReady, false);
  assert.equal(product.price, 35);
  assert.equal(product.variations[0].priceCents, 3500);
});
test('Blue Lotus requires approved variation, matching price, and verified stock', () => {
  const approved = { ...blue, variations: [{ ...blue.variations[0], priceCents: 3600 }] };
  assert.equal(curated.mergeWithCuratedProduct(approved).checkoutReady, true);
  for (const stock of [null, undefined, -6, 0, '2']) {
    assert.equal(curated.mergeWithCuratedProduct({ ...approved, stock }).checkoutReady, false);
  }
  assert.equal(curated.mergeWithCuratedProduct({ ...approved, checkoutReady: false }).checkoutReady, false);
});
test('known Pineapple Mango / Vitamin Sea identity conflict cannot become payable', () => {
  const product = curated.mergeWithCuratedProduct({ ...blue,
    id: 'F2YVC7OVRYJU575JXROKFHFT', slug: 'pineapple-mango', name: 'Pineapple Mango Lemonade',
    variations: [{ id: '4YFOIFCPUXTDKDA5DU2LLQ2G', priceCents: 900 }],
  });
  assert.equal(product.checkoutReady, false);
});
async function pricing(product) {
  return load('lib/cart-pricing.ts', { './db-optimized': { connectToDatabase: async () => ({
    db: { collection: () => ({ find: () => ({ toArray: async () => [product] }) }) },
  }) } });
}
test('server cart rejects conflicting Blue Lotus price before payment', async () => {
  const app = await pricing(blue);
  await assert.rejects(app.priceCart({ items: [{ productId: blue.id, variationId: blue.variations[0].id, quantity: 1 }] }),
    { code: 'CATALOG_PRICE_UNRECONCILED' });
});
test('server cart accepts the approved $36 variant after actual catalog parity', async () => {
  const app = await pricing({ ...blue, variations: [{ ...blue.variations[0], priceCents: 3600 }] });
  const result = await app.priceCart({ items: [{ productId: blue.id, variationId: blue.variations[0].id, quantity: 1 }] });
  assert.equal(result.totalCents, 3600);
});
test('server cart rejects obsolete $10 Strawberry Bliss price', async () => {
  const product = { id: 'KZXEV24XZ2UCQUJ64BH7ZUJP', name: 'Strawberry Bliss', inStock: true,
    variations: [{ id: 'HYODQWXIJJVAPRIZ66SVUYE5', priceCents: 1000 }] };
  const app = await pricing(product);
  await assert.rejects(app.priceCart({ items: [{ productId: product.id, variationId: product.variations[0].id, quantity: 1 }] }),
    { code: 'CATALOG_PRICE_UNRECONCILED' });
});
test('market resolver rejects empty, failed, inactive and guessed location matches', async () => {
  for (const getActiveMarkets of [async () => [], async () => { throw Error('db unavailable'); },
    async () => [{ id: 'actual-id', name: 'Serenbe Farmers Market', isActive: true }],
    async () => [{ id: 'serenbe', isActive: false }]]) {
    const app = await load('lib/preorder/market-resolver.ts', { '@/lib/markets/repository': { getActiveMarkets } });
    assert.equal(await app.resolveActivePreorderMarket('serenbe'), null);
  }
});
test('market resolver accepts the exact active operational record', async () => {
  const market = { id: 'actual-id', isActive: true };
  const app = await load('lib/preorder/market-resolver.ts', {
    '@/lib/markets/repository': { getActiveMarkets: async () => [market] },
  });
  assert.equal(await app.resolveActivePreorderMarket('actual-id'), market);
});
test('market feed does not advertise fallback pickup locations on database failure', async () => {
  const app = await load('app/api/markets/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/markets/repository': { getActiveMarkets: async () => { throw Error('offline'); } },
    '@/lib/logger': { logger: { error() {} } },
    '@/lib/storefront-integrity': { buildMarketAddressLine() {}, getCanonicalMarketDirectionsUrl() {}, validateMarketDirectionsConsistency() {} },
  });
  const response = await app.GET();
  assert.equal(response.status, 503);
  assert.equal(response.body.success, false);
  assert.equal(response.body.markets.length, 0);
});
