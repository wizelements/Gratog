#!/usr/bin/env node
/** Read-only Square Sandbox merchant, exact weekly catalog and stock evidence. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const APPROVED_LEMONADES = Object.freeze([
  'Calm Waters', 'SuppleMint', 'Gracious Roots', 'Kissed by Gods',
  'Melon Rita', 'Passion Guava Pineapple Lemonade',
]);
const normalize = (value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
const HOST = 'https://connect.squareupsandbox.com';
const MAX_PAGES = 20;

// POST is permitted only for the read-only Inventory batch query.
export function sandboxReader(token, fetchImpl = fetch) {
  return async (path, body) => {
    const allowed = body === undefined
      ? /^\/v2\/(?:merchants\/me|locations|catalog\/list\?types=ITEM(?:&cursor=[^&]+)?)$/.test(path)
      : path === '/v2/inventory/counts/batch-retrieve';
    if (!allowed) throw Error('Read-only Sandbox API path rejected');
    let response;
    try {
      response = await fetchImpl(new URL(path, HOST), {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error',
        signal: AbortSignal.timeout(20_000),
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
          'Square-Version': '2026-09-16' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw Error('Sandbox Square transport failed'); }
    if (!response.ok) throw Error('Sandbox Square request returned HTTP ' + response.status);
    try { return await response.json(); }
    catch { throw Error('Sandbox Square returned invalid JSON'); }
  };
}

async function pages(readPage, recordsKey) {
  const records = [], cursors = new Set();
  let cursor;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await readPage(cursor);
    if (result[recordsKey] !== undefined && !Array.isArray(result[recordsKey])) {
      throw Error('Sandbox response has invalid ' + recordsKey);
    }
    records.push(...(result[recordsKey] || []));
    cursor = result.cursor;
    if (!cursor) return records;
    if (typeof cursor !== 'string' || cursors.has(cursor)) throw Error('Sandbox pagination cursor repeated');
    cursors.add(cursor);
  }
  throw Error('Sandbox response exceeded bounded pagination');
}

function atLocation(object, locationId) {
  if (object.absent_at_location_ids?.includes(locationId)) return false;
  return object.present_at_all_locations !== false ||
    object.present_at_location_ids?.includes(locationId) === true;
}

export async function collectReadiness({ token, expectedMerchantId = '', expectedLocationId = '',
  fetchImpl = fetch, now = () => new Date().toISOString() }) {
  const proof = { kind: 'square-sandbox-catalog-readiness', source: 'SANDBOX',
    startedAt: now(), pass: false, checks: [], matches: [],
    scope: { expectedMerchantId: expectedMerchantId || null, expectedLocationId: expectedLocationId || null,
      identityConfirmed: false },
    stockMeaning: 'Square Sandbox reported counts only; not proof of physical stock or approved preorder capacity',
    applicationIdentityVerified: false, previewDatabaseIsolationVerified: false,
    websiteTransactionVerified: false };
  const check = (ok, name, details = {}) => proof.checks.push({ name, pass: Boolean(ok), ...details });
  try {
    if (!token.trim()) throw Error('Protected sandbox credential unavailable');
    const api = sandboxReader(token.trim(), fetchImpl);
    // Read the merchant explicitly. Never assume the first active location is the intended account.
    const merchantResponse = await api('/v2/merchants/me');
    const merchant = merchantResponse.merchant;
    if (!merchant?.id) throw Error('Sandbox merchant identity unavailable');
    proof.merchant = { id: merchant.id, businessName: merchant.business_name || null,
      country: merchant.country || null, status: merchant.status || null };
    const locationResponse = await api('/v2/locations');
    if (!Array.isArray(locationResponse.locations)) throw Error('Sandbox locations unavailable');
    proof.locations = locationResponse.locations.map((l) => ({ id: l.id, merchantId: l.merchant_id,
      name: l.name, businessName: l.business_name, status: l.status, currency: l.currency }));
    const active = locationResponse.locations.filter((l) => l.status === 'ACTIVE');
    const location = expectedLocationId
      ? active.find((l) => l.id === expectedLocationId)
      : active.length === 1 ? active[0] : null;
    if (!location) throw Error('Pin an accessible active SQUARE_SANDBOX_LOCATION_ID; no location fallback permitted');
    proof.locationId = location.id;
    if (location.merchant_id !== merchant.id) throw Error('Location and token merchant identities differ');
    if (expectedMerchantId && expectedMerchantId !== merchant.id) throw Error('Pinned Sandbox merchant does not match credential');
    proof.scope.identityConfirmed = Boolean(expectedMerchantId && expectedLocationId);
    check(proof.scope.identityConfirmed, 'Intended merchant and location are explicitly pinned');
    check(location.currency === 'USD', 'Sandbox location uses USD');

    const items = await pages((cursor) => api('/v2/catalog/list?types=ITEM' +
      (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')), 'objects');
    proof.catalogItemCount = items.length;
    proof.catalogItemIdsSha256 = createHash('sha256')
      .update(JSON.stringify(items.map((i) => i.id).sort())).digest('hex');

    const approved = new Map(APPROVED_LEMONADES.map((name) => [normalize(name), name]));
    const candidates = [];
    for (const item of items) {
      const data = item.item_data;
      if (!approved.has(normalize(data?.name))) continue;
      if (item.is_deleted || data.is_archived || !atLocation(item, location.id)) continue;
      for (const variation of data.variations || []) {
        const v = variation.item_variation_data;
        const override = v?.location_overrides?.find((o) => o.location_id === location.id);
        const money = override?.price_money || v?.price_money;
        if (!variation.id || variation.is_deleted || !atLocation(variation, location.id) ||
          !/^16\s*oz(?:\s+bottle)?$/i.test(String(v?.name || '').trim()) ||
          money?.currency !== 'USD' || Number(money.amount) !== 1199 ||
          v?.pricing_type !== 'FIXED_PRICING') continue;
        candidates.push({ name: approved.get(normalize(data.name)), itemId: item.id,
          variationId: variation.id, size: v.name, priceCents: 1199,
          inventoryTracked: (override?.track_inventory ?? v.track_inventory) === true,
          inventoryQuantity: null, inventoryVerified: false, preorderCapacity: null,
          merchantCapacityApproved: false });
      }
    }
    const ids = [...new Set(candidates.map((v) => v.variationId))];
    const counts = ids.length ? await pages((cursor) => api('/v2/inventory/counts/batch-retrieve', {
      catalog_object_ids: ids, location_ids: [location.id], states: ['IN_STOCK'],
      ...(cursor ? { cursor } : {}),
    }), 'counts') : [];
    for (const row of candidates) {
      const matching = counts.filter((c) => c.catalog_object_id === row.variationId &&
        c.location_id === location.id && c.state === 'IN_STOCK');
      const raw = matching.length === 1 ? matching[0].quantity : undefined;
      const quantity = typeof raw === 'string' && /^-?\d+(?:\.0+)?$/.test(raw) ? Number(raw) : NaN;
      row.inventoryVerified = row.inventoryTracked && Number.isSafeInteger(quantity);
      row.inventoryQuantity = row.inventoryVerified ? quantity : null;
      row.inventoryCalculatedAt = matching.length === 1 ? matching[0].calculated_at || null : null;
      proof.matches.push(row);
    }
    proof.missingFlavors = APPROVED_LEMONADES.filter((name) => !candidates.some((r) => r.name === name));
    proof.ambiguousFlavors = APPROVED_LEMONADES.filter((name) => candidates.filter((r) => r.name === name).length > 1);
    check(proof.missingFlavors.length === 0, 'All six approved 16oz $11.99 flavors exist',
      { missingFlavors: proof.missingFlavors });
    check(proof.ambiguousFlavors.length === 0, 'One unambiguous approved variation per flavor',
      { ambiguousFlavors: proof.ambiguousFlavors });
    check(candidates.length === 6 && candidates.every((r) => r.inventoryVerified && r.inventoryQuantity > 0),
      'Each flavor has positive tracked Sandbox stock; unknown is not zero or capacity approval');
    // This is deliberately a provider readiness check, never a full commerce certification.
    proof.pass = proof.checks.every((c) => c.pass);
  } catch (error) {
    proof.error = String(error?.message || 'Sandbox readback failed');
  }
  proof.completedAt = now();
  return proof;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const proof = await collectReadiness({ token: process.env.SQUARE_SANDBOX_ACCESS_TOKEN || '',
    expectedMerchantId: process.env.SQUARE_SANDBOX_MERCHANT_ID || '',
    expectedLocationId: process.env.SQUARE_SANDBOX_LOCATION_ID || '' });
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/square-sandbox-catalog-readiness.json', JSON.stringify(proof, null, 2));
  console.log('SQUARE_SANDBOX_CATALOG_EVIDENCE ' + JSON.stringify(proof));
  console.log('SQUARE_SANDBOX_CATALOG_READINESS ' + (proof.pass ? 'PASS' : 'FAIL'));
  if (!proof.pass) process.exitCode = 1;
}
