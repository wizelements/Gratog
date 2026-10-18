import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('retired public reviews do not fetch a deleted API or offer fake rating controls', () => {
  const product = src('app/product/[slug]/ProductDetailClient.jsx');
  for (const retired of ['/api/reviews', '<ProductReviews', 'reviewSummary', 'aggregateRating', 'value="reviews"']) {
    assert.equal(product.includes(retired), false, `obsolete public review reference: ${retired}`);
  }
  assert.match(product, /<TabsTrigger value="ingredients">Ingredients<\/TabsTrigger>/);
});

test('market day label uses a stable initial hydration render', () => {
  const market = src('app/markets/page.tsx');
  assert.match(market, /useState\('Schedule updating'\)/);
  assert.match(market, /useEffect\(\(\) => \{\s*setNextMarketLabel\(getNextMarketLabel\(market\)\)/);
  assert.match(market, /Next: \{nextMarketLabel\}/);
  assert.doesNotMatch(market, /Next: \{getNextMarketLabel\(market\)\}/);
});

test('critical product and fulfillment page wrappers expose a main landmark', () => {
  for (const page of ['app/product/[slug]/page.jsx', 'app/catalog/page.js', 'app/checkout/page.tsx',
    'app/preorder/page.tsx', 'app/policies/page.js', 'app/contact/page.js']) {
    assert.match(src(page), /<main\b/, `${page} missing main`);
    assert.match(src(page), /<\/main>/, `${page} missing close main`);
  }
});
