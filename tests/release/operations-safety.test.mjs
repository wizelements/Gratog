import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

async function load(file, { authorized=true, env={}, fetchResponse=null }={}) {
  const state={connections:0,queries:[],providerCalls:0,authCalls:0};
  class AdminAuthError extends Error { statusCode=401; }
  const context=vm.createContext({ URL,Request,Response,console,Buffer,
    process:{env}, fetch:async()=>{state.providerCalls++;if(fetchResponse)return fetchResponse;throw Error('provider unavailable')},
  });
  const modules={
    'next/server':{NextRequest:Request,NextResponse:{json:(body,options)=>Response.json(body,options)}},
    '@/lib/auth/unified-admin':{AdminAuthError,requireAdminSession:async()=>{state.authCalls++;if(!authorized)throw new AdminAuthError();return {email:'operator@example.invalid'}}},
    '@/lib/db-optimized':{connectToDatabase:async()=>{state.connections++}},
    '@/models/MarketOrder':{default:{find:query=>{state.queries.push(query);return {select(){return this},sort(){return this},limit(){return this},async lean(){return []}}}}},
    '@/lib/logger':{createLogger:()=>({info(){},warn(){},error(){}})},
    '@/lib/georgia-orders':{validateGeorgiaDestination:()=>({valid:true})},
  };
  const module=new vm.SourceTextModule(stripTypeScriptTypes(readFileSync(file,'utf8')),{context});
  await module.link(name=>{
    const exports=modules[name];assert.ok(exports,'Unexpected dependency '+name);
    return new vm.SyntheticModule(Object.keys(exports),function(){for(const [name,value]of Object.entries(exports))this.setExport(name,value)},{context});
  });
  await module.evaluate();return {api:module.namespace,state};
}
test('private order search authenticates before database access',async()=>{
  const {api,state}=await load('app/api/orders/search/route.ts',{authorized:false});
  assert.equal((await api.GET(new Request('https://example.invalid/?q=customer&marketId=one'))).status,401);
  assert.equal(state.connections,0);assert.equal(state.queries.length,0);
});
test('staff search requires explicit market and treats regex syntax literally without empty phone search',async()=>{
  const {api,state}=await load('app/api/orders/search/route.ts');
  assert.equal((await api.GET(new Request('https://example.invalid/?q=customer'))).status,400);
  assert.equal(state.connections,0);
  assert.equal((await api.GET(new Request('https://example.invalid/?q=a.*&marketId=one'))).status,200);
  assert.equal(state.queries[0].$or.length,2);
  assert.equal(state.queries[0].$or[0].orderNumber.$regex,'a\\.\\*');
});
test('Turso search never queries a Mongo fallback',async()=>{
  const {api,state}=await load('app/api/orders/search/route.ts',{env:{DATABASE_PROVIDER:'turso'}});
  assert.equal((await api.GET(new Request('https://example.invalid/?q=customer&marketId=one'))).status,503);
  assert.equal(state.connections,0);assert.equal(state.authCalls,0);
});
test('retired hardcoded stock replacement never calls Square, even for an administrator',async()=>{
  for(const authorized of [false,true]) {
    const {api,state}=await load('app/api/admin/ops/square-inventory-replace/route.ts',{authorized});
    for(const method of ['GET','POST']) assert.equal((await api[method](new Request('https://example.invalid/'))).status,authorized?410:401);
    assert.equal(state.providerCalls,0);assert.equal(state.connections,0);
  }
});
test('uncertified refund request cannot change provider, order, or inventory state',async()=>{
  for(const authorized of [false,true]) {
    const {api,state}=await load('lib/checkout/refund-availability.ts',{authorized});
    assert.equal((await api.blockedRefund(new Request('https://example.invalid/'))).status,authorized?503:401);
    assert.equal(state.providerCalls,0);assert.equal(state.connections,0);
  }
  for(const path of ['app/api/payments/refund/route.ts','app/api/admin/orders/[id]/refund/route.ts']) {
    assert.match(readFileSync(path,'utf8'),/blockedRefund as POST/);
  }
});
const address={street:'fixture only',city:'Atlanta',state:'GA',zip:'30301'};
test('missing operational shipping configuration cannot fabricate rates, labels or tracking',async()=>{
  const {api,state}=await load('lib/shipping-service.ts');
  assert.equal(api.isShippingApiConfigured(),false);
  await assert.rejects(api.getShippingRates(address),/SHIPPING_NOT_CONFIGURED/);
  await assert.rejects(api.createShipment('order','flat_standard',address),/SHIPPING_LABEL_NOT_CONFIGURED/);
  await assert.rejects(api.getTrackingInfo('TOG123456'),/SHIPPING_TRACKING_NOT_CONFIGURED/);
  assert.equal(state.providerCalls,0);
});
test('configured provider failure still cannot become a flat rate or invented shipment',async()=>{
  const {api,state}=await load('lib/shipping-service.ts',{env:{
    SHIPPING_OPERATIONALLY_APPROVED:'true',SHIPENGINE_API_KEY:'unit-only',
    SHIPPING_ORIGIN_STREET:'fixture',SHIPPING_ORIGIN_CITY:'Atlanta',SHIPPING_ORIGIN_STATE:'GA',SHIPPING_ORIGIN_ZIP:'30301',
  }});
  await assert.rejects(api.getShippingRates(address),/SHIPPING_RATES_UNAVAILABLE/);
  await assert.rejects(api.createShipment('order','se-unit-rate',address),/SHIPPING_LABEL_UNAVAILABLE/);
  await assert.rejects(api.getTrackingInfo('123456789'),/SHIPPING_TRACKING_UNAVAILABLE/);
  assert.equal(state.providerCalls,3);
});
