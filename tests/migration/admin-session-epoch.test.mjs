import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {transformDocument} from '../../scripts/migrate/transformers.mjs';
import {insertStatement} from '../../scripts/migrate/upsert-policy.mjs';
import {getTursoVerifiedAdminSession} from '../../lib/auth/turso-admin-session.mjs';
import * as policy from '../../lib/auth/admin-session-policy.mjs';
import * as mongoSessions from '../../lib/auth/mongo-admin-session.mjs';
import {persistTursoAdminAudit,readTursoAdminAudit} from '../../lib/auth/turso-admin-audit.mjs';
import crypto from 'node:crypto';

const source={_id:'507f191e810c19729de860ea',id:'owner-business-id',email:'owner@example.invalid',
  role:'super_admin',isActive:true,active:true,tokenVersion:1,passwordHash:'fixture-hash',
  createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-18T00:00:00Z'};
const claim=(version=1)=>({id:source.id,email:source.email,role:source.role,sessionVersion:version});
function sqlFixture(){
  const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort())
    raw.exec(readFileSync('db/migrations/'+file,'utf8'));
  const db={all:async(sql,...args)=>raw.prepare(sql).all(...args),
    get:async(sql,...args)=>raw.prepare(sql).get(...args),run:async(sql,...args)=>raw.prepare(sql).run(...args)};
  const migrate=doc=>{raw.exec('BEGIN IMMEDIATE');try{
    for(const st of transformDocument('admin_users',doc).statements){const q=insertStatement(st.table,st.row);raw.prepare(q.sql).run(...q.args);}
    raw.exec('COMMIT');
  }catch(error){raw.exec('ROLLBACK');throw error;}};
  migrate(source);return{raw,db,migrate};
}

test('explicit legacy disposition denies pre-epoch claims while preserving administrator IDs and aliases',async()=>{
  const {raw,db}=sqlFixture();try{
    const old=claim();delete old.sessionVersion;
    assert.equal(await getTursoVerifiedAdminSession(db,old),null);
    assert.equal((await getTursoVerifiedAdminSession(db,claim())).id,source._id);
    assert.equal(raw.prepare('SELECT count(*) n FROM admin_identity_references WHERE admin_id=?').get(source._id).n,2);
  }finally{raw.close();}
});

test('direct SQL disable and reactivation never resurrect a captured pre-revocation token',async()=>{
  const {raw,db}=sqlFixture();try{
    raw.prepare('UPDATE admin_identities SET is_active=0 WHERE id=?').run(source._id);
    assert.equal(await getTursoVerifiedAdminSession(db,claim()),null);
    raw.prepare('UPDATE admin_identities SET is_active=1 WHERE id=?').run(source._id);
    assert.equal(await getTursoVerifiedAdminSession(db,claim()),null);
    assert.equal((await getTursoVerifiedAdminSession(db,claim(3))).role,'super_admin');
  }finally{raw.close();}
});

test('demotion and subsequent promotion invalidate prior elevated sessions permanently',async()=>{
  const {raw,db}=sqlFixture();try{
    raw.prepare('UPDATE admin_identities SET role=? WHERE id=?').run('admin',source._id);
    assert.equal(await getTursoVerifiedAdminSession(db,claim()),null);
    raw.prepare('UPDATE admin_identities SET role=? WHERE id=?').run('super_admin',source._id);
    assert.equal(await getTursoVerifiedAdminSession(db,claim()),null);
    assert.equal((await getTursoVerifiedAdminSession(db,claim(3))).role,'super_admin');
    assert.throws(()=>raw.prepare('UPDATE admin_identities SET session_version=1').run(),/REGRESSION/);
  }finally{raw.close();}
});

test('migrated password rotation revokes captured sessions and replay cannot lower the epoch',async()=>{
  const {raw,db,migrate}=sqlFixture();try{
    migrate({...source,passwordHash:'rotated-fixture-hash',updatedAt:'2026-10-19T00:00:00Z'});
    assert.equal(await getTursoVerifiedAdminSession(db,claim()),null);
    assert.equal((await getTursoVerifiedAdminSession(db,claim(2))).id,source._id);
    migrate({...source,updatedAt:'2026-10-18T01:00:00Z'});
    assert.equal(raw.prepare('SELECT session_version FROM admin_identities').get().session_version,2);
    assert.equal(await getTursoVerifiedAdminSession(db,claim()),null);
  }finally{raw.close();}
});

