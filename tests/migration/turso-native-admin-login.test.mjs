import {test} from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {nativeSqlite} from '../helpers/native-sqlite.mjs';
import {findTursoAdminCredentials,establishTursoAdminLogin} from '../../lib/auth/turso-admin-login.mjs';
import {getTursoVerifiedAdminSession} from '../../lib/auth/turso-admin-session.mjs';
const hash=bcrypt.hashSync('Private fixture password42!',4);
const admin={_id:'admin-mongo-id',id:'admin-business-id',email:'admin@example.invalid',
  name:'Fixture Admin',role:'super_admin',isActive:true,passwordHash:hash,
  createdAt:'2026-10-18T10:00:00Z',updatedAt:'2026-10-18T10:00:00Z'};
test('native password login preserves canonical identity and durably records login before signing',async()=>{
  const f=nativeSqlite();try{
    f.importDoc('admin_users',admin);
    const verified=await findTursoAdminCredentials(f.db,' ADMIN@example.invalid ');
    assert.equal(verified.passwordHash,hash);assert.equal(verified.id,admin._id);
    const current=await establishTursoAdminLogin(f.db,verified);
    assert.equal(current.tokenVersion,1);
    const session=await getTursoVerifiedAdminSession(f.db,{id:current.id,email:current.email,role:current.role,sessionVersion:current.tokenVersion});
    assert.equal(session.id,admin._id);
    const log=f.raw.prepare("SELECT payload_json FROM operational_records WHERE source_collection='audit_logs'").get();
    assert.equal(JSON.parse(log.payload_json).action,'LOGIN_SUCCESS');
    const raw=JSON.parse(f.raw.prepare("SELECT payload_json FROM operational_records WHERE source_collection='admin_users'").get().payload_json);
    assert.ok(raw.lastLogin);assert.equal(raw.passwordHash,hash);
  }finally{f.close()}
});
test('revocation between password check and token issuance cannot establish a login',async()=>{
  const f=nativeSqlite();try{
    f.importDoc('admin_users',admin);
    const verified=await findTursoAdminCredentials(f.db,admin.email);
    f.raw.prepare('UPDATE admin_identities SET is_active=0 WHERE id=?').run(admin._id);
    f.raw.prepare('UPDATE admin_identities SET is_active=1 WHERE id=?').run(admin._id);
    await assert.rejects(establishTursoAdminLogin(f.db,verified),/LOGIN_STATE_CHANGED/);
    assert.equal(f.raw.prepare("SELECT count(*) n FROM operational_records WHERE source_collection='audit_logs'").get().n,0);
  }finally{f.close()}
});
test('unverified credential record or failed audit refuses login and rolls back last-login update',async()=>{
  const f=nativeSqlite();try{
    f.importDoc('admin_users',admin);
    const verified=await findTursoAdminCredentials(f.db,admin.email);
    f.inject((q,args)=>{if(q.startsWith('INSERT INTO operational_records')&&args[0]==='audit_logs')throw Error('AUDIT_FAILURE')});
    await assert.rejects(establishTursoAdminLogin(f.db,verified),/AUDIT_FAILURE/);
    const raw=JSON.parse(f.raw.prepare("SELECT payload_json FROM operational_records WHERE source_collection='admin_users'").get().payload_json);
    assert.equal(raw.lastLogin,undefined);
    f.raw.prepare("UPDATE admin_identities SET credential_fingerprint='not-verified' WHERE id=?").run(admin._id);
    await assert.rejects(findTursoAdminCredentials(f.db,admin.email),/CREDENTIAL_IDENTITY_MISMATCH/);
  }finally{f.close()}
});
