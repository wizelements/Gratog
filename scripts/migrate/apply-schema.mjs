import { readdir, readFile } from 'node:fs/promises';
import { connect } from '@tursodatabase/serverless';

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials are required');
if (!['staging', 'test'].includes(process.env.TURSO_TARGET_ENV)) throw new Error('REMOTE_WRITE_BLOCKED_TARGET_NOT_STAGING_OR_TEST');
const db = connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, defaultQueryTimeout: 15_000 });
const migrations = (await readdir('db/migrations')).filter((name) => name.endsWith('.sql')).sort();
await db.run('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
for (const migration of migrations) {
  const applied = await db.get('SELECT version FROM schema_migrations WHERE version = ?', migration);
  if (applied) continue;
  const sql = await readFile(`db/migrations/${migration}`, 'utf8');
  const apply = db.transactionAsync(async (tx) => {
    await tx.exec(sql);
    await tx.run('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)', migration, new Date().toISOString());
  });
  await apply.immediate();
  process.stdout.write(JSON.stringify({ applied: migration }) + '\n');
}
