import {test} from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {createHash} from 'node:crypto';
import {nativeSqlite} from '../helpers/native-sqlite.mjs';
import {createTursoCustomerAccount,findTursoCustomerByEmail,createTursoCustomerSession,
  verifyTursoCustomerSession,revokeTursoCustomerSession,createTursoPasswordReset,consumeTursoPasswordReset,
  listTursoCustomerOrders,getTursoCustomerStats,getTursoCustomerFavorites,updateTursoCustomerAccount,
  checkInTursoCustomer,readTursoAccountRecord,updateTursoEmailPreferences,readTursoEmailPreferences}
  from '../../lib/auth/turso-customer-accounts.mjs';
const hash=bcrypt.hashSync('Account fixture password!42',4);
const newer=bcrypt.hashSync('Rotated fixture password!42',4);
const sha=x=>createHash('sha256').update(x).digest('hex');
const signup={name:'Test Buyer',email:'buyer@example.invalid',passwordHash:hash};
test('new customer account has persistent identity, hash and unique normalized email',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,{...signup,email:' BUYER@example.invalid '});
    assert.equal(user.email,signup.email);assert.equal(user.passwordHash,undefined);
    assert.equal((await findTursoCustomerByEmail(f.db,signup.email)).passwordHash,hash);
    await assert.rejects(createTursoCustomerAccount(f.db,signup),/already registered/);
    assert.equal(f.raw.prepare('SELECT count(*) n FROM customer_accounts').get().n,1);
    assert.equal((await updateTursoCustomerAccount(f.db,user.id,{name:'New Name',passwordHash:newer})).name,'New Name');
    assert.equal((await findTursoCustomerByEmail(f.db,signup.email)).passwordHash,hash);
  }finally{f.close()}
});
test('customer sessions survive a fresh connection wrapper, logout and security changes revoke them',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,signup);
    const session=await createTursoCustomerSession(f.db,user.id,user.email,hash);
    assert.equal((await verifyTursoCustomerSession({...f.db},session)).userId,user.id);
    assert.equal(await verifyTursoCustomerSession(f.db,{userId:user.id,email:user.email}),null);
    await revokeTursoCustomerSession(f.db,session);
    assert.equal(await verifyTursoCustomerSession(f.db,session),null);
    const second=await createTursoCustomerSession(f.db,user.id,user.email,hash);
    f.raw.prepare('UPDATE customer_accounts SET active=0 WHERE user_id=?').run(user.id);
    f.raw.prepare('UPDATE customer_accounts SET active=1 WHERE user_id=?').run(user.id);
    assert.equal(await verifyTursoCustomerSession(f.db,second),null);
    assert.notEqual(f.raw.prepare('SELECT token_hash FROM customer_sessions LIMIT 1').get().token_hash,session.sid);
  }finally{f.close()}
});
test('password verification state cannot mint a session after a password rotation',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,signup);
    f.raw.prepare('UPDATE customer_accounts SET password_hash=? WHERE user_id=?').run(newer,user.id);
    await assert.rejects(createTursoCustomerSession(f.db,user.id,user.email,hash),/SESSION_DENIED/);
    await assert.rejects(createTursoCustomerSession(f.db,user.id,user.email),/SESSION_DENIED/);
    assert.equal(f.raw.prepare('SELECT count(*) n FROM customer_sessions').get().n,0);
  }finally{f.close()}
});
test('reset token is single-use and password/session updates roll back together on failure',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,signup);
    const session=await createTursoCustomerSession(f.db,user.id,user.email,hash);
    const token=sha('private fixture reset token');
    await createTursoPasswordReset(f.db,user.id,token,new Date(Date.now()+60000).toISOString());
    f.inject(q=>{if(q.startsWith('UPDATE customer_sessions'))throw Error('DB_INTERRUPTED')});
    await assert.rejects(consumeTursoPasswordReset(f.db,token,newer),/DB_INTERRUPTED/);
    assert.equal((await findTursoCustomerByEmail(f.db,user.email)).passwordHash,hash);
    assert.ok(await verifyTursoCustomerSession(f.db,session));
    f.inject(()=>{});
    assert.equal(await consumeTursoPasswordReset(f.db,token,newer),true);
    assert.equal(await consumeTursoPasswordReset(f.db,token,hash),false);
    assert.equal(await verifyTursoCustomerSession(f.db,session),null);
    assert.equal((await findTursoCustomerByEmail(f.db,user.email)).passwordHash,newer);
  }finally{f.close()}
});
test('a typed guest email never grants historical orders; explicit user identity does',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,signup);
    const order={_id:'guest-order',total:11.99,createdAt:'2026-10-18T12:00:00Z',updatedAt:'2026-10-18T12:00:00Z',status:'paid',customer:{email:user.email},items:[{name:'Historic Drink',quantity:2,price:5.995}]};
    order.items=[{name:'Historic Drink',productId:'historic-product',quantity:1,price:11.99}];
    f.importDoc('orders',order);
    assert.deepEqual(await listTursoCustomerOrders(f.db,user.id),[]);
    f.importDoc('orders',{...order,_id:'owned-order',userId:user.id});
    const history=await listTursoCustomerOrders(f.db,user.id);
    assert.equal(history.length,1);assert.equal(history[0].id,'owned-order');assert.equal(history[0].total,11.99);
    assert.equal((await getTursoCustomerStats(f.db,user.id)).totalOrders,1);
    assert.equal((await getTursoCustomerFavorites(f.db,user.id))[0].totalOrdered,1);
  }finally{f.close()}
});
test('source user IDs/password hashes are retained without linking unrelated guest contacts',async()=>{
  const f=nativeSqlite();try{
    f.importDoc('users',{_id:'mongo-user',id:'public-user-id',...signup,createdAt:'2026-10-18T12:00:00Z'});
    const user=await findTursoCustomerByEmail(f.db,signup.email);
    assert.equal(user.id,'public-user-id');assert.equal(user.passwordHash,hash);
    assert.equal(f.raw.prepare('SELECT customer_id FROM customer_accounts').get().customer_id,null);
    f.importDoc('users',{_id:'mongo-user',id:'public-user-id',...signup,active:false,updatedAt:'2026-10-19T12:00:00Z'});
    assert.equal(await findTursoCustomerByEmail(f.db,signup.email),null);
    f.importDoc('users',{_id:'mongo-user',id:'public-user-id',...signup,updatedAt:'2026-10-18T12:00:00Z'});
    assert.equal(await findTursoCustomerByEmail(f.db,signup.email),null,'old snapshots cannot reactivate');
  }finally{f.close()}
});
test('daily check-in and reward credit commit together and a same-day replay earns nothing',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,signup);
    f.inject((q,args)=>{if(q.startsWith('INSERT INTO operational_records')&&args[0]==='rewards')throw Error('CREDIT_INTERRUPTED')});
    await assert.rejects(checkInTursoCustomer(f.db,user.id,'2026-10-19T12:00:00Z'),/CREDIT_INTERRUPTED/);
    assert.equal(await readTursoAccountRecord(f.db,'challenges',user.id),null);
    f.inject(()=>{});
    assert.equal((await checkInTursoCustomer(f.db,user.id,'2026-10-19T12:00:00Z')).pointsEarned,5);
    await assert.rejects(checkInTursoCustomer(f.db,user.id,'2026-10-19T13:00:00Z'),/Already checked in today/);
    assert.equal((await readTursoAccountRecord(f.db,'rewards',user.id)).points,5);
  }finally{f.close()}
});
test('email preferences persist exact booleans and reject truthy strings',async()=>{
  const f=nativeSqlite();try{
    const user=await createTursoCustomerAccount(f.db,signup);
    await updateTursoEmailPreferences(f.db,user.id,{marketing:false});
    assert.equal((await readTursoEmailPreferences(f.db,user.id)).marketing,false);
    await assert.rejects(updateTursoEmailPreferences(f.db,user.id,{marketing:'false'}),/PREFERENCES_INVALID/);
    assert.equal((await readTursoEmailPreferences(f.db,user.id)).marketing,false);
  }finally{f.close()}
});
