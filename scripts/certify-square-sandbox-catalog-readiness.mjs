#!/usr/bin/env node
/**
 * Read-only merchant Square SANDBOX catalogue and inventory evidence.
 * Never contacts production Square; never mutates catalogue, inventory or orders.
 */
import {mkdirSync,writeFileSync} from 'node:fs';

const host = 'https://connect.squareupsandbox.com';
const token = process.env.SQUARE_SANDBOX_ACCESS_TOKEN || '';
const proof = {kind:'square-sandbox-catalog-readiness',source:'SANDBOX',
  startedAt:new Date().toISOString(),pass:false,checks:[],matches:[]};
const approved = new Set(['strawberry bliss','supplemint','calm waters',
  'kissed by gods','gracious roots','melon rita','passion guava pineapple lemonade']);
function assert(ok,name,data={}) {
  const entry={name,pass:Boolean(ok),...data};
  proof.checks.push(entry);
  console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(data));
  if(!ok)throw Error(name);
}
async function fetchSandbox(path,method='GET',body) {
  if(!path.startsWith('/v2/')||path.includes('://'))throw Error('Forbidden Square path');
  const resp=await fetch(new URL(path,host),{
    method,redirect:'error',signal:AbortSignal.timeout(20000),
    headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json',
      'Square-Version':'2026-09-16'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const json=await resp.json().catch(()=>({}));
  if(!resp.ok)throw Error('Sandbox Square request returned HTTP '+resp.status);
  return json;
}
try {
  assert(Boolean(token),'Protected sandbox credential provisioned');
  const loc=await fetchSandbox('/v2/locations');
  const location=loc.locations?.find(x=>x.status==='ACTIVE')||loc.locations?.[0];
  assert(Boolean(location?.id),'Active sandbox merchant location');
  const items=[];
  let cursor;
  for(let page=0;page<20;page++) {
    const path='/v2/catalog/list?types=ITEM'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
    const result=await fetchSandbox(path);
    items.push(...(result.objects||[]));
    cursor=result.cursor;
    if(!cursor)break;
    if(page===19)throw Error('Catalogue exceeded bounded pagination');
  }
  assert(items.length>0,'Sandbox catalog contains Square ITEMS',{items:items.length});
  for(const item of items){
    const name=String(item.item_data?.name||'').trim();
    const normalized=name.toLowerCase().replace(/[\u2019']/g,"'").replace(/\s+/g,' ');
    if(!approved.has(normalized))continue;
    for(const variation of item.item_data?.variations||[]){
      const cents=Number(variation.item_variation_data?.price_money?.amount);
      const currency=variation.item_variation_data?.price_money?.currency;
      const size=String(variation.item_variation_data?.name||'').trim();
      if(cents===1199&&currency==='USD'&&
          (!size||/^(16\s*oz|regular|standard|market item)(?:\b|$)/i.test(size))){
        proof.matches.push({name,size:size||'unspecified',variationIdPresent:Boolean(variation.id)});
      }
    }
  }
  assert(proof.matches.length>=2 &&
      new Set(proof.matches.map(x=>x.name)).size>=2,
      'At least two approved $11.99 lemonade flavors have valid Sandbox variations',
      {matchedFlavors:[...new Set(proof.matches.map(x=>x.name))],matchedVariations:proof.matches.length});
  proof.pass=true;
}catch(err){proof.error=String(err?.message||err);process.exitCode=1;}
finally{
  proof.completedAt=new Date().toISOString();
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/square-sandbox-catalog-readiness.json',JSON.stringify(proof,null,2));
  console.log('SQUARE_SANDBOX_CATALOG_READINESS '+(proof.pass?'PASS':'FAIL'));
}
