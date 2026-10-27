import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_LEMONADES, collectReadiness, sandboxReader } from '../scripts/certify-square-sandbox-catalog-readiness.mjs';

function fixture({ names = APPROVED_LEMONADES, quantity = '16', countsMissing = false,
  countPages = false, stockTracked = true, overrides, repeatedCursor = false } = {}) {
  const requests = [];
  const items = names.map((name, i) => ({ id: 'item-' + i, type: 'ITEM',
    item_data: { name, variations: [{ id: 'var-' + i, type: 'ITEM_VARIATION',
      item_variation_data: { name: '16 oz', pricing_type: 'FIXED_PRICING',
        price_money: { amount: 1199, currency: 'USD' }, track_inventory: stockTracked,
        ...(overrides ? { location_overrides: overrides } : {}) } }] } }));
  const allCounts = items.map((_, i) => ({ catalog_object_id: 'var-' + i,
    location_id: 'location-1', state: 'IN_STOCK', quantity,
    calculated_at: '2026-10-27T12:00:00Z' }));
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    assert.equal(url.origin, 'https://connect.squareupsandbox.com');
    let data;
    if (url.pathname === '/v2/merchants/me') data = { merchant: { id: 'merchant-1', business_name: 'Taste of Gratitude' } };
    else if (url.pathname === '/v2/locations') data = { locations: [{ id: 'location-1',
      merchant_id: 'merchant-1', status: 'ACTIVE', currency: 'USD' }] };
    else if (url.pathname === '/v2/catalog/list') data = repeatedCursor
      ? { objects: [], cursor: 'same' } : { objects: items };
    else if (url.pathname === '/v2/inventory/counts/batch-retrieve') {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.location_ids, ['location-1']);
      assert.deepEqual(body.states, ['IN_STOCK']);
      data = countsMissing ? {} : countPages && !body.cursor
        ? { counts: allCounts.slice(0, 3), cursor: 'next' }
        : { counts: countPages ? allCounts.slice(3) : allCounts };
    } else assert.fail('Unexpected API request');
    return { ok: true, status: 200, json: async () => data };
  };
  return { fetchImpl, requests };
}
const read = (f, extra = {}) => collectReadiness({ token: 'test-private-token',
  expectedMerchantId: 'merchant-1', expectedLocationId: 'location-1', fetchImpl: f.fetchImpl, ...extra });

test('explicit merchant/location and six real-query variations pass only provider readiness', async () => {
  const f = fixture({ countPages: true }), proof = await read(f);
  assert.equal(proof.pass, true);
  assert.equal(proof.matches.length, 6);
  assert.equal(proof.matches[0].inventoryQuantity, 16);
  assert.equal(proof.websiteTransactionVerified, false);
  assert.equal(proof.previewDatabaseIsolationVerified, false);
  assert.equal(proof.matches[0].merchantCapacityApproved, false);
  assert.ok(f.requests.filter((r) => r.options.method === 'POST')
    .every((r) => r.url.endsWith('/v2/inventory/counts/batch-retrieve')));
});
test('discovery does not certify an unpinned merchant or location', async () => {
  const proof = await read(fixture(), { expectedMerchantId: '', expectedLocationId: '' });
  assert.equal(proof.pass, false);
  assert.equal(proof.merchant.id, 'merchant-1');
  assert.equal(proof.scope.identityConfirmed, false);
});
test('wrong merchant aborts before catalog or inventory access', async () => {
  const f = fixture(), proof = await read(f, { expectedMerchantId: 'other-merchant' });
  assert.equal(proof.pass, false);
  assert.match(proof.error, /does not match/);
  assert.equal(f.requests.length, 2);
});
test('wrong configured location never falls back to first active location', async () => {
  const f = fixture(), proof = await read(f, { expectedLocationId: 'other-location' });
  assert.equal(proof.pass, false);
  assert.match(proof.error, /no location fallback/);
  assert.equal(f.requests.length, 2);
});
test('unreported inventory stays null and cannot be certified as zero or capacity', async () => {
  const proof = await read(fixture({ countsMissing: true }));
  assert.equal(proof.pass, false);
  assert.ok(proof.matches.every((r) => r.inventoryQuantity === null && !r.inventoryVerified));
});
test('negative stock is preserved and fails availability', async () => {
  const proof = await read(fixture({ quantity: '-3' }));
  assert.equal(proof.pass, false);
  assert.equal(proof.matches[0].inventoryQuantity, -3);
});
test('location override disabling tracking fails even with counts', async () => {
  const proof = await read(fixture({ overrides: [{ location_id: 'location-1', track_inventory: false }] }));
  assert.equal(proof.pass, false);
  assert.equal(proof.matches[0].inventoryQuantity, null);
});
test('location price override prevents accepting a stale base price', async () => {
  const proof = await read(fixture({ overrides: [{ location_id: 'location-1',
    price_money: { amount: 999, currency: 'USD' } }] }));
  assert.equal(proof.pass, false);
  assert.equal(proof.matches.length, 0);
});
test('two flavors cannot prove the six-flavor merchant menu', async () => {
  const proof = await read(fixture({ names: APPROVED_LEMONADES.slice(0, 2) }));
  assert.equal(proof.pass, false);
  assert.equal(proof.missingFlavors.length, 4);
});
test('repeated cursor fails instead of silently truncating a catalog', async () => {
  const proof = await read(fixture({ repeatedCursor: true }));
  assert.equal(proof.pass, false);
  assert.match(proof.error, /cursor repeated/);
});
test('client rejects mutation paths and credential-bearing transport errors are redacted', async () => {
  const api = sandboxReader('test-private-token', async () => { throw Error('test-private-token'); });
  await assert.rejects(() => api('/v2/catalog/batch-upsert', {}), /rejected/);
  await assert.rejects(() => api('//connect.squareup.com/v2/locations'), /rejected/);
  await assert.rejects(() => api('/v2/locations'), /transport failed/);
  const proof = await collectReadiness({ token: 'test-private-token',
    fetchImpl: async () => { throw Error('test-private-token'); } });
  assert.equal(JSON.stringify(proof).includes('test-private-token'), false);
});
