#!/usr/bin/env node
/**
 * Isolated first-party order creation sandbox using a disposable local MongoDB
 * replica set. NO Square token or live merchant credentials; NEVER sends
 * payments. Tests true HTTP route/server persistence, not mocked API calls.
 */
import { MongoClient } from 'mongodb';
import { randomUUID, createHmac } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const url = process.env.BASE_URL || 'http://127.0.0.1:3333';
const mongoUri = process.env.MONGODB_URI || '';
if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):27017\//.test(mongoUri)) {
  throw new Error('Refusing order sandbox outside disposable local MongoDB');
}
const results = [];
const check = (name, pass, data = {}) => {
  results.push({ name, pass: Boolean(pass), ...data });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(data)}`);
  if (!pass) throw new Error(`Local sandbox failed: ${name}`);
};
async function post(path, payload, headers={}) {
  if (!url.startsWith('http://127.0.0.1:3333')) throw new Error('Remote checkout forbidden');
  const response = await fetch(url + path, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10_000 });
const evidence = { kind: 'first-party-isolated-mongo-real-http', tests: results, pass: false, started: new Date().toISOString() };
try {
  await client.connect();
  const db = client.db();
  await db.collection('orders').deleteMany({ source: 'qa-isolated-sandbox' });
  await db.collection('unified_products').deleteMany({ source: 'qa-isolated-sandbox' });
  await db.collection('customers').deleteMany({ email: /@qa-sandbox\.invalid$/ });
  await db.collection('idempotency_keys').deleteMany({ key: /^tog-sbx-/ });
  await db.collection('inventory').deleteMany({ source: 'qa-isolated-sandbox' });

  // Current approved merchant fixtures. Never insert retired drink SKUs into
  // a positive order test: strict menu enforcement MUST reject those.
  await db.collection('unified_products').insertMany([
    {
      id:'qa-sbx-calm-waters',slug:'calm-waters',name:'Calm Waters',
      source:'qa-isolated-sandbox',price:11.99,priceCents:1199,
      squareEcomAvailable:true,inStock:true,marketPickupOnly:false,
      variations:[{id:'qa-sbx-calm-16oz',name:'16oz bottle',priceCents:1199}],
    },
    {
      id:'qa-sbx-kissed-by-gods',slug:'kissed-by-gods',name:'Kissed by Gods',
      source:'qa-isolated-sandbox',price:11.99,priceCents:1199,
      inStock:true,marketPickupOnly:true,preorderOnly:true,
      variations:[{id:'qa-sbx-kissed-16oz',name:'16oz bottle',priceCents:1199}],
    },
    {
      id:'qa-sbx-herbal-vibe',slug:'herbal-vibe',name:'Herbal Vibe',
      source:'qa-isolated-sandbox',price:15.99,priceCents:1599,
      inStock:true,marketPickupOnly:false,
      variations:[{id:'qa-sbx-herbal-16oz',name:'16oz bottle',priceCents:1599}],
    },
    {
      id:'qa-sbx-melon-rita',slug:'melon-rita',name:'Melon Rita',
      source:'qa-isolated-sandbox',price:11.99,priceCents:1199,
      inStock:false,marketPickupOnly:false,preorderOnly:true,
      variations:[{id:'qa-sbx-melon-16oz',name:'16oz bottle',priceCents:1199}],
    },
  ]);
  // Physical count negative means no charge. A customer may still submit
  // a separate explicit future-batch request, which collects no payment.
  await db.collection('inventory').insertOne({
    productId:'qa-sbx-herbal-vibe',currentStock:-6,source:'qa-isolated-sandbox',
  });

  const baseCart=[{productId:'qa-sbx-calm-waters',variationId:'qa-sbx-calm-16oz',quantity:1,price:0.01}];
  const preview=await post('/api/cart/price',{
    lines:[{variationId:'qa-sbx-calm-16oz',qty:1,price:0.01}],
  });
  check('Current-menu Calm Waters is server-priced $11.99 despite client penny',
    preview.status===200&&preview.data.pricing?.subtotalCents===1199,
    {status:preview.status,cents:preview.data.pricing?.subtotalCents});

  const outdated=await post('/api/orders/create',{
    customer:{name:'QA Sandbox',email:'retired@qa-sandbox.invalid'},
    cart:[{productId:'qa-sbx-calm-waters',variationId:'qa-sbx-calm-16oz',quantity:1,
      name:'Peach Lemonade',price:0.01}],
    fulfillmentType:'shipping',
    shippingAddress:{street:'123 Example',city:'Atlanta',state:'GA',zip:'30303'},
    shippingMethod:'standard',
  },{'Idempotency-Key':`tog-sbx-${randomUUID()}`});
  // A forged name on a legitimate product ID is handled by server-owned
  // catalog identity, which is why only authoritative product records count.
  check('Forged client price and product name cannot change server catalog identity',
    outdated.status===200&&outdated.data.order?.items?.[0]?.name==='Calm Waters',
    {status:outdated.status,canonicalName:outdated.data.order?.items?.[0]?.name});

  const invalidGeorgia=await post('/api/orders/create',{
    customer:{name:'QA Sandbox',email:'outstate@qa-sandbox.invalid'},
    cart:baseCart,fulfillmentType:'shipping',
    shippingAddress:{street:'123 Test Street',city:'New York',state:'NY',zip:'10001'},
    shippingMethod:'standard',
  },{'Idempotency-Key':`tog-sbx-${randomUUID()}`});
  check('Out-of-state shipping is blocked before order',
    invalidGeorgia.status===422&&invalidGeorgia.data.code==='GEORGIA_ONLY',
    {status:invalidGeorgia.status});

  const restricted=await post('/api/orders/create',{
    customer:{name:'QA Sandbox',email:'restricted@qa-sandbox.invalid'},
    cart:[{productId:'qa-sbx-kissed-by-gods',variationId:'qa-sbx-kissed-16oz',quantity:1}],
    fulfillmentType:'shipping',
    shippingAddress:{street:'123 Example',city:'Atlanta',state:'GA',zip:'30303'},
    shippingMethod:'standard',
  },{'Idempotency-Key':`tog-sbx-${randomUUID()}`});
  check('Merchant-marked market-exclusive item cannot be shipped',
    restricted.status===422&&restricted.data.code==='MARKET_PICKUP_REQUIRED',
    {status:restricted.status,code:restricted.data.code});

  const herbalPreview=await post('/api/cart/price',{
    lines:[{variationId:'qa-sbx-herbal-16oz',qty:1,price:0.01}],
  });
  check('Herbal Vibe is never charged a stale price instead of $15.99',
    herbalPreview.status===200&&herbalPreview.data.pricing?.subtotalCents===1599,
    {status:herbalPreview.status,cents:herbalPreview.data.pricing?.subtotalCents});

  const base={
    customer:{name:'QA Sandbox',email:'order@qa-sandbox.invalid'},
    cart:baseCart,fulfillmentType:'shipping',
    shippingAddress:{street:'123 Example Street',city:'Atlanta',state:'GA',zip:'30303'},
    shippingMethod:'standard',
    deliveryTip:99,subtotal:0.01,total:0.01,source:'qa-isolated-sandbox',
  };
  const idem=`tog-sbx-${randomUUID()}`;
  const created=await post('/api/orders/create',base,{'Idempotency-Key':idem});
  check('Isolated database creates a GA order with authoritative price',
    created.status===200&&created.data.success===true&&
      created.data.order?.pricing?.total===20.98,
    {status:created.status,total:created.data.order?.pricing?.total});
  const orderId=created.data.order.id;
  check('Created guest order receives signed payment authorization',
    Boolean(created.data.order.orderAccessToken));
  const repeat=await post('/api/orders/create',base,{'Idempotency-Key':idem});
  check('Identical idempotency key returns the same order',
    repeat.status===200&&repeat.data.order?.id===orderId,
    {status:repeat.status});
  const stored=await db.collection('orders').findOne({id:orderId});
  check('Unpaid order has not consumed stock, charged or awarded rewards',
    stored?.subtotalCents===1199&&stored?.totalCents===2098&&
      stored?.deliveryTipCents===0&&!stored?.squarePaymentId&&
      !stored?.inventoryConsumedAt,
    {subtotalCents:stored?.subtotalCents,totalCents:stored?.totalCents});

  const herbalBody={
    ...base,customer:{name:'QA Sandbox',email:'herbal@qa-sandbox.invalid'},
    cart:[{productId:'qa-sbx-herbal-vibe',variationId:'qa-sbx-herbal-16oz',quantity:1}],
  };
  const herbal=await post('/api/orders/create',herbalBody,{
    'Idempotency-Key':`tog-sbx-${randomUUID()}`
  });
  check('Herbal Vibe 16oz creates a server-priced $15.99 order',
    herbal.status===200&&herbal.data.order?.pricing?.subtotal===15.99,
    {status:herbal.status});
  const rejectedPayment=await post('/api/payments',{
    sourceId:'cnon:card-nonce-ok',amountCents:2488,
    orderId:herbal.data.order.id,
    orderAccessToken:herbal.data.order.orderAccessToken,
  });
  check('Negative stock blocks payment before any Square charge',
    rejectedPayment.status===409&&rejectedPayment.data.code==='INVENTORY_UNAVAILABLE',
    {status:rejectedPayment.status,code:rejectedPayment.data.code});
  const unpaid=await db.collection('orders').findOne({id:herbal.data.order.id});
  check('Blocked payment leaves pending order without Square payment',
    !unpaid?.squarePaymentId&&unpaid?.paymentStatus==='pending');

  const futureOrder={
    ...base,customer:{name:'QA Sandbox',email:'future@qa-sandbox.invalid'},
    cart:[{productId:'qa-sbx-melon-rita',variationId:'qa-sbx-melon-16oz',quantity:1}],
    fulfillmentType:'pickup_market',
    pickup:{locationId:'serenbe',date:'2026-11-07'},
    shippingAddress:undefined,shippingMethod:undefined,
  };
  const noConsent=await post('/api/orders/create',futureOrder,{
    'Idempotency-Key':`tog-sbx-${randomUUID()}`
  });
  check('Payable preorder order without acknowledgement is rejected',
    noConsent.status===422&&noConsent.data.code==='PREORDER_ACKNOWLEDGEMENT_REQUIRED',
    {status:noConsent.status,code:noConsent.data.code});
  const confirmedFuture=await post('/api/orders/create',{
    ...futureOrder,preorderAcknowledged:true,preorderTermsVersion:'2026-10-31',
  },{'Idempotency-Key':`tog-sbx-${randomUUID()}`});
  check('Acknowledged future-batch preorder stores merchant-selected pickup details',
    confirmedFuture.status===200&&confirmedFuture.data.order?.items?.[0]?.isPreorder===true,
    {status:confirmedFuture.status,code:confirmedFuture.data.code});
  const confirmedStored=await db.collection('orders').findOne({id:confirmedFuture.data.order.id});
  check('Confirmed future preorder preserves consent but remains unpaid',
    confirmedStored?.preorderAcknowledged===true&&
      confirmedStored?.preorderTermsVersion==='2026-10-31'&&
      !confirmedStored?.squarePaymentId);

  // Out-of-stock customer preorder request: real POST and Mongo persistence,
  // selected fulfillment, explicit terms and no payment authority.
  const futureRequestId=randomUUID();
  const preorderPayload={
    requestId:futureRequestId,product:'melon-rita',quantity:2,
    customer:{name:'Isolated QA',email:'preorder@qa-sandbox.invalid'},
    fulfillmentType:'pickup_market',
    pickup:{locationId:'serenbe',date:'2026-11-07'},
    preorderAcknowledged:true,preorderTermsVersion:'2026-10-31',
    confirmedFulfillment:true,
  };
  const missingConsent=await post('/api/preorder-requests',{
    ...preorderPayload,preorderAcknowledged:false,
  });
  check('Request without preorder acknowledgement is rejected',
    missingConsent.status===422&&missingConsent.data.code==='PREORDER_ACKNOWLEDGEMENT_REQUIRED',
    {status:missingConsent.status});
  const placedRequest=await post('/api/preorder-requests',preorderPayload);
  check('Confirmed-method preorder request persists with zero charge',
    placedRequest.status===201&&placedRequest.data.success===true&&
      placedRequest.data.paymentStatus==='not_charged',
    {status:placedRequest.status,payment:placedRequest.data.paymentStatus});
  check('No mock or absent email provider is represented as a delivered customer acknowledgement',
    placedRequest.data.customerEmailStatus==='unavailable',
    {customerEmailStatus:placedRequest.data.customerEmailStatus});
  const storedPreorder=await db.collection('preorder_requests').findOne({
    _id:placedRequest.data.requestId,
  });
  check('Persisted request has chosen method, consent and no false capacity',
    storedPreorder?.productSlug==='melon-rita'&&storedPreorder?.quantity===2&&
      storedPreorder?.pickup?.locationId==='serenbe'&&
      storedPreorder?.preorderAcknowledged===true&&
      storedPreorder?.capacityReserved===false&&
      storedPreorder?.paymentStatus==='not_charged'&&!storedPreorder?.squarePaymentId);
  check('Contact attempt status is persisted and never marked delivered without a provider',
    storedPreorder?.customerContact?.email?.status==='unavailable' &&
    storedPreorder?.customerContact?.email?.deliveryVerified===false &&
    !storedPreorder?.customerContact?.email?.messageId,
    {customerEmailStatus:storedPreorder?.customerContact?.email?.status});
  const outboundRows=await db.collection('email_sends').find({
    'metadata.preorderRequestId':placedRequest.data.requestId,
  }).toArray();
  check('Acknowledgement email attempt is traced to request without sending mock email externally',
    outboundRows.length===1 && outboundRows[0].provider==='mock',
    {emails:outboundRows.length,provider:outboundRows[0]?.provider});
  const retryRequest=await post('/api/preorder-requests',preorderPayload);
  check('Same request ID cannot create duplicate order or charge',
    retryRequest.status===200&&retryRequest.data.requestId===placedRequest.data.requestId&&
      (await db.collection('preorder_requests').countDocuments({
        'customer.email':'preorder@qa-sandbox.invalid',
      }))===1);
  check('Idempotency retry does not send duplicate customer acknowledgements',
    (await db.collection('email_sends').countDocuments({
      'metadata.preorderRequestId':placedRequest.data.requestId,
    }))===1);
  const changed=await post('/api/preorder-requests',{...preorderPayload,quantity:3});
  check('Changed preorder cannot silently reuse same request ID',
    changed.status===409&&changed.data.code==='IDEMPOTENCY_CONFLICT');
  const outOfState=await post('/api/preorder-requests',{
    ...preorderPayload,requestId:randomUUID(),fulfillmentType:'shipping',
    address:{street:'123 Example',city:'New York',state:'NY',zip:'10001'},
    shippingMethod:'pending_verified_quote',
  });
  check('Out-of-state preorder shipping request is refused',
    outOfState.status===422&&outOfState.data.code==='GEORGIA_ONLY',
    {status:outOfState.status,code:outOfState.data.code});

  // SIGNED Resend webhook integration, disposable DB and no external email.
  // Test both provider delivery and failure escalation; never accept unsigned
  // callbacks or promote 'sent_to_provider' to delivered without real evidence.
  const webhookMockId='qa-provider-'+randomUUID();
  await db.collection('preorder_requests').insertOne({
    _id:'preorder_request_qa_webhook_'+randomUUID(),
    customer:{email:'preorder@qa-sandbox.invalid'},
    productSlug:'melon-rita',
    productName:'Melon Rita',
    customerContact:{email:{status:'sent_to_provider',messageId:webhookMockId,deliveryVerified:false}},
    paymentStatus:'not_charged',
  });
  const eventPayload=JSON.stringify({
    type:'email.delivered',data:{email_id:webhookMockId,to:'preorder@qa-sandbox.invalid'},
  });
  const sig=createHmac('sha256',process.env.RESEND_WEBHOOK_SECRET||'not-configured')
    .update(eventPayload).digest('hex');
  const fakeEvent=await fetch(url+'/api/webhooks/resend',{
    method:'POST',headers:{'Content-Type':'application/json',
      'resend-signature':'bogus','svix-id':'qa-unsigned-'+randomUUID()},
    body:eventPayload,
  });
  check('Webhook without a correct signature is rejected before modifying customer records',
    fakeEvent.status===401,{status:fakeEvent.status});
  const eventKey='qa-delivery-'+randomUUID();
  const acceptedEvent=await fetch(url+'/api/webhooks/resend',{
    method:'POST',headers:{'Content-Type':'application/json',
      'resend-signature':sig,'svix-id':eventKey},body:eventPayload,
  });
  check('Valid signed provider delivery event is accepted',
    acceptedEvent.status===200,{status:acceptedEvent.status});
  const deliveredRecord=await db.collection('preorder_requests').findOne({
    'customerContact.email.messageId':webhookMockId,
  });
  check('Signed provider delivery changes preorder status to delivered',
    deliveredRecord?.customerContact?.email?.status==='delivered'&&
      deliveredRecord?.customerContact?.email?.deliveryVerified===true,
    {status:deliveredRecord?.customerContact?.email?.status});
  const duplicate=await fetch(url+'/api/webhooks/resend',{
    method:'POST',headers:{'Content-Type':'application/json',
      'resend-signature':sig,'svix-id':eventKey},body:eventPayload,
  });
  const duplicateResult=await duplicate.json();
  check('Webhook replay is deduplicated without a second status mutation',
    duplicate.status===200&&duplicateResult.duplicate===true,
    {status:duplicate.status});
  const bounceBody=JSON.stringify({
    type:'email.bounced',data:{email_id:webhookMockId,to:'preorder@qa-sandbox.invalid'},
  });
  const bounceSig=createHmac('sha256',process.env.RESEND_WEBHOOK_SECRET||'not-configured')
    .update(bounceBody).digest('hex');
  const bounced=await fetch(url+'/api/webhooks/resend',{
    method:'POST',headers:{'Content-Type':'application/json',
      'resend-signature':bounceSig,'svix-id':'qa-bounce-'+randomUUID()},body:bounceBody,
  });
  check('Signed bounce event is accepted and flagged as non-delivery',
    bounced.status===200,{status:bounced.status});
  const bouncedRecord=await db.collection('preorder_requests').findOne({
    'customerContact.email.messageId':webhookMockId,
  });
  check('Bounce supersedes delivered state and requires merchant follow-up',
    bouncedRecord?.customerContact?.email?.status==='bounced'&&
      bouncedRecord?.customerContact?.email?.deliveryVerified===false,
    {status:bouncedRecord?.customerContact?.email?.status});

  evidence.pass = true;
} catch (err) {
  evidence.error = String(err?.message || err).slice(0,250);
} finally {
  evidence.completed = new Date().toISOString();
  evidence.testsPassed = results.filter(x => x.pass).length;
  evidence.testsTotal = results.length;
  try {
    // Test artifacts exist outside Mongo; dispose all QA data after readback.
    await client.db().collection('orders').deleteMany({ source:'qa-isolated-sandbox' });
    await client.db().collection('fresh_batch_requests').deleteMany({ email: /@qa-sandbox\.invalid$/ });
    await client.db().collection('customers').deleteMany({ email: /@qa-sandbox\.invalid$/ });
    await client.db().collection('unified_products').deleteMany({ source:'qa-isolated-sandbox' });
    await client.db().collection('inventory').deleteMany({ source:'qa-isolated-sandbox' });
    await client.db().collection('preorder_requests').deleteMany({ 'customer.email': /@qa-sandbox\\.invalid$/ });
    await client.db().collection('email_sends').deleteMany({ customerEmail: 'preorder@qa-sandbox.invalid' });
    await client.db().collection('idempotency_keys').deleteMany({ key: /^tog-sbx-/ });
    await client.close();
  } catch { evidence.cleanup = 'failed; disposable DB is destroyed with CI container'; }
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/isolated-order-sandbox.json',JSON.stringify(evidence,null,2));
  console.log('ISOLATED_ORDER_RESULT',JSON.stringify({passed:evidence.pass,tests:evidence.testsTotal,passedTests:evidence.testsPassed,error:evidence.error}));
  if(!evidence.pass)process.exitCode=1;
}