// Minimal boundary fixture implements the Mongo match/update operators used by
// the production CAS. Tests inject state changes between password read and CAS.
function mongoFixture(initial=source){
  const state={record:{...initial},beforeCommit:null,writes:0};
  const matches=(doc,q)=>Object.entries(q).every(([key,value])=>{
    if(key==='$or')return value.some(x=>matches(doc,x));
    if(value&&typeof value==='object'){
      if('$exists'in value)return Object.hasOwn(doc,key)===value.$exists;
      if('$ne'in value)return doc[key]!==value.$ne;
    }return doc[key]===value;
  });
  const update=(q,u)=>{if(state.beforeCommit){state.beforeCommit(state.record);state.beforeCommit=null;}
    if(!matches(state.record,q))return false;
    Object.assign(state.record,u.$set);if(u.$inc)for(const[key,n]of Object.entries(u.$inc))state.record[key]=(state.record[key]??0)+n;
    state.writes++;return true;};
  const collection={findOneAndUpdate:async(q,u)=>update(q,u)?{...state.record}:null,
    updateOne:async(q,u)=>({matchedCount:update(q,u)?1:0,modifiedCount:state.writes?1:0})};
  return{state,collection};
}

test('Mongo login rejects either explicit false active flag and unverified accounts',async()=>{
  for(const flags of [{active:false},{isActive:false},{active:undefined,isActive:undefined}]){
    const {collection,state}=mongoFixture({...source,...flags});
    await assert.rejects(mongoSessions.establishMongoAdminLogin(collection,state.record),/STATE_INVALID/);
    assert.equal(state.writes,0);
  }
});

test('fresh password login initializes a legacy account epoch without granting legacy JWTs access',async()=>{
  const legacy={...source};delete legacy.tokenVersion;
  const {collection,state}=mongoFixture(legacy);
  const current=await mongoSessions.establishMongoAdminLogin(collection,legacy);
  assert.equal(current.tokenVersion,1);
  const old=claim();delete old.sessionVersion;
  assert.equal(policy.sessionMatchesAdminVersion(old,current.tokenVersion),false);
  assert.equal(state.writes,1);
});

test('password-reset and disable/role changes use one confirmed atomic epoch rotation',async()=>{
  const {collection,state}=mongoFixture();const old=claim();
  await mongoSessions.updateMongoAdminSecurity(collection,{_id:source._id},{active:false});
  await mongoSessions.updateMongoAdminSecurity(collection,{_id:source._id},{active:true});
  assert.equal(policy.sessionMatchesAdminVersion(old,state.record.tokenVersion),false);
  await mongoSessions.updateMongoAdminSecurity(collection,{_id:source._id},{role:'admin'});
  await mongoSessions.updateMongoAdminSecurity(collection,{_id:source._id},{role:'super_admin'});
  assert.equal(policy.sessionMatchesAdminVersion(old,state.record.tokenVersion),false);
  const beforeReset=claim(state.record.tokenVersion);
  await mongoSessions.updateMongoAdminSecurity(collection,{_id:source._id},{passwordHash:'reset-fixture',passwordUpdatedAt:new Date()});
  assert.equal(policy.sessionMatchesAdminVersion(beforeReset,state.record.tokenVersion),false);
  await assert.rejects(mongoSessions.updateMongoAdminSecurity({updateOne:async()=>({matchedCount:1,modifiedCount:0})},{id:'owner'},{active:false}),/UNCONFIRMED/);
});

test('concurrent revocation or password change after password verification cannot mint a fresh epoch',async()=>{
  for(const mutation of [row=>{row.active=false;row.tokenVersion++;},row=>{row.passwordHash='replacement';row.tokenVersion++;}]){
    const {collection,state}=mongoFixture();const verified={...state.record};state.beforeCommit=mutation;
    await assert.rejects(mongoSessions.establishMongoAdminLogin(collection,verified),/STATE_CHANGED/);
    assert.equal(state.writes,0);
  }
});

const logger={debug(){},info(){},warn(){},error(){}};
async function loadTs(path,bindings){
  const context=createContext({Date,URL,JSON,Set,Map,Headers,Response,TextEncoder,Buffer,crypto,
    process:{env:{NODE_ENV:'test',JWT_SECRET:'x'.repeat(40)}},console:{warn(){},error(){},log(){}}});
  const module=new SourceTextModule(stripTypeScriptTypes(readFileSync(path,'utf8'),{mode:'strip'}),{context,identifier:path});
  await module.link(name=>{assert.ok(bindings[name],'Unmocked dependency '+name);const values=bindings[name];
    return new SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});});
  await module.evaluate();return module.namespace;
}

