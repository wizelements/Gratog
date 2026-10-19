import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {getTursoCustomerForLogin,getTursoCustomerSession,
  TursoCustomerIdentityError} from '../../lib/auth/turso-customer-snapshot.mjs';

const validHash='$2b$10$'+ 'A'.repeat(53);
const fixture={_id:'507f191e810c19729de86111',id:'user-ecommerce-1',
  email:'Buyer@example.invalid',name:'Example Buyer',phone:'555-0000',
  passwordHash:validHash,joinedAt:'2026-10-01T00:00:00.000Z'};
function db(){
 const raw=new DatabaseSync(':memory:');
 raw.exec('CREATE TABLE operational_records (source_collection TEXT NOT NULL,source_id TEXT NOT NULL,payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),canonical_fingerprint TEXT NOT NULL,PRIMARY KEY(source_collection,source_id))');
 const put=(doc)=>raw.prepare('INSERT INTO operational_records (source_collection,source_id,payload_json,canonical_fingerprint) VALUES (?,?,?,?)')
   .run('users',doc._id,JSON.stringify(doc),'safe-test');
 const db={all:async(sql,...args)=>raw.prepare(sql).all(...args)};
 return {raw,db,put};
}
test('migrated customer login uses a unique verified bcrypt hash without exposing it in session',async()=>{
 const x=db();
 try{
  x.put(fixture);
  const login=await getTursoCustomerForLogin(x.db,' BUYER@example.invalid ');
  assert.equal(login.id,fixture.id);
  assert.equal(login.passwordHash,validHash);
  const session=await getTursoCustomerSession(x.db,{userId:fixture.id,email:fixture.email});
  assert.equal(session.id,fixture.id);
  assert.equal(session.email,'buyer@example.invalid');
  assert.equal('passwordHash' in session,false);
 }finally{x.raw.close()}
});
test('duplicate login email or legacy user id refuses rather than selecting a record',async()=>{
 const x=db();
 try{
  x.put(fixture);
  x.put({...fixture,_id:'507f191e810c19729de86112',id:'user-ecommerce-2'});
  await assert.rejects(getTursoCustomerForLogin(x.db,fixture.email),TursoCustomerIdentityError);
  assert.equal((await getTursoCustomerSession(x.db,{userId:fixture.id,email:fixture.email})).id,fixture.id);
  // Distinct legacy IDs must never bind to the same JWT subject.
  x.raw.prepare('UPDATE operational_records SET payload_json=? WHERE source_id=?')
    .run(JSON.stringify({...fixture,_id:'507f191e810c19729de86112'}),'507f191e810c19729de86112');
  await assert.rejects(getTursoCustomerSession(x.db,{userId:fixture.id,email:fixture.email}),TursoCustomerIdentityError);
 }finally{x.raw.close()}
});
test('deleted, disabled, malformed hashes, and mismatched signed email reject access',async()=>{
 for(const change of [{isActive:false},{active:false},{disabled:true},{deleted:true},
  {status:'revoked'},{passwordHash:'plaintext'}]){
  const x=db();
  try{
   x.put({...fixture,...change});
   assert.equal(await getTursoCustomerForLogin(x.db,fixture.email),null);
   if(change.passwordHash===undefined)
    assert.equal(await getTursoCustomerSession(x.db,{userId:fixture.id,email:fixture.email}),null);
  }finally{x.raw.close()}
 }
 const x=db();
 try{
  x.put(fixture);
  assert.equal(await getTursoCustomerSession(x.db,{userId:fixture.id,email:'attacker@example.invalid'}),null);
  assert.equal(await getTursoCustomerSession(x.db,{userId:'missing',email:fixture.email}),null);
  assert.equal(await getTursoCustomerSession(x.db,{userId:fixture.id}),null);
  await assert.rejects(getTursoCustomerSession({all:async()=>{throw Error('SQL_UNAVAILABLE')}},{userId:fixture.id,email:fixture.email}),/SQL_UNAVAILABLE/);
 }finally{x.raw.close()}
});
test('auth endpoints select isolated Turso for login/session, never depend on Mongo in that branch',()=>{
 for(const file of ['app/api/auth/login/route.ts','app/api/auth/session/route.ts']){
  const src=readFileSync(file,'utf8');
  assert.match(src,/tursoPreviewSelected\(\)/);
  assert.match(src,/openTursoPreview\(\)/);
  assert.match(src,/getTursoCustomer(?:ForLogin|Session)\(/);
  assert.match(src,/findUserBy(?:Email|Id)\(/);
 }
});
