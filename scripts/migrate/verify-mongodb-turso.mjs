import { createRequire } from 'node:module';
import { connect } from '@tursodatabase/serverless';
import { cents, fingerprint } from './migration-utils.mjs';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { MongoClient } = require('mongodb');
const collectionIndex=process.argv.indexOf('--collection'); const selected=collectionIndex>=0?process.argv[collectionIndex+1]:null;

if (!process.env.MONGODB_URI || !process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Mongo and Turso credentials required');
const mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0 });
const turso = connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, defaultQueryTimeout: 15_000 });
const report = { collections: {}, cardinality: {}, missingIds: {}, extraIds: {}, fingerprintMismatches: {}, financial: {}, pass: true };
try {
  await mongo.connect();
  const source = mongo.db('taste_of_gratitude');
  const registry = JSON.parse(await readFile('migration-artifacts/collection-registry.json', 'utf8')).collections;
  const projections = new Set(['square_catalog_items', 'unified_products']);
  const active = new Set(registry.filter((item) => ['MIGRATE', 'TRANSFORM'].includes(item.classification) || (selected && projections.has(item.collection))).map((item) => item.collection));
  const names = (await source.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name).filter((name)=>active.has(name)&&(!selected||name===selected)).sort();
  if(selected&&!names.length)throw new Error(`UNKNOWN_COLLECTION:${selected}`);
  for (const name of names) {
    let sourceCount = 0, matched = 0, missing = 0, mismatched = 0, domainMissing = 0, domainMismatched = 0, expectedChildren = 0, expectedMoney = 0, expectedOperational = 0;
    const provenanceRows = await turso.all('SELECT source_id, canonical_fingerprint FROM migration_source_records WHERE source_collection = ?', name);
    const provenance = new Map(provenanceRows.map((row) => [String(row.source_id), row.canonical_fingerprint]));
    const actualOrderIds = name === 'orders' || name === 'marketorders'
      ? new Set((await turso.all('SELECT id FROM orders WHERE source_collection = ?', name)).map((row) => String(row.id)))
      : null;
    const paymentRows = name === 'payment_records' || name === 'payments'
      ? new Map((await turso.all('SELECT id, amount_cents FROM payments')).map((row) => [String(row.id), Number(row.amount_cents)]))
      : null;
    const inventoryRows = name === 'inventory'
      ? new Map((await turso.all('SELECT product_id, current_stock FROM inventory')).map((row) => [String(row.product_id), Number(row.current_stock)]))
      : null;
    for await (const doc of source.collection(name).find({}).sort({ _id: 1 }).batchSize(100)) {
      sourceCount++;
      const id = doc._id.toString();
      const targetFingerprint = provenance.get(id);
      if (!targetFingerprint) missing++; else if (targetFingerprint !== fingerprint(doc)) mismatched++; else matched++;
      if (name === 'square_catalog_items' || name === 'unified_products') {
        const productId = String(doc.id ?? doc.squareId ?? '');
        const product = await turso.get('SELECT id, square_catalog_id FROM products WHERE id = ?', productId);
        if (!product) domainMissing++; else if (product.square_catalog_id !== String(doc.squareId ?? doc.id)) domainMismatched++;
        for (const variation of Array.isArray(doc.variations) ? doc.variations : []) {
          expectedChildren++;
          const targetVariation = await turso.get('SELECT product_id, price_cents FROM product_variations WHERE id = ?', String(variation.id));
          const expectedPrice = variation.priceCents ?? (variation.price == null ? null : Math.round(Number(variation.price) * 100));
          if (!targetVariation) domainMissing++; else if (targetVariation.product_id !== productId || Number(targetVariation.price_cents) !== expectedPrice) domainMismatched++;
        }
      }
      if (name === 'orders' || name === 'marketorders') {
        expectedChildren += Array.isArray(doc.items) ? doc.items.length : 0;
        if (doc.totalCents != null) expectedMoney += cents(doc.totalCents, 'totalCents');
        else if (doc.total != null) expectedMoney += cents(doc.total, 'total', doc.source === 'square_sync' ? 'cents' : 'dollars');
        else if (Array.isArray(doc.items) && doc.items.every((item) => item?.subtotal != null)) expectedMoney += doc.items.reduce((sum, item) => sum + cents(item.subtotal, 'item.subtotal', 'dollars'), 0);
        else domainMismatched++;
        if (!actualOrderIds.has(String(doc._id))) domainMissing++;
      }
      if (name === 'payment_records' || name === 'payments') {
        const amount = doc.amountCents ?? doc.amountMoney?.amount ?? doc.totalMoney?.amount;
        if (amount == null) expectedOperational++;
        else {
          const expected = cents(amount, 'amountCents'); expectedMoney += expected;
          if (!paymentRows.has(id)) domainMissing++; else if (paymentRows.get(id) !== expected) domainMismatched++;
        }
      }
      if (name === 'inventory') {
        const productId = String(doc.productId ?? doc.squareId ?? '');
        const stock = Number(doc.currentStock ?? 0);
        expectedMoney += stock;
        expectedChildren += Array.isArray(doc.variationIds) ? doc.variationIds.length : 0;
        if (!inventoryRows.has(productId)) domainMissing++; else if (inventoryRows.get(productId) !== stock) domainMismatched++;
      }
    }
    const targetCount = provenance.size; const extra = Math.max(0, targetCount - matched - mismatched);
    report.collections[name] = { sourceCount, targetCount, matched, missing, extra, mismatched };
    if (missing || extra || mismatched) report.pass = false;
    if (name === 'square_catalog_items' || name === 'unified_products') {
      report.cardinality[name] = { expectedProducts: sourceCount, expectedVariations: expectedChildren, missingTargetEntities: domainMissing, mismatchedTargetEntities: domainMismatched };
      if (domainMissing || domainMismatched) report.pass = false;
    }
    if (name === 'orders' || name === 'marketorders') {
      const targetOrders = Number((await turso.get('SELECT count(*) count FROM orders WHERE source_collection = ?', name))?.count ?? 0);
      const targetItems = Number((await turso.get('SELECT count(*) count FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.source_collection = ?', name))?.count ?? 0);
      const targetMoney = Number((await turso.get('SELECT coalesce(sum(total_cents),0) total FROM orders WHERE source_collection = ?', name))?.total ?? 0);
      const linkedCustomers = Number((await turso.get('SELECT count(*) count FROM orders WHERE source_collection = ? AND customer_id IS NOT NULL', name))?.count ?? 0);
      report.cardinality[name] = { expectedOrders: sourceCount, targetOrders, expectedItems: expectedChildren, targetItems, missingOrderRows: domainMissing, transformConflicts: domainMismatched, linkedCustomers };
      report.financial[name] = { expectedTotalCents: expectedMoney, targetTotalCents: targetMoney, deltaCents: targetMoney - expectedMoney };
      if (targetOrders !== sourceCount || targetItems !== expectedChildren || domainMissing || domainMismatched || targetMoney !== expectedMoney) report.pass = false;
    }
    if (name === 'payment_records' || name === 'payments') {
      const targetOperational = Number((await turso.get('SELECT count(*) count FROM operational_records WHERE source_collection = ?', name))?.count ?? 0);
      report.cardinality[name] = { expectedPayments: sourceCount - expectedOperational, missingPayments: domainMissing, mismatchedPayments: domainMismatched, expectedOperational, targetOperational };
      report.financial[name] = { expectedPaymentCents: expectedMoney, targetMatchedPaymentCents: [...paymentRows.entries()].filter(([id]) => provenance.has(id)).reduce((sum, [, amount]) => sum + amount, 0) };
      if (domainMissing || domainMismatched || targetOperational !== expectedOperational || report.financial[name].targetMatchedPaymentCents !== expectedMoney) report.pass = false;
    }
    if (name === 'inventory') {
      const targetVariations = Number((await turso.get('SELECT count(*) count FROM inventory_variations'))?.count ?? 0);
      const targetStock = Number((await turso.get('SELECT coalesce(sum(current_stock),0) total FROM inventory'))?.total ?? 0);
      const orphans = Number((await turso.get('SELECT count(*) count FROM inventory i LEFT JOIN products p ON p.id=i.product_id WHERE p.id IS NULL'))?.count ?? 0);
      report.cardinality.inventory = { expectedInventory: sourceCount, targetInventory: inventoryRows.size, expectedVariations: expectedChildren, targetVariations, missingRows: domainMissing, mismatchedRows: domainMismatched, orphans };
      report.financial.inventoryStock = { expected: expectedMoney, target: targetStock, delta: targetStock - expectedMoney };
      if (inventoryRows.size !== sourceCount || targetVariations !== expectedChildren || domainMissing || domainMismatched || orphans || targetStock !== expectedMoney) report.pass = false;
    }
    if (name === 'customers') {
      const expectedAddresses = (await source.collection(name).aggregate([{ $project: { count: { $size: { $cond: [{ $isArray: '$addresses' }, '$addresses', []] } } } }, { $group: { _id: null, count: { $sum: '$count' } } }]).next())?.count ?? 0;
      const targetCustomers = Number((await turso.get('SELECT count(*) count FROM customers'))?.count ?? 0);
      const targetAddresses = Number((await turso.get('SELECT count(*) count FROM customer_addresses'))?.count ?? 0);
      const orphans = Number((await turso.get('SELECT count(*) count FROM customer_addresses a LEFT JOIN customers c ON c.id=a.customer_id WHERE c.id IS NULL'))?.count ?? 0);
      report.cardinality.customers = { expectedCustomers: sourceCount, targetCustomers, expectedAddresses, targetAddresses, orphans };
      if (targetCustomers !== sourceCount || targetAddresses !== expectedAddresses || orphans !== 0) report.pass = false;
    }
  }
  process.stdout.write(JSON.stringify(report) + '\n');
} finally { await mongo.close(); }
