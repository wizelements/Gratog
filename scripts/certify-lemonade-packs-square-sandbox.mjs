#!/usr/bin/env node
/**
 * Actual Square SANDBOX 4/6-pack capture and refund certification.
 * Provider verification only: live website, inventory, and fulfillment need
 * separate end-to-end proof. Never contacts production Square.
 */
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='https://connect.squareupsandbox.com';
const token=process.env.SQUARE_SANDBOX_ACCESS_TOKEN||'';
const evidence={environment:'SANDBOX',startedAt:new Date().toISOString(),cases:[],pass:false};
const id=(s)=>s+'-'+randomUUID();
function check(ok,name,details={}){
 evidence.cases.push({name,pass:!!ok,...details});
 if(!ok) throw Error('Sandbox gate failed: '+name+' '+JSON.stringify(details));
 console.log('PASS '+name);
}
async function api(path,method='GET',body) {
 if(!path.startsWith('/v2/')||path.includes('://'))throw Error('Forbidden Square API path');
 const url=new URL(path,origin);
 if(url.origin!==origin)throw Error('Square host mismatch');
 const response=await fetch(url,{
  method,redirect:'error',signal:AbortSignal.timeout(22000),
  headers:{Authorization:'Bearer '+token,'Square-Version':'2026-09-16','Content-Type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 const data=await response.json().catch(()=>({}));
 return {ok:response.ok,status:response.status,data};
}
async function casePack(locationId,size,discountCents,expectedCents){
 let paymentId=null, refunded=false;
 try {
  const orderRequest={
   idempotency_key:id('ord'),
   order:{
    location_id:locationId,
    line_items:[{
      name:'SANDBOX ONLY Taste of Gratitude approved lemonade',
      quantity:String(size),
      base_price_money:{amount:1199,currency:'USD'}
    }],
    discounts:[{
      name:'Lemonade '+size+'-pack price',
      type:'FIXED_AMOUNT',scope:'ORDER',
      amount_money:{amount:discountCents,currency:'USD'}
    }]
   }
  };
  const created=await api('/v2/orders','POST',orderRequest);
  check(created.ok&&created.data.order?.id,'Square '+size+'-pack order created',{status:created.status});
  check(created.data.order.total_money?.amount===expectedCents,
    'Square '+size+'-pack approved order total',
    {expectedCents,actualCents:created.data.order.total_money?.amount});
  const amount=expectedCents;
  const paymentBody={
    idempotency_key:id('pay'), source_id:'cnon:card-nonce-ok',
    amount_money:{amount,currency:'USD'},location_id:locationId,
    order_id:created.data.order.id,autocomplete:true,
    note:'Taste of Gratitude automated SANDBOX lemonade pack certification'
  };
  const paid=await api('/v2/payments','POST',paymentBody);
  paymentId=paid.data.payment?.id||null;
  check(paid.ok&&paid.data.payment?.status==='COMPLETED'&&
    paid.data.payment?.amount_money?.amount===amount,
    'Square '+size+'-pack captured',{status:paid.status,paymentStatus:paid.data.payment?.status});
  const replay=await api('/v2/payments','POST',paymentBody);
  check(replay.ok&&replay.data.payment?.id===paymentId,
    'Square '+size+'-pack replay does not double charge',{status:replay.status});
  const refund=await api('/v2/refunds','POST',{
    idempotency_key:id('ref'),payment_id:paymentId,
    amount_money:{amount,currency:'USD'},
    reason:'Automated Square SANDBOX full refund'
  });
  refunded=refund.ok;
  check(refunded&&Boolean(refund.data.refund?.id),
    'Square '+size+'-pack refund submitted',{status:refund.status});
  let refundRead=refund;
  for(let n=0;n<8&&refundRead.data.refund?.status==='PENDING';n++){
   await new Promise(r=>setTimeout(r,750));
   refundRead=await api('/v2/refunds/'+encodeURIComponent(refund.data.refund.id));
  }
  check(refundRead.ok&&['PENDING','COMPLETED'].includes(refundRead.data.refund?.status)&&
    refundRead.data.refund?.amount_money?.amount===amount,
    'Square '+size+'-pack refund readback',
    {status:refundRead.status,refundStatus:refundRead.data.refund?.status});
  return true;
 } finally {
  if(paymentId&&!refunded){
    const emergency=await api('/v2/refunds','POST',{
     idempotency_key:id('cleanup'),payment_id:paymentId,
     amount_money:{amount:expectedCents,currency:'USD'},
     reason:'SANDBOX automatic cleanup after partial certification failure'
    }).catch(()=>({ok:false,status:0}));
    console.log('Sandbox cleanup '+size+'-pack refund submitted: '+Boolean(emergency.ok));
  }
 }
}
try{
 if(!token)throw Error('Sandbox credential unavailable to protected runner');
 const loc=await api('/v2/locations');
 check(loc.ok&&Array.isArray(loc.data.locations),'Square SANDBOX authentication',{status:loc.status});
 const location=loc.data.locations.find(x=>x.status==='ACTIVE')||loc.data.locations[0];
 check(Boolean(location?.id),'Sandbox location available');
 await casePack(location.id,4,397,4399);
 await casePack(location.id,6,895,6299);
 evidence.pass=true;
}catch(error){
 evidence.error=String(error?.message||error);
 console.error(evidence.error);
 process.exitCode=1;
}finally{
 evidence.finishedAt=new Date().toISOString();
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/lemonade-square-sandbox-certification.json',JSON.stringify(evidence,null,2));
 console.log('Square real SANDBOX provider certification '+(evidence.pass?'PASS':'FAIL'));
}
