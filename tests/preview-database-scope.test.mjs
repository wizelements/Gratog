import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyzeScope} from '../scripts/verify-preview-database-scope.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const now=Date.parse('2026-10-27T15:00:00Z');
const cluster='mongodb+srv://cluster.example';
const baseline={cluster:hash(cluster),namespace:hash(cluster+'/live'),
 principal:hash(cluster+'|production-user'),databaseName:hash('live'),capturedAt:'2026-10-27T14:59:00Z'};
const scope=(extra={})=>analyzeScope({uri:'mongodb+srv://preview-user:private@cluster.example/preview',
 actualDatabase:'preview',baseline,now,authInfo:{authenticatedUsers:[{user:'preview-user'}],
 authenticatedUserPrivileges:[{resource:{db:'preview',collection:''},actions:['find','insert','update','remove']}]},...extra});
test('separate namespace with database-scoped principal passes',()=>assert.equal(scope().pass,true));
test('same production namespace cannot pass even with a different username',()=>{
 const proof=scope({uri:'mongodb+srv://preview-user:private@cluster.example/live',actualDatabase:'live'});
 assert.equal(proof.pass,false);assert.equal(proof.sameConfiguredNamespace,true);
});
test('separate database with cluster-wide write privileges fails',()=>{
 const proof=scope({authInfo:{authenticatedUsers:[{}],authenticatedUserPrivileges:[
  {resource:{db:'',collection:''},actions:['insert','update']}]}});
 assert.equal(proof.pass,false);assert.equal(proof.productionWritePrivilegeDetected,true);
});
test('explicit production database write grant fails',()=>{
 const proof=scope({authInfo:{authenticatedUsers:[{}],authenticatedUserPrivileges:[
  {resource:{db:'live',collection:'orders'},actions:['insert']}]}});
 assert.equal(proof.pass,false);assert.equal(proof.productionWritePrivilegeDetected,true);
});
test('missing privilege evidence cannot certify isolation',()=>assert.equal(scope({authInfo:{authenticatedUsers:[{}]}}).pass,false));
test('effective database mismatch fails despite distinct configured URI',()=>assert.equal(scope({actualDatabase:'other'}).pass,false));
test('stale production baseline fails',()=>assert.equal(scope({now:now+86400000}).pass,false));
test('unknown global actions fail conservatively while global read actions do not',()=>{
 const authInfo={authenticatedUsers:[{}],authenticatedUserPrivileges:[{resource:{db:'',collection:''},actions:['futureUnknownWrite']}]};
 assert.equal(scope({authInfo}).pass,false);
 authInfo.authenticatedUserPrivileges[0].actions=['listDatabases'];
 assert.equal(scope({authInfo}).pass,true);
});
test('proof contains no URI or credentials',()=>{
 const result=JSON.stringify(scope());
 assert.equal(result.includes('private'),false);assert.equal(result.includes('mongodb'),false);
});
