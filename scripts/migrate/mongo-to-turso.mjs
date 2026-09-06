import { createRequire } from 'node:module';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { connect } from '@tursodatabase/serverless';
import { BACKUP_SHA256, redactFailure } from './migration-utils.mjs';
import { transformDocument } from './transformers.mjs';
import { withRetry } from './retry.mjs';
import { commitBatch } from './batch-runner.mjs';
import { decodeCheckpointId, encodeCheckpointId } from './checkpoint.mjs';

const require = createRequire(import.meta.url);
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const args = new Map(process.argv.slice(2).map((arg, index, all) => arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1]] : [arg, true]));
const dryRun = args.has('--dry-run');
const resume = args.has('--resume');
const batchSize = Number(args.get('--batch-size') === true ? 100 : args.get('--batch-size') ?? 100);
const selected = args.get('--collection');
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) throw new Error('batch-size must be 1..250');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!dryRun && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) throw new Error('Turso credentials required for write mode');
if (!dryRun && process.env.TURSO_TARGET_ENV !== 'staging' && process.env.TURSO_TARGET_ENV !== 'test') throw new Error('REMOTE_WRITE_BLOCKED_TARGET_NOT_STAGING_OR_TEST');

const registry = JSON.parse(await readFile('migration-artifacts/collection-registry.json', 'utf8')).collections;
const collections = registry.filter((item) => ['MIGRATE', 'TRANSFORM'].includes(item.classification) && (!selected || item.collection === selected));
if (selected && collections.length !== 1) throw new Error(`Unknown collection: ${selected}`);
await mkdir('.tmp/migration', { recursive: true });
const rejectionPath = 'migration-artifacts/rejected-records.json';
const report = { dryRun, batchSize, concurrency: 1, retry: { attempts: 0, retries: 0 }, collections: {}, rejected: [] };
const mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0 });
const turso = dryRun ? null : connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, defaultQueryTimeout: 15_000 });

function upsert(table, row) {
  const columns = Object.keys(row); const placeholders = columns.map(() => '?').join(',');
  const updates = columns.slice(1).map((column) => `${column}=excluded.${column}`).join(',');
  return { sql: `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT DO UPDATE SET ${updates}`, args: Object.values(row) };
}

try {
  await mongo.connect();
  const db = mongo.db('taste_of_gratitude');
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
          const transformed = transformDocument(item.collection, doc);
          stats.valid++;
          for (const statement of transformed.statements) writes.push(upsert(statement.table, statement.row));
          writes.push(upsert('migration_source_records', { source_collection: item.collection, source_id: transformed.sourceId, canonical_fingerprint: transformed.fingerprint, migrated_at: new Date().toISOString() }));
        } catch (error) { stats.rejected++; report.rejected.push(redactFailure(item.collection, doc, error)); }
      }
      lastId = batch.at(-1)._id;
      const checkpoint = { lastSourceId: encodeCheckpointId(lastId), recordsRead: stats.sourceRead, backupSha256: BACKUP_SHA256 };
      if (!dryRun && writes.length) {
        const result = await commitBatch({ writes, writeBatch: (items) => turso.batch(items, 'immediate'), checkpoint, saveCheckpoint: (value) => writeFile(statePath, JSON.stringify(value)) });
        report.retry.attempts += result.attempts; report.retry.retries += result.retried; stats.targetRows += writes.length;
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
