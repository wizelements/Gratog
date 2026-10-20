import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { connect } from '@tursodatabase/serverless';

if (process.env.TURSO_TARGET_ENV !== 'staging') throw new Error('STAGING_TARGET_REQUIRED');
const expected = process.env.TURSO_APPROVED_STAGING_NAME || '';
const url = process.env.TURSO_DATABASE_URL || '';
const host = new URL(url.replace(/^libsql:/, 'https:')).hostname;
if (!/^gratog-migration-cert-[a-z0-9-]+$/.test(expected) || !host.startsWith(expected + '-')) {
  throw new Error('STAGING_TARGET_IDENTITY_UNVERIFIED');
}
const digest = process.env.MIGRATION_SOURCE_SNAPSHOT_SHA256 || '';
const sourceDocuments = Number(process.env.MIGRATION_SOURCE_DOCUMENT_COUNT);
const sourceCollections = Number(process.env.MIGRATION_SOURCE_COLLECTION_COUNT);
if (!/^[a-f0-9]{64}$/i.test(digest) || !Number.isSafeInteger(sourceDocuments)
    || !Number.isSafeInteger(sourceCollections) || sourceDocuments < 0 || sourceCollections < 1) {
  throw new Error('CURRENT_SOURCE_BASELINE_UNVERIFIED');
}
const id = `mongo-turso-staging-${randomUUID()}`;
const startedAt = new Date().toISOString();
const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const db = connect({url, authToken:process.env.TURSO_AUTH_TOKEN});
try {
  await db.run('INSERT INTO migration_runs(id,source_database,source_backup_sha256,started_at,status) VALUES (?,?,?,?,?)',
    id, 'taste_of_gratitude', 'UNVERIFIED_NON_ATOMIC_' + digest, startedAt, 'running');
} finally { await db.close(); }
const report = {
  migrationRunId:id, environment:'staging', sourceDatabase:'taste_of_gratitude',
  baselineKind:'NON_ATOMIC_READ_ONLY', sourceFingerprintSha256:digest,
  sourceBackupSha256:'UNVERIFIED_NON_ATOMIC_' + digest,
  sourceDocumentBaseline:sourceDocuments, sourceCollectionCount:sourceCollections,
  schemaVersion:(await readdir('db/migrations')).filter(name=>/^\d{4}_.*\.sql$/.test(name)).sort().at(-1), batchSize:100, gitSha,
  sourceWatermark:process.env.MIGRATION_SOURCE_WATERMARK || startedAt,
  startedAt, releaseEligible:false,
};
await mkdir('migration-artifacts',{recursive:true});
await writeFile('migration-artifacts/staging-run.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'STAGING_ONLY',runId:id,releaseEligible:false,backupProof:false}));
