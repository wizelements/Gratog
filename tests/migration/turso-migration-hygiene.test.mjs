import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');

test('migration registry includes every latest observed source collection, including audits',()=>{
 const registry=JSON.parse(read('migration-artifacts/collection-registry.json')).collections;
 assert.equal(registry.length,59);
 for(const name of ['market_audit_log','menu_audit_log']) {
   const entry=registry.find(x=>x.collection===name);
   assert.equal(entry?.classification,'MIGRATE');
   assert.deepEqual(entry?.targetTables,['operational_records']);
 }
 const handlers=read('scripts/migrate/transformers.mjs');
 assert.match(handlers,/market_audit_log/);
 assert.match(handlers,/menu_audit_log/);
});
test('staging migration and schema scripts refuse unverified target identity',()=>{
 for(const file of ['scripts/migrate/apply-schema.mjs','scripts/migrate/mongo-to-turso.mjs','scripts/migrate/create-staging-run.mjs']) {
   const source=read(file);
   assert.match(source,/STAGING_TARGET_IDENTITY_UNVERIFIED/,file);
   assert.match(source,/TURSO_APPROVED_STAGING_NAME/,file);
 }
 const script=read('scripts/migrate/mongo-to-turso.mjs');
 assert.match(script,/CURRENT_SOURCE_BASELINE_UNVERIFIED/);
 assert.match(script,/sourceFingerprintSha256/);
 assert.doesNotMatch(script,/backupSha256:\s*BACKUP_SHA256/);
});
test('rejects fail closed and verified schema is pinned to the latest checkout invariants',()=>{
 assert.match(read('scripts/migrate/mongo-to-turso.mjs'),/if \(report\.rejected\.length\) process\.exitCode = 1/);
 assert.match(read('scripts/migrate/verify-mongodb-turso.mjs'),/if \(!report\.pass\) process\.exitCode = 1/);
 const schema=read('scripts/migrate/verify-schema.mjs');
 assert.match(schema,/0012_checkout_payment_invariants\.sql/);
 assert.match(schema,/tables\.length===41&&versions\.length===12/);
});
