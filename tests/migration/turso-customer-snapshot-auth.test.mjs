import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeSqlite} from '../helpers/native-sqlite.mjs';
import {createTursoCustomerSession} from '../../lib/auth/turso-customer-accounts.mjs';
import {getTursoCustomerForLogin,getTursoCustomerSession} from '../../lib/auth/turso-customer-snapshot.mjs';
const validHash='$2b$10$'+'A'.repeat(53);
const fixture={_id:'507f191e810c19729de86111',id:'user-ecommerce-1',
  email:'Buyer@example.invalid',name:'Example Buyer',phone:'555-0000',
  passwordHash:validHash,joinedAt:'2026-10-01T00:00:00.000Z'};
test('integrated auth preserves migrated identity but requires a persistent signed-session claim',async()=>{
  const f=nativeSqlite();try{
    f.importDoc('users',fixture);
    const login=await getTursoCustomerForLogin(f.db,' BUYER@example.invalid ');
    assert.equal(login.id,fixture.id);assert.equal(login.passwordHash,validHash);
    assert.equal(await getTursoCustomerSession(f.db,{userId:fixture.id,email:fixture.email}),null);
    const claim=await createTursoCustomerSession(f.db,login.id,login.email,login.passwordHash);
    const session=await getTursoCustomerSession(f.db,claim);
    assert.equal(session.id,fixture.id);assert.equal('passwordHash' in session,false);
    f.raw.prepare('UPDATE customer_accounts SET active=0 WHERE user_id=?').run(fixture.id);
    assert.equal(await getTursoCustomerSession(f.db,claim),null);
  }finally{f.close()}
});
test('duplicate normalized identities cannot silently choose a password record',async()=>{
  const f=nativeSqlite();try{
    f.importDoc('users',fixture);
    assert.throws(()=>f.importDoc('users',{...fixture,_id:'duplicate-source',id:'duplicate-business'}),/UNIQUE/);
    assert.equal(f.raw.prepare('SELECT count(*) n FROM customer_accounts').get().n,1);
  }finally{f.close()}
});
test('source revocation fields remain enforced by the normalized identity',async()=>{
  for(const change of [{isActive:false},{active:false},{disabled:true},{deleted:true},{status:'revoked'}]){
    const f=nativeSqlite();try{
      f.importDoc('users',{...fixture,...change});
      assert.equal(await getTursoCustomerForLogin(f.db,fixture.email),null);
    }finally{f.close()}
  }
});
test('SQL failure cannot become a stale snapshot session or Mongo lookup',async()=>{
  await assert.rejects(getTursoCustomerSession({get:async()=>{throw Error('SQL_UNAVAILABLE')}},
    {sub:fixture._id,userId:fixture.id,email:fixture.email,sid:'a'.repeat(64),sv:0}),/SQL_UNAVAILABLE/);
});
test('auth endpoints retain the explicit exclusive isolated Turso branch',()=>{
  for(const file of ['app/api/auth/login/route.ts','app/api/auth/session/route.ts']){
    const src=readFileSync(file,'utf8');
    assert.match(src,/tursoPreviewSelected\(\)/);assert.match(src,/openTursoPreview\(\)/);
    assert.match(src,/getTursoCustomer(?:ForLogin|Session)\(/);
  }
});
