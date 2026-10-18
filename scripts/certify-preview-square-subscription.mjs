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
   created:false,subscriptionId:null,disabledOlderCertificationSubscriptions:0,signatureKeyReturned:false,
   providerEnabled:false,providerUrlMatches:false,providerEventsMatch:false,
   subscriptionListHttp:null,activeSubscriptionCount:null,providerFailure:null};
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
 if(!res.ok){
   // Bounded provider diagnostics with credentials and identifiers removed.
   const fault=await res.json().catch(()=>({}));
   const codes=(Array.isArray(fault.errors)?fault.errors:[]).slice(0,4).map(e=>
     [e.category,e.code].filter(v=>typeof v==='string'&&/^[A-Z_]{2,60}$/.test(v)).join(':')
   ).filter(Boolean);
   const clean=value=>{
     let out=String(value||'');
     for(const secret of [process.env.SQUARE_SANDBOX_ACCESS_TOKEN,process.env.TURSO_STAGING_AUTH_TOKEN].filter(Boolean))out=out.replaceAll(secret,'[credential]');
     return out.replace(/https?:\/\/[^\s"'<>]+/g,'[url]')
       .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,'[email]')
       .replace(/[A-Za-z0-9_=-]{28,}/g,'[identifier]')
       .replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,500);
   };
   const requestId=res.headers.get('x-request-id')||res.headers.get('square-request-id')||'';
   report.providerFailure={method,operation:path.replace(/wbhk_[A-Za-z0-9]+/g,'[subscription]'),
     httpStatus:res.status,requestId:/^[A-Za-z0-9:_-]{1,180}$/.test(requestId)?requestId:null,
     errors:(Array.isArray(fault.errors)?fault.errors:[]).slice(0,4).map(e=>({category:clean(e.category),code:clean(e.code),field:clean(e.field),detail:clean(e.detail)}))};
   console.error('SQUARE_SANITIZED_FAILURE '+JSON.stringify(report.providerFailure));
   throw Error('SQUARE_PROVIDER_HTTP_'+res.status+(codes.length?'_'+codes.join(','):'_UNCLASSIFIED'));
 }
 return res.json();
}
const events=['payment.created','payment.updated','refund.created','refund.updated'];
try {
 const ready=await fetch(base+'/api/certification/turso-ready',{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(ready.status!==200||!((proof)=>proof.code==='READ_ONLY_STAGING_READY'&&proof.commit===process.env.GITHUB_SHA)(await ready.json()))
   throw Error('PUBLIC_PREVIEW_STAGING_NOT_READY');
 // Queryless provider request avoids implementation-specific query parsing; enabled subscriptions are sufficient for exact active URL safety checks.
 const found=await square('/v2/webhooks/subscriptions');
 report.subscriptionListHttp=200;
 report.activeSubscriptionCount=(found.subscriptions||[]).length;
 console.log('PASS: GitHub Square Sandbox subscription listing HTTP 200; active='+report.activeSubscriptionCount);
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
 // Old immutable Preview URLs must not consume signed events for the same
 // shared staging ledger. Change ONLY subscriptions created by this
 // certification workflow, never another Sandbox integration.
 for(const old of found.subscriptions||[]){
   if(old.id===s.id||old.enabled!==true||
      old.name!=='Taste of Gratitude Turso Preview Sandbox')continue;
   let o;try{o=new URL(old.notification_url)}catch{}
   if(!o||o.protocol!=='https:'||
      !expectedHost.test(o.hostname)||o.pathname!=='/api/webhooks/square'||
      o.search||o.hash)throw Error('OLD_CERTIFICATION_DESTINATION_UNSAFE_TO_MODIFY');
   const disabled=await square('/v2/webhooks/subscriptions/'+encodeURIComponent(old.id),
      'PUT',{subscription:{enabled:false}});
   if(disabled.subscription?.enabled!==false)
      throw Error('PREVIOUS_SANDBOX_SUBSCRIPTION_NOT_DISABLED');
   report.disabledOlderCertificationSubscriptions++;
 }
 console.log('PASS: Square Sandbox signed subscription exact immutable Preview');
 console.log('subscriptionId='+report.subscriptionId);
}finally{persist()}
