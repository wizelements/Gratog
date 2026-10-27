import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {EJSON,ObjectId,Decimal128,Long,Binary} from 'bson';
import {createHash} from 'node:crypto';

test('Extended JSON preserves MongoDB value types and canonical fingerprints',()=>{
  const original={
    _id:new ObjectId('64f111111111111111111111'),
    createdAt:new Date('2026-10-20T05:06:07.008Z'),
    balance:Decimal128.fromString('123.4500'),
    count:Long.fromString('9223372036854775807'),
    binary:new Binary(Buffer.from([0,1,255])),
    nested:{values:[null,true,'test']}
  };
  const payload=EJSON.stringify(original,{relaxed:false});
  const round=EJSON.parse(payload,{relaxed:false});
  assert.ok(round._id instanceof ObjectId);
  assert.equal(round._id.toString(),original._id.toString());
  assert.ok(round.createdAt instanceof Date);
  assert.equal(round.createdAt.toISOString(),original.createdAt.toISOString());
  assert.equal(round.balance.toString(),'123.4500');
  assert.equal(round.count.toString(),'9223372036854775807');
  assert.deepEqual(Array.from(round.binary.buffer),[0,1,255]);
  assert.equal(createHash('sha256').update(payload).digest('hex').length,64);
});

test('shadow migration is additive, enforces unique source identities and SHA lengths',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(readFileSync('db/migrations/0021_mongodb_lossless_shadow.sql','utf8'));
    const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'mongo_shadow_%' ORDER BY name").all().map(x=>x.name);
    assert.deepEqual(names,[
      'mongo_shadow_documents','mongo_shadow_index_specs','mongo_shadow_mirror_runs'
    ]);
    db.prepare('INSERT INTO mongo_shadow_documents (collection_name,source_id_ejson,document_ejson,content_sha256,mirror_run_id) VALUES (?,?,?,?,?)')
      .run('orders','"1"','{}','a'.repeat(64),'run1');
    assert.throws(()=>db.prepare('INSERT INTO mongo_shadow_documents (collection_name,source_id_ejson,document_ejson,content_sha256,mirror_run_id) VALUES (?,?,?,?,?)')
      .run('orders','"1"','{}','b'.repeat(64),'run2'),/UNIQUE/);
    assert.throws(()=>db.prepare('INSERT INTO mongo_shadow_documents (collection_name,source_id_ejson,document_ejson,content_sha256,mirror_run_id) VALUES (?,?,?,?,?)')
      .run('orders','"2"','{}','x','run2'),/CHECK/);
  }finally{db.close()}
});

for(const script of ['scripts/migrate/mirror-mongodb-lossless.mjs','scripts/migrate/backfill-turso-identity.mjs']){
  test(script+' fails closed without explicit staging and read-only source',()=>{
    const env={...process.env,MONGODB_URI:'',TURSO_AUTH_TOKEN:'',TURSO_DATABASE_URL:'',
      TURSO_TARGET_ENV:'production',TOG_SOURCE_READ_ONLY:'false'};
    const result=spawnSync(process.execPath,[script,'--apply'],{env,encoding:'utf8',timeout:12000});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/STAGING_AND_READ_ONLY_SOURCE_REQUIRED|MIRROR_GUARD_REQUIRES_EXACT_STAGING/);
  });
}
