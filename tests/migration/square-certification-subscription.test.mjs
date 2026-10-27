import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectCertificationSubscription as select,CERTIFICATION_SUBSCRIPTION_NAME as name} from '../../lib/checkout/square-certification-subscription.mjs';
const old='https://gratog-older123-theangelsilvers-projects.vercel.app/api/webhooks/square';
const target='https://gratog-newer123-theangelsilvers-projects.vercel.app/api/webhooks/square';
test('endpoint limit: reuses disabled owned slot without touching other integrations',()=>{
 const unrelated={id:'other',name:'Other integration',enabled:true,notification_url:'https://example.org/hook'};
 const own={id:'cert',name,enabled:false,notification_url:old};
 const list=[unrelated,own];
 assert.deepEqual(select(list,target),{action:'update',subscription:own});
 assert.equal(list[0],unrelated);assert.equal(own.notification_url,old);
});
test('existing exact active endpoint is verified without a mutation',()=>{
 const exact={id:'exact',enabled:true,notification_url:target};
 assert.deepEqual(select([exact],target),{action:'verify',subscription:exact});
});
test('unsafe production or lookalike callback cannot be retargeted',()=>{
 for(const url of ['https://tasteofgratitude.shop/api/webhooks/square',target+'?test=1',target.replace('.vercel.app','.vercel.app.example.com'),target.replace('https:','http:')]){
  assert.throws(()=>select([{id:'owned',name,notification_url:url}],target),/UNSAFE/);
  assert.throws(()=>select([],url),/TARGET_INVALID/);
 }
});
test('foreign subscription is preserved and no owned identity is invented',()=>{
 assert.deepEqual(select([{id:'foreign',name:'Not owned',notification_url:old}],target),{action:'create',subscription:null});
});
test('duplicate active callbacks fail before changes',()=>{
 assert.throws(()=>select([{id:'a',enabled:true,notification_url:target},{id:'b',enabled:true,notification_url:target}],target),/DUPLICATE/);
});
