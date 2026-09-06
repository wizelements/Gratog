import { createRequire } from 'node:module';
import { connect } from '@tursodatabase/serverless';
import { fingerprint } from './migration-utils.mjs';
const require = createRequire(import.meta.url);
const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI || !process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Mongo and Turso credentials required');
const mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0 });
const turso = connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, defaultQueryTimeout: 15_000 });
const report = { collections: {}, missingIds: {}, extraIds: {}, fingerprintMismatches: {}, financial: {}, pass: true };
try {
  await mongo.connect();
  const source = mongo.db('taste_of_gratitude');
  const names = (await source.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name).sort();
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
  }
  process.stdout.write(JSON.stringify(report) + '\n');
} finally { await mongo.close(); }
