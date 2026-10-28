import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Execute the actual dependency-free claim functions. Imports are substituted
// only at the module boundary; no production claim implementation is copied.
function legacySenders() {
  const source=readFileSync(new URL('../../lib/staff-notifications.js',import.meta.url),'utf8')
    .replace(/^import .*;\r?$/gm,'').replace(/^export /gm,'');
  let sends=0;
  const sender=async()=>{sends++;return {success:true,messageId:'fixture-message'};};
  const functions=runInNewContext(source+'\n;({claimAndNotifyStaffOrder,claimAndSendCustomerConfirmation,sendStaffSmsNotification})',{
    process:{env:{STAFF_EMAIL:'fixture@example.invalid'}},sendEmail:sender,sendOwnerAlert:sender,
    buildOrderConfirmedAlert:()=>({}),logger:{info(){},warn(){},error(){},debug(){}},console,
  });
  return {...functions,sends:()=>sends};
}

test('legacy staff and customer claims honor persisted recovery holds atomically',async()=>{
  const senders=legacySenders(),queries=[];
  const db={collection:()=>({updateOne:async filter=>{
    queries.push(filter);
    const holds=filter.staffNotificationRecoveryHold?.$ne===true || filter.customerNotificationRecoveryHold?.$ne===true;
    return {modifiedCount:holds?0:1};
  }})};
  const staff=await senders.claimAndNotifyStaffOrder(db,'fixture-order',{});
  let customerSends=0;
  const customer=await senders.claimAndSendCustomerConfirmation(db,'fixture-order',{},async()=>{
    customerSends++;return {success:true};
  });
  assert.equal(staff.claimed,false);
  assert.equal(customer.claimed,false);
  assert.equal(senders.sends(),0);
  assert.equal(customerSends,0);
  assert.equal(queries[0].staffNotificationRecoveryHold.$ne,true);
  assert.equal(queries[1].customerNotificationRecoveryHold.$ne,true);
});

test('legacy owner alert and SMS cannot bypass a persisted staff recovery hold',async()=>{
  const senders=legacySenders();
  const db={collection:()=>({findOne:async()=>({staffNotificationRecoveryHold:true})})};
  const result=await senders.sendStaffSmsNotification(db,'fixture-order',{});
  assert.equal(result.code,'RECOVERY_RECONCILIATION_HOLD');
  assert.equal(result.sent,false);
  assert.equal(senders.sends(),0);
});

// The two route files contain inline atomic claims. Extract only their actual
// first query object and evaluate it, so no Next runtime/provider is involved.
function firstObjectAfter(source,anchor,context) {
  const start=source.indexOf('{',source.indexOf(anchor)+anchor.length);
  assert.notEqual(start,-1);
  let depth=0,end=start;
  for(;end<source.length;end++) {
    if(source[end]==='{') depth++;
    if(source[end]==='}' && --depth===0) break;
  }
  assert.equal(depth,0);
  return runInNewContext('('+source.slice(start,end+1)+')',context);
}
test('inline payment and Square webhook customer claims also exclude recovery-held orders',()=>{
  const payments=readFileSync(new URL('../../app/api/payments/route.ts',import.meta.url),'utf8');
  const webhooks=readFileSync(new URL('../../app/api/webhooks/square/route.ts',import.meta.url),'utf8');
  const a=firstObjectAfter(payments,"const emailClaim = await db.collection('orders').updateOne(",{orderId:'fixture-order'});
  const b=firstObjectAfter(webhooks,'const claim = await confirmationCollection.updateOne(',{confirmationFilter:{id:'fixture-order'}});
  assert.equal(a.customerNotificationRecoveryHold.$ne,true);
  assert.equal(b.customerNotificationRecoveryHold.$ne,true);
});
