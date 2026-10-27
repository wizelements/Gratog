#!/usr/bin/env node
/** Create only missing approved Sandbox catalog definitions. Never set stock/capacity. */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { APPROVED_LEMONADES, collectReadiness } from './certify-square-sandbox-catalog-readiness.mjs';

export async function provisionApprovedLemonades({ token, expectedMerchantId, expectedLocationId,
  expectedApplicationId, apply = false, fetchImpl = fetch }) {
  const proof = { kind: 'approved-lemonade-sandbox-provisioning', source: 'SANDBOX',
    startedAt: new Date().toISOString(), pass: false, applied: false,
    inventoryWritten: false, preorderCapacityWritten: false, databaseWritten: false,
    physicalStockVerified: false, merchantPreorderCapacityApproved: false };
  try {
    if (!expectedMerchantId || !expectedLocationId || !expectedApplicationId) {
      throw Error('Explicit Preview Sandbox merchant, location and application pins required');
    }
    const options = { token, expectedMerchantId, expectedLocationId, expectedApplicationId, fetchImpl };
    const before = await collectReadiness(options);
    proof.merchant = before.merchant;
    proof.locationId = before.locationId;
    proof.application = before.application;
    if (before.error || !before.scope.identityConfirmed || !before.applicationIdentityVerified ||
      before.checks.find((c) => c.name === 'Sandbox location uses USD')?.pass !== true) {
      throw Error(before.error || 'Sandbox identity/currency verification failed');
    }
    const missing = [];
    for (const name of APPROVED_LEMONADES) {
      const catalogRows = before.approvedCatalogItems.filter((i) => i.name === name);
      const approvedRows = before.matches.filter((i) => i.name === name);
      if (!catalogRows.length) missing.push(name);
      else if (catalogRows.length !== 1 || approvedRows.length !== 1 || !approvedRows[0].inventoryTracked) {
        // Existing records are merchant data. Never overwrite a price, size or ambiguous mapping.
        throw Error('Existing approved-name catalog item needs merchant reconciliation: ' + name);
      }
    }
    proof.missingBefore = missing;
    const locationScope = { present_at_all_locations: false, present_at_location_ids: [expectedLocationId] };
    const objects = missing.map((name) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const itemId = '#tog-' + slug;
      return { type: 'ITEM', id: itemId, ...locationScope,
        item_data: { name, product_type: 'REGULAR',
          description: 'Taste of Gratitude approved 16 oz bottled lemonade. Square Sandbox only.',
          ecom_available: true, ecom_visibility: 'VISIBLE',
          variations: [{ type: 'ITEM_VARIATION', id: itemId + '-16oz', ...locationScope,
            item_variation_data: { item_id: itemId, name: '16 oz',
              sku: 'TOG-SBX-' + slug.toUpperCase() + '-16OZ',
              pricing_type: 'FIXED_PRICING', price_money: { amount: 1199, currency: 'USD' },
              track_inventory: true, sellable: true, stockable: true } }] } };
    });
    proof.plannedNames = missing;
    if (!apply) { proof.dryRun = true; proof.pass = true; return proof; }
    if (objects.length) {
      const batches = [{ objects }];
      const idempotencyKey = 'tog-approved-' + createHash('sha256')
        .update(JSON.stringify({ expectedMerchantId, expectedLocationId, batches })).digest('hex');
      let response;
      try {
        response = await fetchImpl(new URL('/v2/catalog/batch-upsert', 'https://connect.squareupsandbox.com'), {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25_000),
          headers: { Authorization: 'Bearer ' + token.trim(), 'Content-Type': 'application/json',
            'Square-Version': '2026-09-16' },
          body: JSON.stringify({ idempotency_key: idempotencyKey, batches }),
        });
      } catch { throw Error('Sandbox catalog write transport failed; rerun safely with deterministic idempotency'); }
      if (!response.ok) throw Error('Sandbox catalog provisioning returned HTTP ' + response.status);
      const result = await response.json();
      if (result.errors?.length) throw Error('Sandbox catalog provisioning returned provider errors');
      proof.applied = true;
      proof.createdNames = missing;
    }
    const after = await collectReadiness(options);
    if (after.error || !after.scope.identityConfirmed || !after.applicationIdentityVerified ||
      after.missingFlavors?.length || after.ambiguousFlavors?.length || after.matches.length !== 6 ||
      !after.matches.every((v) => v.inventoryTracked)) {
      throw Error('Sandbox catalog readback did not confirm all six approved definitions');
    }
    proof.products = after.matches;
    proof.catalogVerified = true;
    proof.pass = true;
  } catch (error) { proof.error = String(error?.message || 'Sandbox catalog provisioning failed'); }
  finally { proof.completedAt = new Date().toISOString(); }
  return proof;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const proof = await provisionApprovedLemonades({ token: process.env.SQUARE_SANDBOX_ACCESS_TOKEN || '',
    expectedMerchantId: process.env.SQUARE_SANDBOX_MERCHANT_ID || '',
    expectedLocationId: process.env.SQUARE_SANDBOX_LOCATION_ID || '',
    expectedApplicationId: process.env.SQUARE_SANDBOX_APPLICATION_ID || '',
    apply: process.argv.slice(2).includes('--apply') });
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/approved-lemonade-sandbox-provisioning.json', JSON.stringify(proof, null, 2));
  console.log('APPROVED_LEMONADE_SANDBOX_PROVISIONING ' + JSON.stringify(proof));
  if (!proof.pass) process.exitCode = 1;
}
