import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assertTursoPreviewEnvironment,priceTursoPreviewCart,validateTursoPreviewPickup,
  TursoPreviewRefusal} from '../../lib/checkout/turso-preview-runtime.mjs';
const env={
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/turso-checkout-recovery-20261017',
  SQUARE_ENVIRONMENT:'sandbox',SQUARE_ACCESS_TOKEN:'sandbox',
  SQUARE_LOCATION_ID:'sandbox-location',JWT_SECRET:'test-secret',
  TURSO_STAGING_DATABASE_URL:'libsql://gratog-migration-cert-20261017-swatkins.aws-us-east-1.turso.io',
  TURSO_STAGING_AUTH_TOKEN:'x'.repeat(25),
};
test('branch/production isolation is exact',()=>{
  assertTursoPreviewEnvironment(env);
  for(const changed of [
    {VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},
    {SQUARE_ENVIRONMENT:'production'},{SQUARE_MOCK_MODE:'true'},
    {TURSO_STAGING_DATABASE_URL:'libsql://tasteofgratitude-swatkins.aws-us-east-1.turso.io'},
    {TURSO_STAGING_DATABASE_URL:env.TURSO_STAGING_DATABASE_URL+'?prod=1'},
    {TURSO_STAGING_AUTH_TOKEN:''},
  ])assert.throws(()=>assertTursoPreviewEnvironment({...env,...changed}),TursoPreviewRefusal);
});
const strawberry={id:'KZXEV24XZ2UCQUJ64BH7ZUJP',name:'Strawberry Bliss',active:1,
  variation_id:'HYODQWXIJJVAPRIZ66SVUYE5',
  variation_name:'Regular',price_cents:1199,currency:'USD',variation_active:1,
  current_stock:20,stock_active:1};
const basket={cart:[{productId:strawberry.id,variationId:strawberry.variation_id,quantity:2,price:0}],
  fulfillmentType:'pickup',customer:{name:'Sandbox Buyer',email:'cert@example.invalid'}};
test('Turso pricing ignores forged customer monetary fields',async()=>{
  const db={get:async()=>strawberry};
  const priced=await priceTursoPreviewCart(db,basket);
  assert.equal(priced.totalCents,2398);
  assert.equal(priced.items[0].unitPriceCents,1199);
});
test('catalog authority and inventory are fail closed',async()=>{
  const db={get:async()=>({...strawberry,current_stock:-6})};
  await assert.rejects(()=>priceTursoPreviewCart(db,basket),/UNAVAILABLE/);
  const bad={...basket,cart:[{productId:'F2YVC7OVRYJU575JXROKFHFT',variationId:'REG',quantity:1}]};
  await assert.rejects(()=>priceTursoPreviewCart({get:async()=>strawberry},bad),/NOT_CERTIFIED/);
  await assert.rejects(()=>priceTursoPreviewCart({get:async()=>({...strawberry,price_cents:1})},basket),/UNAVAILABLE/);
});
test('non-pickup/discount checkout cannot incorrectly skip fee accounting',async()=>{
  const db={get:async()=>strawberry};
  await assert.rejects(()=>priceTursoPreviewCart(db,{...basket,fulfillmentType:'delivery'}),/NOT_CERTIFIED/);
  await assert.rejects(()=>priceTursoPreviewCart(db,{...basket,couponCode:'FREE'}),/NOT_CERTIFIED/);
});

test('actual browser checkout pickup variants are supported without authorizing delivery',async()=>{
  const db={get:async()=>strawberry};
  for(const fulfillmentType of ['pickup_market','pickup_dunwoody']) {
    const actualBrowserShape={...basket,fulfillmentType,pickup:{
      locationId:'market-test',date:'2026-10-18T12:00:00.000Z'},
      couponCode:undefined,deliveryAddress:undefined,shippingAddress:undefined,
    };
    const quote=await priceTursoPreviewCart(db,actualBrowserShape);
    assert.equal(quote.totalCents,2398);
  }
  for(const fulfillmentType of ['delivery','shipping','pickup_other','pickup_market_delivery']) {
    await assert.rejects(()=>priceTursoPreviewCart(db,{...basket,fulfillmentType}),
      /TURSO_FULFILLMENT_NOT_CERTIFIED/);
  }
});

test('server validates migrated Serenbe market and selected pickup date before Square',async()=>{
  const now=new Date('2026-10-17T21:00:00-04:00');
  const db={get:async()=>({id:'695dd01de122fc20e6efdef1',
    name:'Serenbe Farmers Market',day_of_week:6,active:1})};
  const accepted=await validateTursoPreviewPickup(db,{
    fulfillmentType:'pickup_market',
    pickup:{locationId:'serenbe',date:'2026-10-24T04:00:00.000Z'},
  },now);
  assert.equal(accepted.pickup.marketId,'695dd01de122fc20e6efdef1');
  for(const bad of [
    {locationId:'dunwoody',date:'2026-10-24T04:00:00.000Z'},
    {locationId:'browns_mill',date:'2026-10-24T04:00:00.000Z'},
    {locationId:'serenbe',date:'2026-10-21T04:00:00.000Z'},
    {locationId:'serenbe',date:'2026-10-17T04:00:00.000Z'},
    {locationId:'serenbe',date:'2026-12-12T04:00:00.000Z'},
  ]) {
    await assert.rejects(()=>validateTursoPreviewPickup(db,{
      fulfillmentType:'pickup_market',pickup:bad},now),TursoPreviewRefusal);
  }
  await assert.rejects(()=>validateTursoPreviewPickup({
    get:async()=>({day_of_week:6,active:0})},{
      fulfillmentType:'pickup_market',pickup:{
        locationId:'serenbe',date:'2026-10-24T04:00:00.000Z'},
    },now),TursoPreviewRefusal);
});
