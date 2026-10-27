import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const live = {
  id: 'KZXEV24XZ2UCQUJ64BH7ZUJP', slug: 'strawberry-bliss', name: 'Strawberry Bliss',
  priceCents: 1199, stock: 4, checkoutReady: true, inStock: true,
  variationId: 'HYODQWXIJJVAPRIZ66SVUYE5',
  variations: [{ id: 'HYODQWXIJJVAPRIZ66SVUYE5', name: '16oz', priceCents: 1199 }],
};

async function app(products = [live], failCatalog = false) {
  const state = { catalogReads: 0, networkCalls: 0 };
  const context = vm.createContext({ console, URL, Request, process: { env: {} },
    fetch() { state.networkCalls++; throw Error('UNEXPECTED_NETWORK_CALL'); } });
  const modules = new Map();
  async function load(path) {
    if (modules.has(path)) return modules.get(path);
    const text = stripTypeScriptTypes(await readFile(new URL('../../' + path, import.meta.url), 'utf8'));
    const module = new vm.SourceTextModule(text, { context });
    modules.set(path, module);
    await module.link(async name => {
      if (name === '@/lib/merchant-pricing') return load('lib/merchant-pricing.ts');
      if (name === '@/data/products') return load('data/products.ts');
      if (name === '@/lib/label-commerce') return load('lib/label-commerce.ts');
      const dependencies = name === '@/lib/storefront-products' ? {
        async getStorefrontCatalogSnapshot() {
          state.catalogReads++;
          if (failCatalog) throw Error('CATALOG_OFFLINE');
          return { products };
        },
      } : name === 'next/server' ? {
        NextRequest: Request,
        NextResponse: { redirect: (url, options) => ({ url: String(url), ...options }) },
      } : null;
      // A new Square/payment/network dependency fails this regression rather
      // than being silently mocked into a passing financial test.
      if (!dependencies) throw Error('UNEXPECTED_DEPENDENCY: ' + name);
      return new vm.SyntheticModule(Object.keys(dependencies), function () {
        for (const [key, value] of Object.entries(dependencies)) this.setExport(key, value);
      }, { context });
    });
    return module;
  }
  const route = await load('app/api/label-checkout/route.ts');
  await route.evaluate();
  return { route: route.namespace, labels: modules.get('lib/label-commerce.ts').namespace, state };
}
function request(fields) {
  return new Request('https://isolated-preview.example/api/label-checkout', {
    method: 'POST', body: new URLSearchParams(fields),
  });
}

test('label POST resolves product identity and redirects to canonical purchase entry with no provider call', async () => {
  const { route, state } = await app();
  const response = await route.POST(request({ slug: 'strawberry-bliss', quantity: '6', market: 'invented', price: '0.01' }));
  assert.equal(response.status, 303);
  assert.equal(response.url, 'https://isolated-preview.example/product/strawberry-bliss?source=label');
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(state.catalogReads, 1);
  assert.equal(state.networkCalls, 0);
});

test('caller-controlled redirects and unknown slugs cannot leave the canonical site', async () => {
  const { route, state } = await app();
  for (const slug of ['https://attacker.example/pay', '//attacker.example', 'unknown-label']) {
    const response = await route.POST(request({ slug, returnUrl: 'https://attacker.example/pay', paid: '1' }));
    assert.equal(response.url, 'https://isolated-preview.example/catalog?source=label');
  }
  assert.equal(state.networkCalls, 0);
});

test('malformed forms cannot create charges or require any catalog access', async () => {
  const { route, state } = await app();
  const response = await route.POST(new Request('https://isolated-preview.example/api/label-checkout', { method: 'POST', body: '{broken' }));
  assert.equal(response.url, 'https://isolated-preview.example/catalog?source=label');
  assert.equal(state.catalogReads, 0);
  assert.equal(state.networkCalls, 0);
});

test('curated or disconnected catalog cannot quote a current sale or allow a payment', async () => {
  const { labels, state } = await app([], true);
  const result = await labels.resolveLabelProduct('strawberry-bliss');
  assert.equal(result.payable, false);
  assert.equal(result.product.priceVerified, false);
  assert.equal(result.product.priceCents, null);
  assert.equal(result.productPath, '/product/strawberry-bliss');
  assert.equal(state.networkCalls, 0);
});

test('label quote requires matching variation cents and verified positive stock', async () => {
  const { labels } = await app();
  assert.equal(labels.resolveLabelProductFromCatalog('strawberry-bliss', [live]).product.priceCents, 1199);
  for (const override of [{ stock: -1 }, { stock: null }, { checkoutReady: false },
    { priceCents: 1000 }, { variations: [] }]) {
    const resolved = labels.resolveLabelProductFromCatalog('strawberry-bliss', [{ ...live, ...override }]);
    assert.equal(resolved.product.priceCents, null);
    assert.equal(resolved.payable, false);
  }
});

test('known Vitamin Sea identity conflict cannot redirect to a misnamed payable product', async () => {
  const bad = { ...live, id: 'F2YVC7OVRYJU575JXROKFHFT', name: 'Pineapple Mango Lemonade', slug: 'pineapple-mango-lemonade' };
  const { route } = await app([bad]);
  assert.equal((await route.POST(request({ slug: 'pineapple-mango' }))).url,
    'https://isolated-preview.example/catalog?source=label');
});

test('QR page offers canonical discovery without a separate payment form or URL-based paid confirmation', async () => {
  const source = await readFile(new URL('../../app/q/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<form|query\.paid|firstParam\(query\.paid\)|Pay securely with Square/);
  assert.match(source, /resolved\.productPath/);
  assert.match(source, /View availability and order/);
  assert.match(source, /product\.priceVerified && product\.price !== null/);
});
