#!/usr/bin/env node
/* Creates exactly one signed Square Sandbox subscription for one certified
   immutable Preview. Never prints bearer tokens or subscription signature keys. */
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const branch='refs/heads/feat/turso-checkout-recovery-20261017';
const expectedHost=/^gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app$/;
if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
   process.env.GITHUB_REF!==branch||!process.env.GITHUB_SHA||
   process.env.SQUARE_ENVIRONMENT!=='sandbox'||!process.env.SQUARE_SANDBOX_ACCESS_TOKEN)
   throw Error('PROTECTED_BRANCH_SANDBOX_REQUIRED');
const base=process.env.PREVIEW_BASE_URL||'';
let parsed;try{parsed=new URL(base)}catch{}
if(!parsed||parsed.protocol!=='https:'||!expectedHost.test(parsed.hostname)||
   parsed.origin!==base||parsed.username||parsed.password||parsed.search||parsed.hash)
   throw Error('EXACT_IMMUTABLE_PREVIEW_REQUIRED');
const url=base+'/api/webhooks/square';
const report={commit:process.env.GITHUB_SHA,previewHost:parsed.hostname,
   created:false,subscriptionId:null,signatureKeyReturned:false,
   providerEnabled:false,providerUrlMatches:false,providerEventsMatch:false};
function persist(){
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/preview-square-webhook-subscription.json',JSON.stringify(report,null,2)+'\n');
}
async function square(path,method='GET',body){
 const res=await fetch('https://connect.squareupsandbox.com'+path,{
   method,redirect:'error',signal:AbortSignal.timeout(20000),
   headers:{'Authorization':'Bearer '+process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
     'Square-Version':'2026-09-16','Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{})
 });
 if(!res.ok)throw Error('SQUARE_PROVIDER_HTTP_'+res.status);
 return res.json();
}
const events=['payment.created','payment.updated','refund.created','refund.updated'];
try {
 const ready=await fetch(base+'/api/certification/turso-ready',{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(ready.status!==200||(await ready.json()).code!=='READ_ONLY_STAGING_READY')
   throw Error('PUBLIC_PREVIEW_STAGING_NOT_READY');
 const found=await square('/v2/webhooks/subscriptions?include_disabled=true&limit=100');
 if(found.cursor)throw Error('WEBHOOK_SUBSCRIPTION_PAGINATION_REQUIRES_REVIEW');
 const matches=(found.subscriptions||[]).filter(s=>s.notification_url===url);
 if(matches.length>1)throw Error('DUPLICATE_WEBHOOK_SUBSCRIPTIONS');
 let s=matches[0];
 if(!s){
   const created=await square('/v2/webhooks/subscriptions','POST',{
     idempotency_key:randomUUID(),
     subscription:{name:'Taste of Gratitude Turso Preview Sandbox',enabled:true,
       notification_url:url,event_types:events,api_version:'2026-09-16'}
   });
   s=created.subscription;report.created=true;
 }
 if(!s?.id)throw Error('WEBHOOK_SUBSCRIPTION_ID_MISSING');
 report.subscriptionId=s.id;
 const detail=await square('/v2/webhooks/subscriptions/'+encodeURIComponent(s.id));
 const actual=detail.subscription||s;
 report.signatureKeyReturned=typeof actual.signature_key==='string'&&actual.signature_key.length>=12;
 report.providerEnabled=actual.enabled===true;
 report.providerUrlMatches=actual.notification_url===url;
 report.providerEventsMatch=events.every(e=>(actual.event_types||[]).includes(e));
 if(!report.signatureKeyReturned||!report.providerEnabled||
    !report.providerUrlMatches||!report.providerEventsMatch)
    throw Error('SUBSCRIPTION_NOT_SIGNED_AND_EXACT');
 console.log('PASS: Square Sandbox signed subscription exact immutable Preview');
 console.log('subscriptionId='+report.subscriptionId);
}finally{persist()}
