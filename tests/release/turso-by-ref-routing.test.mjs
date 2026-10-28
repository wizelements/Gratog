import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

async function route({ found = true, failure = false, authenticated = false } = {}) {
  const counts = { mongo: 0, fallback: 0, turso: 0 };
  const context=vm.createContext({ URL, console });
  class Refusal extends Error {}
  const row={ id:'o1',orderNumber:'TOG-one',status:'paid',paymentStatus:'paid',total:11.99,
    customer:{name:'Fixture',email:'fixture@example.invalid'},items:[],pricing:{total:11.99},fulfillment:{type:'pickup_market'} };
  const dependencies={
    'next/server': { NextResponse: { json:(body,options={})=>({body,status:options.status||200,headers:options.headers}) } },
    '@/lib/db-optimized': {connectToDatabase:async()=>{counts.mongo++;throw Error('Mongo forbidden')}},
    '@/lib/enhanced-order-tracking': {orderTracking:{getOrder:async()=>{counts.fallback++;return null}}},
    '@/lib/logger': {createLogger:()=>({info(){},warn(){},error(){}})},
    '@/lib/rewards-security': {verifyRequestAuthentication:async()=>({authenticated,userEmail:'fixture@example.invalid'})},
    '@/lib/order-access-token': {verifyOrderAccessToken:(token,{expectedOrderId,expectedEmail}={})=>
      token==='valid'&&(!expectedOrderId||expectedOrderId==='o1')&&(!expectedEmail||expectedEmail==='fixture@example.invalid')?{orderId:'o1'}:null},
    '@/lib/checkout/turso-preview-runtime.mjs': {tursoPreviewSelected:()=>true,TursoPreviewRefusal:Refusal},
    '@/lib/checkout/turso-order-read.mjs': {getTursoPreviewOrder:async()=>{counts.turso++;if(failure)throw Error('private-database-error');return found?row:null}},
  };
  const module=new vm.SourceTextModule(readFileSync('app/api/orders/by-ref/route.js','utf8'),{context});
  await module.link(key=>{
    const values=dependencies[key];if(!values)throw Error('Unexpected dependency: '+key);
    return new vm.SyntheticModule(Object.keys(values),function(){for(const [name,value]of Object.entries(values))this.setExport(name,value)},{context});
  });
  await module.evaluate();
  return {get:token=>module.namespace.GET(new Request('https://preview.example.invalid/api/orders/by-ref?orderRef=o1',{
    headers: token ? {'x-order-access-token':token}:{} })),counts};
}
test('authorized Turso receipt reads one canonical record and never touches Mongo',async()=>{
  const app=await route();const response=await app.get('valid');
  assert.equal(response.status,200);assert.equal(response.body.id,'o1');
  assert.deepEqual(app.counts,{mongo:0,fallback:0,turso:1});assert.equal(response.headers['Cache-Control'],'no-store');
});
test('unauthenticated receipt never retrieves private customer data',async()=>{
  const app=await route();assert.equal((await app.get()).status,401);
  assert.deepEqual(app.counts,{mongo:0,fallback:0,turso:0});
});
test('invalid token cannot return a found order',async()=>{
  const app=await route();const response=await app.get('invalid');
  assert.equal(response.status,401);assert.equal(response.body.customer,undefined);
  assert.equal(app.counts.turso,0);
});
test('missing and unavailable Turso orders never fall back to Mongo or disclose errors',async()=>{
  const absent=await route({found:false});assert.equal((await absent.get('valid')).status,404);
  assert.deepEqual(absent.counts,{mongo:0,fallback:0,turso:1});
  const failed=await route({failure:true});const response=await failed.get('valid');
  assert.equal(response.status,500);assert.equal(response.body.details,undefined);
  assert.deepEqual(failed.counts,{mongo:0,fallback:0,turso:1});
});
test('authenticated owner can use the same Turso receipt without a guest token',async()=>{
  const app=await route({authenticated:true});assert.equal((await app.get()).status,200);
});
