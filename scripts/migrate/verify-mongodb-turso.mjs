import { createRequire } from 'node:module';
import { connect } from '@tursodatabase/serverless';
import { fingerprint } from './migration-utils.mjs';
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
  const active = new Set(registry.filter((item) => ['MIGRATE', 'TRANSFORM'].includes(item.classification)).map((item) => item.collection));
  const names = (await source.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name).filter((name)=>active.has(name)&&(!selected||name===selected)).sort();
  if(selected&&!names.length)throw new Error(`UNKNOWN_COLLECTION:${selected}`);
  for (const name of names) {
    let sourceCount = 0, matched = 0, missing = 0, mismatched = 0;
    for await (const doc of source.collection(name).find({}).sort({ _id: 1 }).batchSize(100)) {
      sourceCount++;
      const id = doc._id.toString();
      const row = await turso.get('SELECT canonical_fingerprint FROM migration_source_records WHERE source_collection = ? AND source_id = ?', name, id);
      if (!row) missing++; else if (row.canonical_fingerprint !== fingerprint(doc)) mismatched++; else matched++;
    }
    const target = await turso.get('SELECT count(*) AS count FROM migration_source_records WHERE source_collection = ?', name);
    const targetCount = Number(target?.count ?? 0); const extra = Math.max(0, targetCount - matched - mismatched);
    report.collections[name] = { sourceCount, targetCount, matched, missing, extra, mismatched };
    if (missing || extra || mismatched) report.pass = false;
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