test('actual database-backed TypeScript session rejects missing/rotated epoch and never elevates stale role',async()=>{
  const state={payload:claim(),record:{...source},reads:0};
  const api=await loadTs('lib/auth/unified-admin.ts',{
    'next/server':{NextRequest:class{},NextResponse:class{}},
    jose:{jwtVerify:async()=>({payload:state.payload}),SignJWT:class{}},
    bcryptjs:{},mongodb:{ObjectId:class{static isValid(){return false;}}},
    '@/lib/db-optimized':{connectToDatabase:async()=>({db:{collection:()=>({findOne:async()=>{state.reads++;return state.record;}})}})},
    '@/lib/logger':{logger},'@/lib/checkout/turso-preview-runtime.mjs':{tursoPreviewSelected:()=>false,openTursoPreview:async()=>{throw Error('Unexpected SQL');}},
    '@/lib/auth/turso-admin-session.mjs':{getTursoVerifiedAdminSession},
    '@/lib/auth/admin-session-policy.mjs':policy,'@/lib/auth/turso-admin-audit.mjs':{persistTursoAdminAudit},
  });
  const request={headers:new Headers({authorization:'Bearer fixture'}),cookies:{get:()=>undefined}};
  delete state.payload.sessionVersion;assert.equal(await api.getAdminSession(request),null);assert.equal(state.reads,0);
  state.payload=claim();state.record.tokenVersion=2;assert.equal(await api.getAdminSession(request),null);
  state.payload=claim(2);state.payload.role='admin';assert.equal((await api.getAdminSession(request)).role,'admin');
});

test('canonical server facade refuses a revoked user even when the cookie passes JWT verification',async()=>{
  let verified=0;
  const api=await loadTs('lib/admin-session.ts',{
    'next/server':{NextRequest:class{},NextResponse:class{}},
    'jose/jwt/verify':{jwtVerify:async()=>({payload:claim()})},'jose/jwt/sign':{SignJWT:class{}},
    '@/lib/auth/unified-admin':{getAdminSession:async()=>{verified++;return null;}},
    '@/lib/auth/admin-session-policy.mjs':policy,
  });
  const request={headers:new Headers({cookie:'admin_token=fixture'}),cookies:{get:()=>({value:'fixture'})}};
  assert.equal(await api.getAdminSession(request),null);
  await assert.rejects(api.requireAdmin(request),error=>error.statusCode===401);
  assert.equal(verified,2);
});

test('actual login endpoint denies active:false before password or token work',async()=>{
  let signed=0,compared=0;
  const chain={email(){return this;},min(){return this;},max(){return this;},optional(){return this;},default(){return this;}};
  const api=await loadTs('app/api/admin/auth/login/route.ts',{
    'next/server':{NextRequest:class{},NextResponse:{json:(data,init)=>Response.json(data,init)}},
    bcryptjs:{default:{compare:async()=>{compared++;return true;}}},
    zod:{z:{string:()=>chain,boolean:()=>chain,object:()=>({strict(){return this;},safeParse:body=>({success:true,data:body})})}},
    '@/lib/db-optimized':{connectToDatabase:async()=>({db:{collection:()=>({findOne:async()=>({...source,active:false})})}})},
    '@/lib/logger':{logger},'@/lib/auth/admin-session-policy.mjs':policy,
    '@/lib/checkout/turso-preview-runtime.mjs':{tursoPreviewSelected:()=>false,openTursoPreview:async()=>{throw Error('UNEXPECTED_SQL_OPEN')}},
    '@/lib/auth/turso-admin-login.mjs':{findTursoAdminCredentials:async()=>{throw Error('UNEXPECTED_SQL_LOGIN')},establishTursoAdminLogin:async()=>{throw Error('UNEXPECTED_SQL_LOGIN')}},
    '@/lib/auth/mongo-admin-session.mjs':mongoSessions,
    '@/lib/auth/unified-admin':{generateAdminToken:async()=>{signed++;return'fixture';},generateCsrfToken:()=>''},
  });
  const response=await api.POST({headers:new Headers(),json:async()=>({email:source.email,password:'valid-fixture',rememberMe:false})});
  assert.equal(response.status,401);assert.equal(signed,0);assert.equal(compared,0);
});

test('Turso administrator audit is durable, filterable and rejects unconfirmed writes',async()=>{
  const {raw,db}=sqlFixture();try{
    await persistTursoAdminAudit(db,{timestamp:new Date('2026-10-19T00:00:00Z'),adminId:source._id,adminEmail:source.email,action:'UPDATE',resource:'products',success:true});
    const report=await readTursoAdminAudit(db,{adminId:source._id,success:true},{limit:10});
    assert.equal(report.total,1);assert.equal(report.logs[0].action,'UPDATE');
    assert.equal((await readTursoAdminAudit(db,{adminId:'other'})).total,0);
    await assert.rejects(persistTursoAdminAudit({run:async()=>({changes:0})},{timestamp:new Date()}),/UNCONFIRMED/);
  }finally{raw.close();}
});
