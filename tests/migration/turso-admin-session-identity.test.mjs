import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {transformDocument} from '../../scripts/migrate/transformers.mjs';
import {insertStatement} from '../../scripts/migrate/upsert-policy.mjs';
import {getTursoVerifiedAdminSession} from '../../lib/auth/turso-admin-session.mjs';

const initial={_id:'507f191e810c19729de860ea',id:'admin-user-123',
 email:'ADMIN@example.invalid',role:'super_admin',isActive:true,active:true,
 createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-18T00:00:00Z'};
const build=()=>{
  const raw=new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys=ON');
  const files=readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort();
  for(const file of files)raw.exec(readFileSync('db/migrations/'+file,'utf8'));
  const db={all:async(sql,...args)=>raw.prepare(sql).all(...args)};
  const importDoc=(doc)=>{
    const statements=transformDocument('admin_users',doc).statements;
    raw.exec('BEGIN IMMEDIATE');
    try {
      for(const statement of statements){
        const {sql,args}=insertStatement(statement.table,statement.row);
        raw.prepare(sql).run(...args);
      }
      raw.exec('COMMIT');
    }catch(error){raw.exec('ROLLBACK');throw error;}
    return statements;
  };
  return {raw,db,importDoc,files};
};
test('admin source migration retains raw evidence and two immutable identity aliases',async()=>{
 const {raw,db,importDoc,files}=build();
 try {
   assert.equal(files.at(-1),'0015_admin_identity.sql');
   const st=importDoc(initial);
   assert.ok(st.some(x=>x.table==='operational_records'));
   assert.ok(st.some(x=>x.table==='admin_identities'));
   assert.equal(st.filter(x=>x.table==='admin_identity_references').length,2);
   const byBusiness=await getTursoVerifiedAdminSession(db,{
     id:'admin-user-123',email:'ADMIN@example.invalid',role:'super_admin'});
   const byMongo=await getTursoVerifiedAdminSession(db,{
     id:initial._id,email:'ADMIN@example.invalid',role:'super_admin'});
   assert.equal(byBusiness.id,initial._id);
   assert.equal(byMongo.id,initial._id);
   assert.equal(byMongo.email,'admin@example.invalid');
   assert.equal(byBusiness.role,'super_admin');
   assert.equal(raw.prepare('SELECT count(*) as n FROM operational_records WHERE source_collection=?').get('admin_users').n,1);
 }finally {raw.close();}
});
test('revocation is immediately enforced despite previously signed admin claim',async()=>{
 const {raw,db,importDoc}=build();
 try {
   importDoc(initial);
   const claim={id:initial.id,email:initial.email,role:'super_admin'};
   assert.equal((await getTursoVerifiedAdminSession(db,claim)).role,'super_admin');
   importDoc({...initial,active:false,updatedAt:'2026-10-18T21:30:00Z'});
   assert.equal(await getTursoVerifiedAdminSession(db,claim),null);
   importDoc({...initial,active:true,isActive:false,updatedAt:'2026-10-18T21:31:00Z'});
   assert.equal(await getTursoVerifiedAdminSession(db,claim),null);
 }finally {raw.close();}
});
test('no implicit elevation, unknown role, inactive principal, or unsigned identity',async()=>{
 const {raw,db,importDoc}=build();
 try {
   importDoc(initial);
   assert.equal((await getTursoVerifiedAdminSession(db,{
     id:initial.id,email:initial.email,role:'admin'})).role,'admin');
   assert.equal(await getTursoVerifiedAdminSession(db,{
     id:initial.id,email:initial.email,role:'staff'}),null);
   assert.equal(await getTursoVerifiedAdminSession(db,{
     id:'other',email:initial.email,role:'admin'}),null);
   importDoc({...initial,role:'staff',updatedAt:'2026-10-19T00:00:00Z'});
   assert.equal(await getTursoVerifiedAdminSession(db,{
     id:initial.id,email:initial.email,role:'super_admin'}),null);
 }finally {raw.close();}
});
test('alias collision rolls back, never rebinds a prior admin session',async()=>{
 const {raw,db,importDoc}=build();
 try {
   importDoc(initial);
   assert.throws(()=>importDoc({...initial,_id:'507f191e810c19729de860eb',
       email:'different@example.invalid'}),/ADMIN_REFERENCE_COLLISION/);
   assert.equal(raw.prepare('SELECT admin_id FROM admin_identity_references WHERE reference=?').get(initial.id).admin_id,initial._id);
   const old=await getTursoVerifiedAdminSession(db,{
     id:initial.id,email:initial.email,role:'admin'});
   assert.equal(old?.id,initial._id);
 }finally{raw.close();}
});
test('ambiguous identity, lost SQL, and missing flags cannot silently allow admin',async()=>{
 const {raw,db,importDoc}=build();
 try{
   importDoc({...initial,isActive:undefined,active:undefined});
   assert.equal(await getTursoVerifiedAdminSession(db,{
     id:initial.id,email:initial.email,role:'admin'}),null);
   await assert.rejects(getTursoVerifiedAdminSession({all:async()=>{throw Error('SQL_DOWN')}},{
     id:initial.id,email:initial.email,role:'admin'}),/SQL_DOWN/);
   await assert.rejects(getTursoVerifiedAdminSession({all:async()=>[
     {id:'one',role:'admin',is_active:1,email:'a@example.invalid'},
     {id:'two',role:'admin',is_active:1,email:'b@example.invalid'}]},{
     id:initial.id,email:initial.email,role:'admin'}),/AMBIGUOUS/);
 }finally{raw.close();}
});
test('actual admin authorization checks Turso first and requires active DB state',()=>{
  const source=readFileSync('lib/auth/unified-admin.ts','utf8');
  const s=source.match(/export async function getAdminSession\([^]*?\n\}/)?.[0];
  assert.ok(s);
  assert.match(s,/tursoPreviewSelected\(\)/);
  assert.match(s,/getTursoVerifiedAdminSession\(/);
  assert.ok(s.indexOf('getTursoVerifiedAdminSession(')<s.indexOf('connectToDatabase()'));
  assert.match(s,/ADMIN_VERIFICATION_UNAVAILABLE/);
});

test('stale snapshots and equal-time reactivation cannot undo a revocation',async()=>{
 const {raw,db,importDoc}=build();
 try{
   importDoc(initial);
   const revoked={...initial,isActive:false,active:false,updatedAt:'2026-10-18T22:00:00Z'};
   importDoc(revoked);
   importDoc({...initial,updatedAt:'2026-10-18T21:00:00Z'});
   importDoc({...initial,updatedAt:revoked.updatedAt});
   assert.equal(await getTursoVerifiedAdminSession(db,{
     id:initial.id,email:initial.email,role:'admin'}),null);
   assert.equal(raw.prepare('SELECT is_active FROM admin_identities').get().is_active,0);
 }finally{raw.close();}
});
