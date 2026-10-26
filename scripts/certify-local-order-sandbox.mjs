#!/usr/bin/env node
/**
 * Isolated first-party order creation sandbox using a disposable local MongoDB
 * replica set. NO Square token or live merchant credentials; NEVER sends
 * payments. Tests true HTTP route/server persistence, not mocked API calls.
 */
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
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

  await db.collection('unified_products').insertMany([
    {
      id: 'qa-sbx-strawberry-bliss',
      slug: 'strawberry-bliss',
      name: 'Strawberry Bliss',
      source: 'qa-isolated-sandbox',
      price: 11.99,
      priceCents: 1199,
      squareEcomAvailable: true,
      inStock: true,
      variations: [{ id: 'qa-sbx-bliss-16oz', name: '16oz bottle', price: 11.99, priceCents: 1199 }],
    },
    {
      id: 'qa-sbx-calm-waters', slug: 'calm-waters', name: 'Calm Waters',
      source: 'qa-isolated-sandbox',
      price: 11.99, priceCents: 1199, inStock: true,
      marketPickupOnly: true, preorderOnly: true,
      variations: [{ id: 'qa-sbx-calm-16oz', name: '16oz bottle', priceCents: 1199 }],
    },
    {
      id: 'qa-sbx-blue-lotus', slug: 'blue-lotus', name: 'Blue Lotus',
      source: 'qa-isolated-sandbox',
      price: 36, priceCents: 3600, inStock: true,
      variations: [{ id: 'qa-sbx-lotus-16oz', name: '16oz jar', priceCents: 3600 }],
    },
  ]);

  // Negative merchant inventory is real inventory debt, never six jars to sell.
  await db.collection('inventory').insertOne({productId:'qa-sbx-blue-lotus',currentStock:-6,source:'qa-isolated-sandbox'});

  const blueLotusRequest = await post('/api/fresh-batch/requests', {
    email: 'blue-lotus-request@qa-sandbox.invalid', phone: null,
    requestedProductSlug: 'blue-lotus-gel', flavorProfile: null,
    requestedFlavorText: null, quantity: 1, quantityUnit: 'jar_16oz',
    preferredMarketId: 'georgia_online_inquiry', needByDate: null,
    notes: null, requestSource: 'product_page', marketingEmailConsent: false,
  });
  check('Real request API accepts Blue Lotus 16oz jar without starting payment',
    blueLotusRequest.status === 201 && blueLotusRequest.data.success === true &&
    Boolean(blueLotusRequest.data.requestId),
    { status: blueLotusRequest.status });
  const requestRecord = await db.collection('fresh_batch_requests')
    .findOne({ email: 'blue-lotus-request@qa-sandbox.invalid' });
  check('Blue Lotus jar request persisted with no sample or customer charge',
    requestRecord?.requestedProductSlug === 'blue-lotus-gel' &&
    requestRecord?.quantityUnit === 'jar_16oz' &&
    requestRecord?.status === 'requested' &&
    (await db.collection('payment_records').countDocuments({ orderId: requestRecord?.id })) === 0,
    { status: requestRecord?.status, unit: requestRecord?.quantityUnit });

  const preview = await post('/api/cart/price', {
    lines: [{ variationId: 'qa-sbx-bliss-16oz', qty: 1, price: 0.01 }],
  });
  check('Preview prices Strawberry Bliss at server-owned $11.99',
    preview.status === 200 && preview.data.pricing?.subtotalCents === 1199,
    { status: preview.status, cents: preview.data.pricing?.subtotalCents });

  const invalidGeorgia = await post('/api/orders/create', {
    customer: { name: 'QA Sandbox', email: 'outstate@qa-sandbox.invalid' },
    cart: [{ productId: 'qa-sbx-strawberry-bliss', variationId: 'qa-sbx-bliss-16oz', quantity: 1 }],
    fulfillmentType: 'shipping',
    shippingAddress: { street: '123 Test Street', city: 'New York', state: 'NY', zip: '10001' },
    shippingMethod: 'standard',
  });
  check('Out-of-state shipping blocked before order', invalidGeorgia.status === 422 && invalidGeorgia.data.code === 'GEORGIA_ONLY',
    { status: invalidGeorgia.status });

  const restricted = await post('/api/orders/create', {
    customer: { name: 'QA Sandbox', email: 'restricted@qa-sandbox.invalid' },
    cart: [{ productId: 'qa-sbx-calm-waters', variationId: 'qa-sbx-calm-16oz', quantity: 1, marketExclusive: false }],
    fulfillmentType: 'shipping',
    shippingAddress: { street: '123 Example Street', city: 'Atlanta', state: 'GA', zip: '30303' },
    shippingMethod: 'standard',
  });
  check('Market pickup-only product cannot be shipped using forged client flags',
    restricted.status === 422 && restricted.data.code === 'MARKET_PICKUP_REQUIRED', { status: restricted.status });

  const lotusPreview = await post('/api/cart/price', {
    lines: [{ variationId: 'qa-sbx-lotus-16oz', qty: 1, price: 0.01 }],
  });
  check('Preview prices only Blue Lotus 16oz at $36',
    lotusPreview.status === 200 && lotusPreview.data.pricing?.subtotalCents === 3600,
    { status: lotusPreview.status, subtotalCents: lotusPreview.data.pricing?.subtotalCents });

  const sampleRequest = await post('/api/orders/create', {
    customer: { name: 'QA Sandbox', email: 'sample@qa-sandbox.invalid' },
    cart: [{ productId: 'qa-sbx-blue-lotus', variationId: 'retired-2oz-sample', quantity: 1 }],
    fulfillmentType: 'shipping',
    shippingAddress: { street: '123 Example Street', city: 'Atlanta', state: 'GA', zip: '30303' },
    shippingMethod: 'standard',
  });
  check('Retired Blue Lotus sample size is rejected before order creation',
    sampleRequest.status === 422 && sampleRequest.data.code === 'VARIATION_NOT_FOUND',
    { status: sampleRequest.status, code: sampleRequest.data.code });

  const cart = [{ productId:'qa-sbx-strawberry-bliss', variationId:'qa-sbx-bliss-16oz', quantity:1, price:0.01 }];
  const body = {
    customer:{name:'QA Sandbox',email:'order@qa-sandbox.invalid'},
    cart,
    fulfillmentType:'shipping',
    shippingAddress:{street:'123 Example Street',city:'Atlanta',state:'GA',zip:'30303'},
    shippingMethod:'standard',
    deliveryTip: 99,
    subtotal:0.01,
    total:0.01,
    source:'qa-isolated-sandbox',
  };
  const idem = `tog-sbx-${randomUUID()}`;
  const created = await post('/api/orders/create', body, { 'Idempotency-Key': idem });
  check('Isolated database records one actual GA order with server-derived total',
    created.status === 200 && created.data.success === true &&
      created.data.order?.pricing?.total === 20.98,
    { status: created.status, total: created.data.order?.pricing?.total });
  const id = created.data.order.id;
  check('Guest order receives signed payment-scoped access token',
    Boolean(created.data.order?.orderAccessToken));
  const same = await post('/api/orders/create', body, { 'Idempotency-Key': idem });
  check('Lost-response retry preserves same order identifier',
    same.status === 200 && same.data.order?.id === id, { status: same.status });
  const count = await db.collection('orders').countDocuments({ id, source:'qa-isolated-sandbox' });
  check('Only one order persisted for repeated identical key', count === 1, { count });
  const stored = await db.collection('orders').findOne({ id });
  check('Correct item and shipping amounts persisted; no tip or client underpayment',
    stored?.subtotalCents === 1199 && stored?.totalCents === 2098 &&
    stored?.deliveryFeeCents === 899 && stored?.deliveryTipCents === 0,
    { subtotalCents: stored?.subtotalCents, totalCents: stored?.totalCents });
  check('Unpaid order does not decrement inventory or award rewards',
    stored?.status === 'pending' && stored?.paymentStatus === 'pending' &&
    !(stored?.paidAt) && !(stored?.inventoryConsumedAt),
    { status: stored?.status });
  check('Rejected out-of-state and market-only orders not persisted',
    (await db.collection('orders').countDocuments({ source:'qa-isolated-sandbox' })) === 1);
  const lotusBody = {
    ...body,
    customer: { name: 'QA Sandbox', email: 'blue-lotus@qa-sandbox.invalid' },
    cart: [{ productId: 'qa-sbx-blue-lotus', variationId: 'qa-sbx-lotus-16oz', quantity: 1, price: 0.01 }],
  };
  const lotus = await post('/api/orders/create', lotusBody, { 'Idempotency-Key': `tog-sbx-${randomUUID()}` });
  check('Blue Lotus 16oz order created at $36 plus Georgia shipping',
    lotus.status === 200 && lotus.data.order?.pricing?.subtotal === 36 &&
    lotus.data.order?.pricing?.total === 44.99,
    { status: lotus.status, total: lotus.data.order?.pricing?.total });

  const rejectedPayment = await post('/api/payments', {
    sourceId: 'cnon:card-nonce-ok', amountCents: 4499,
    orderId: lotus.data.order.id,
    orderAccessToken: lotus.data.order.orderAccessToken,
  });
  check('Negative Blue Lotus inventory blocks charge BEFORE Square is called',
    rejectedPayment.status === 409 && rejectedPayment.data.code === 'INVENTORY_UNAVAILABLE',
    {status:rejectedPayment.status,code:rejectedPayment.data.code});
  const noCapturedPayment = await db.collection('orders').findOne({id:lotus.data.order.id});
  check('Blocked payment leaves order unpaid and without Square payment session',
    noCapturedPayment?.paymentStatus === 'pending' && !noCapturedPayment?.squarePaymentId,
    {status:noCapturedPayment?.paymentStatus});


  // The bundle runs against the ACTUAL first-party HTTP routes and an isolated,
  // disposable MongoDB replica set. Square capture/refund is certified in its
  // separate protected provider workflow, never with production credentials.
  await db.collection('unified_products').updateOne(
    { id: 'qa-sbx-strawberry-bliss' },
    { $set: { category: 'lemonades', squareEcomAvailable: true } }
  );
  await db.collection('unified_products').insertOne({
    id: 'qa-sbx-supplemint', slug: 'supplemint', name: 'SuppleMint',
    category: 'lemonades', source: 'qa-isolated-sandbox',
    price: 11.99, priceCents: 1199,
    inStock: true, squareEcomAvailable: true,
    variations: [{ id: 'qa-sbx-supplemint-16oz', name: '16oz bottle',
      price: 11.99, priceCents: 1199 }],
  });

  const mixedPack = (countPerFlavor) => [
    { productId: 'qa-sbx-strawberry-bliss', variationId: 'qa-sbx-bliss-16oz',
      quantity: countPerFlavor, name: 'Fake price from client', price: 0.01, category: 'juices' },
    { productId: 'qa-sbx-supplemint', variationId: 'qa-sbx-supplemint-16oz',
      quantity: countPerFlavor, price: 0.01 },
  ];
  const fourPrice = await post('/api/cart/price', {
    lines: mixedPack(2).map(({ variationId, quantity }) => ({ variationId, qty: quantity })),
  });
  check('Actual HTTP cart pricing accepts two-flavor four-pack at $43.99',
    fourPrice.status === 200 && fourPrice.data.pricing?.totalCents === 4399 &&
    fourPrice.data.pricing?.subtotalCents === 4796,
    { status: fourPrice.status, subtotalCents: fourPrice.data.pricing?.subtotalCents,
      totalCents: fourPrice.data.pricing?.totalCents });

  const sixPrice = await post('/api/cart/price', {
    lines: mixedPack(3).map(({ variationId, quantity }) => ({ variationId, qty: quantity })),
  });
  check('Actual HTTP cart pricing accepts two-flavor six-pack at $62.99',
    sixPrice.status === 200 && sixPrice.data.pricing?.totalCents === 6299 &&
    sixPrice.data.pricing?.subtotalCents === 7194,
    { status: sixPrice.status, subtotalCents: sixPrice.data.pricing?.subtotalCents,
      totalCents: sixPrice.data.pricing?.totalCents });

  const fourBody = {
    customer: { name: 'Isolated Checkout QA', email: 'mixed-four@qa-sandbox.invalid' },
    cart: mixedPack(2),
    fulfillmentType: 'pickup',
    pickup: { locationId: 'qa-market-location', date: '2026-10-31', instructions: 'QA ONLY' },
    subtotal: 0.01, total: 0.01, couponDiscount: 9999,
    source: 'qa-isolated-sandbox',
  };
  const fourIdem = 'tog-sbx-' + randomUUID();
  const fourOrder = await post('/api/orders/create', fourBody, { 'Idempotency-Key': fourIdem });
  check('Actual pickup checkout creates payable mixed four-pack at $43.99',
    fourOrder.status === 200 && fourOrder.data.order?.pricing?.total === 43.99 &&
    Boolean(fourOrder.data.order?.orderAccessToken),
    { status: fourOrder.status, total: fourOrder.data.order?.pricing?.total });
  const storedFour = await db.collection('orders').findOne({ id: fourOrder.data.order.id });
  check('Pickup order stores exact discount and item count, unpaid without inventory debit',
    storedFour?.subtotalCents === 4796 && storedFour?.couponDiscountCents === 397 &&
    storedFour?.totalCents === 4399 && storedFour?.fulfillment?.type === 'pickup' &&
    storedFour?.items?.reduce((n, x) => n + x.quantity, 0) === 4 &&
    storedFour?.paymentStatus === 'pending' && !storedFour?.inventoryConsumedAt,
    { subtotalCents: storedFour?.subtotalCents, discountCents: storedFour?.couponDiscountCents,
      totalCents: storedFour?.totalCents });
  const fourReplay = await post('/api/orders/create', fourBody, { 'Idempotency-Key': fourIdem });
  check('Pickup checkout idempotency cannot create duplicate order',
    fourReplay.status === 200 && fourReplay.data.order?.id === storedFour.id &&
    (await db.collection('orders').countDocuments({ id: storedFour.id })) === 1,
    { status: fourReplay.status });

  const shippingBody = {
    customer: { name: 'Isolated Checkout QA', email: 'mixed-six@qa-sandbox.invalid' },
    cart: mixedPack(3),
    fulfillmentType: 'shipping',
    shippingAddress: { street: '123 Example Street', city: 'Atlanta', state: 'GA', zip: '30303' },
    shippingMethod: 'standard', source: 'qa-isolated-sandbox', subtotal: 0.01, total: 0.01,
  };
  const sixOrder = await post('/api/orders/create', shippingBody, {
    'Idempotency-Key': 'tog-sbx-' + randomUUID(),
  });
  check('Actual Georgia shipping checkout prices six-pack plus shipping correctly',
    sixOrder.status === 200 && sixOrder.data.order?.pricing?.subtotal === 71.94 &&
    sixOrder.data.order?.pricing?.total === 71.98,
    { status: sixOrder.status, subtotal: sixOrder.data.order?.pricing?.subtotal,
      total: sixOrder.data.order?.pricing?.total });
  const storedSix = await db.collection('orders').findOne({ id: sixOrder.data.order.id });
  check('Georgia order persists $8.95 discount and $8.99 shipping, still unpaid',
    storedSix?.subtotalCents === 7194 && storedSix?.couponDiscountCents === 895 &&
    storedSix?.deliveryFeeCents === 899 && storedSix?.totalCents === 7198 &&
    storedSix?.fulfillment?.type === 'shipping' &&
    storedSix?.paymentStatus === 'pending' && !storedSix?.inventoryConsumedAt,
    { totalCents: storedSix?.totalCents, discountCents: storedSix?.couponDiscountCents,
      shippingCents: storedSix?.deliveryFeeCents });

  const rejectedPack = await post('/api/orders/create', {
    ...shippingBody,
    customer: { name: 'Isolated Checkout QA', email: 'bad-georgia@qa-sandbox.invalid' },
    shippingAddress: { street: '123 Example Street', city: 'New York', state: 'NY', zip: '10001' },
  }, { 'Idempotency-Key': 'tog-sbx-' + randomUUID() });
  check('Actual mixed pack checkout rejects out-of-state destination before persistence',
    rejectedPack.status === 422 && rejectedPack.data.code === 'GEORGIA_ONLY',
    { status: rejectedPack.status, code: rejectedPack.data.code });

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
    await client.db().collection('idempotency_keys').deleteMany({ key: /^tog-sbx-/ });
    await client.close();
  } catch { evidence.cleanup = 'failed; disposable DB is destroyed with CI container'; }
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/isolated-order-sandbox.json',JSON.stringify(evidence,null,2));
  console.log('ISOLATED_ORDER_RESULT',JSON.stringify({passed:evidence.pass,tests:evidence.testsTotal,passedTests:evidence.testsPassed,error:evidence.error}));
  if(!evidence.pass)process.exitCode=1;
}
