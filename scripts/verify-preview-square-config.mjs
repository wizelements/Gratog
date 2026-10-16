#!/usr/bin/env node
/* Preview-only checkout configuration attestation. Read-only; never logs secrets. */
const e=process.env;
const checks = [];
function note(name,pass){checks.push({name,pass:Boolean(pass)});console.log('PREVIEW_SQUARE_CONFIG '+name+' '+(pass?'PASS':'FAIL'));}
note('Vercel PREVIEW scope',e.VERCEL_ENV==='preview');
note('Square environment is sandbox',e.SQUARE_ENVIRONMENT?.toLowerCase()==='sandbox');
note('Square Sandbox access token configured',Boolean(e.SQUARE_ACCESS_TOKEN));
note('Web payments Sandbox Application ID configured',Boolean(e.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.startsWith('sandbox-')));
note('Square Sandbox location ID configured',Boolean(e.SQUARE_LOCATION_ID));
note('Webhook signature key configured',Boolean(e.SQUARE_WEBHOOK_SIGNATURE_KEY));
if(checks.slice(0,5).every(x=>x.pass)){
  try {
    const r=await fetch('https://connect.squareupsandbox.com/v2/locations',{headers:{Authorization:'Bearer '+e.SQUARE_ACCESS_TOKEN,'Square-Version':'2026-09-16'},redirect:'error',signal:AbortSignal.timeout(18000)});
    const body=await r.json();
    if(r.ok && Array.isArray(body.locations)){
      const allowed=body.locations.filter(l=>l.status==='ACTIVE').slice(0,8).map(l=>({id:l.id,name:l.name,status:l.status}));
      console.log('PREVIEW_SQUARE_AVAILABLE_LOCATIONS '+JSON.stringify(allowed));
      console.log('PREVIEW_SQUARE_CONFIGURED_ID_MATCH '+JSON.stringify({found:body.locations.some(l=>l.id===e.SQUARE_LOCATION_ID), active:body.locations.some(l=>l.id===e.SQUARE_LOCATION_ID&&l.status==='ACTIVE')}));
    }
    note('Sandbox token authenticates at Square',r.ok && Array.isArray(body.locations));
    note('Configured location belongs to sandbox account',r.ok&&Array.isArray(body.locations)&&body.locations.some(l=>l.id===e.SQUARE_LOCATION_ID && l.status==='ACTIVE'));
  }catch(error){note('Read-only Square locations API reachable',false);}
}
console.log('PREVIEW_SQUARE_CONFIG_RESULT '+JSON.stringify({passed:checks.every(x=>x.pass),passedCount:checks.filter(x=>x.pass).length,total:checks.length,failed:checks.filter(x=>!x.pass).map(x=>x.name)}));
if(!checks.every(x=>x.pass))process.exitCode=1;
