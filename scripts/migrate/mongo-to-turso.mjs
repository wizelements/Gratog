import { createRequire } from 'node:module';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { connect } from '@tursodatabase/serverless';
import { BACKUP_SHA256, redactFailure } from './migration-utils.mjs';
import { transformDocument } from './transformers.mjs';
import { withRetry } from './retry.mjs';
import { commitBatch } from './batch-runner.mjs';
import { decodeCheckpointId, encodeCheckpointId } from './checkpoint.mjs';
import { insertStatement } from './upsert-policy.mjs';

const require = createRequire(import.meta.url);
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const args = new Map(process.argv.slice(2).map((arg, index, all) => arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1]] : [arg, true]));
const dryRun = args.has('--dry-run');
const resume = args.has('--resume');
const batchSize = Number(args.get('--batch-size') === true ? 100 : args.get('--batch-size') ?? 100);
const selected = args.get('--collection');
const run = dryRun ? null : JSON.parse(await readFile('migration-artifacts/staging-run.json', 'utf8'));
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) throw new Error('batch-size must be 1..250');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!dryRun && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) throw new Error('Turso credentials required for write mode');
if (!dryRun && process.env.TURSO_TARGET_ENV !== 'staging' && process.env.TURSO_TARGET_ENV !== 'test') throw new Error('REMOTE_WRITE_BLOCKED_TARGET_NOT_STAGING_OR_TEST');

const registry = JSON.parse(await readFile('migration-artifacts/collection-registry.json', 'utf8')).collections;
const projectionCollections = new Set(['square_catalog_items', 'unified_products']);
const collections = registry.filter((item) => (['MIGRATE', 'TRANSFORM'].includes(item.classification) || (selected && projectionCollections.has(item.collection))) && (!selected || item.collection === selected));
if (selected && collections.length !== 1) throw new Error(`Unknown collection: ${selected}`);
await mkdir('.tmp/migration', { recursive: true });
const rejectionPath = 'migration-artifacts/rejected-records.json';
const report = { dryRun, batchSize, concurrency: 1, retry: { attempts: 0, retries: 0 }, collections: {}, rejected: [] };
const mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0 });
const turso = dryRun ? null : connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, defaultQueryTimeout: 15_000 });

try {
  await mongo.connect();
  const db = mongo.db('taste_of_gratitude');
  const customerDocs = await db.collection('customers').find({}, { projection: { _id: 1, email: 1, squareCustomerId: 1 } }).toArray();
  const context = { customerById: new Map(), customerBySquareId: new Map(), customerByEmail: new Map(), marketByReference: new Map(), orderByReference: new Map(), productSlugCounts: new Map() };
  const emailCounts = new Map();
  for (const customer of customerDocs) {
    const id = String(customer._id); context.customerById.set(id, id);
    if (customer.squareCustomerId != null) context.customerBySquareId.set(String(customer.squareCustomerId), id);
    if (typeof customer.email === 'string' && customer.email.trim()) { const email = customer.email.trim().toLowerCase(); emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1); context.customerByEmail.set(email, id); }
  }
  for (const [email, count] of emailCounts) if (count !== 1) context.customerByEmail.delete(email);
  for await (const marketDoc of db.collection('markets').find({}, { projection: { _id: 1, id: 1, slug: 1 } })) {
    const targetId = String(marketDoc._id);
    for (const reference of [marketDoc._id, marketDoc.id, marketDoc.slug]) if (reference != null) context.marketByReference.set(String(reference), targetId);
  }
  for await (const orderDoc of db.collection('orders').find({}, { projection: { _id: 1, squareOrderId: 1 } })) {
    const targetId = String(orderDoc._id); context.orderByReference.set(targetId, targetId);
    if (orderDoc.squareOrderId != null) context.orderByReference.set(String(orderDoc.squareOrderId), targetId);
  }
  for await (const product of db.collection('unified_products').find({}, { projection: { slug: 1 } })) {
    if (typeof product.slug === 'string' && product.slug) context.productSlugCounts.set(product.slug, (context.productSlugCounts.get(product.slug) ?? 0) + 1);
  }
  for (const item of collections) {
    const statePath = `.tmp/migration/${dryRun ? 'dry-run-' : ''}${item.collection}.checkpoint.json`;
    let lastId = null;
    if (resume) try { lastId = decodeCheckpointId(JSON.parse(await readFile(statePath, 'utf8')).lastSourceId); } catch {}
    const stats = report.collections[item.collection] = { sourceRead: 0, valid: 0, rejected: 0, targetRows: 0 };
    const processBatch = async (batch) => {
      const writes = [];
      for (const doc of batch) {
        stats.sourceRead++;
        try {
          const transformed = transformDocument(item.collection, doc, context);
          stats.valid++;
          for (const statement of transformed.statements) writes.push(insertStatement(statement.table, statement.row));
          writes.push(insertStatement('migration_source_records', { source_collection: item.collection, source_id: transformed.sourceId, canonical_fingerprint: transformed.fingerprint, migrated_at: new Date().toISOString() }));
        } catch (error) { stats.rejected++; report.rejected.push(redactFailure(item.collection, doc, error)); }
      }
      lastId = batch.at(-1)._id;
      const checkpoint = { lastSourceId: encodeCheckpointId(lastId), recordsRead: stats.sourceRead, backupSha256: BACKUP_SHA256 };
      if (!dryRun && writes.length) {
        const targetRowCount = writes.length;
        writes.push(insertStatement('migration_checkpoints', {
          migration_id: run.migrationRunId,
          source_collection: item.collection,
          last_source_id: JSON.stringify(checkpoint.lastSourceId),
          records_read: stats.sourceRead,
          records_written: stats.targetRows + targetRowCount,
          records_rejected: stats.rejected,
          updated_at: new Date().toISOString(),
        }));
        const result = await commitBatch({ writes, writeBatch: (items) => turso.batch(items, 'immediate'), checkpoint, saveCheckpoint: (value) => writeFile(statePath, JSON.stringify(value)) });
        report.retry.attempts += result.attempts; report.retry.retries += result.retried; stats.targetRows += targetRowCount;
      } else await writeFile(statePath, JSON.stringify(checkpoint));
    };
    const cursor = db.collection(item.collection).find({}).sort({ _id: 1 }).batchSize(batchSize);
    let checkpointFound = lastId == null;
    let batch = [];
    for await (const doc of cursor) {
      if (!checkpointFound) {
        if (EJSON.stringify(doc._id) === EJSON.stringify(lastId)) checkpointFound = true;
        continue;
      }
      batch.push(doc);
      if (batch.length === batchSize) { await processBatch(batch); batch = []; }
    }
    if (!checkpointFound) throw new Error(`CHECKPOINT_NOT_FOUND:${item.collection}`);
    if (batch.length) await processBatch(batch);
  }
  await writeFile(rejectionPath, JSON.stringify(report.rejected, null, 2));
  process.stdout.write(JSON.stringify(report) + '\n');
} finally { await mongo.close(); }
