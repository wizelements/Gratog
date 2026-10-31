import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCommerceScope } from '../../scripts/current-commerce-scope-audit.mjs';

const specs=[
  ['Calm Waters','calm-waters',11.99,12],
  ['SuppleMint','supplemint',11.99,28],
  ['Gracious Roots','gracious-roots',11.99,1],
  ['Kissed by Gods','kissed-by-gods',11.99,11],
  ['Melon Rita','melon-rita',11.99,4],
  ['Passion Guava Pineapple Lemonade','passion-guava-pineapple',11.99,11],
  ['Always Pursue Gratitude','apg',12.99,null],
  ['Herbal Vibe','herbal-vibe',15.99,12],
];
const fixtures=()=>{
  const products=specs.map(([name,slug,price,count],i)=>({
    id:'SQ_'+i,name,slug,price,stock:count,inventoryVerified:true,
    checkoutReady:count!==null,ingredients:slug==='passion-guava-pineapple'
      ? ['Passion Fruit','Guava','Pineapple','Lemon','Agave','Alkaline Water'].map(name=>({name})):[],
  }));
  const square=specs.map(([name,slug,price,count],i)=>({
    id:'SQ_'+i,name,price,stockQuantity:count??0,
    countStatus:count===null?'unknown':'reported',
    checkoutReady:count!==null,
    squareData:{variationId:'VAR_'+i},
  }));
  return {
    storefront:{products},square:{products:square},
    health:{ok:true,environment:'production',
      squareConnectivity:{ok:true,status:'ACTIVE',locationName:'Taste Of Gratitude'}},
    webhook:{status:'active'},
    recount:{source:'merchant_reported_physical_bottle_count_in_chat',
      recordedDate:'2026-10-31',items:specs.filter(x=>x[3]!==null)
        .map(([name,slug,price,reportedQuantity])=>({name,slug,reportedQuantity}))},
    sourceFiles:{payments:"checkInventoryForPayment(db, order.items);\nconsumeInventoryForPaidOrder(db,",inventory:'',webhook:''},
  };
};
const byId=(r,id)=>r.checks.find(c=>c.id===id);

test('owner counts are audited, not treated as automatically Square-verified stock',()=>{
  const input=fixtures();
  input.square.products.find(x=>x.name==='Herbal Vibe').countStatus='negative_on_hand';
  input.square.products.find(x=>x.name==='Herbal Vibe').stockQuantity=0;
  input.storefront.products.find(x=>x.name==='Herbal Vibe').stock=null;
  input.storefront.products.find(x=>x.name==='Herbal Vibe').inventoryVerified=false;
  input.storefront.products.find(x=>x.name==='Herbal Vibe').checkoutReady=false;
  const r=analyzeCommerceScope(input);
  assert.equal(r.certified,false);
  assert.equal(r.inventory.find(x=>x.slug==='herbal-vibe').merchantReported,12);
  assert.equal(r.inventory.find(x=>x.slug==='herbal-vibe').squareReportedSellable,null);
  assert.equal(byId(r,'herbal_vibe_12_merchant_recount_reconciled').status,'BLOCKED');
  assert.equal(byId(r,'website_no_false_stock_checkout').status,'PASS');
});

test('Melon Rita 9 Square versus merchant 4 explicitly fails reconciliation',()=>{
  const input=fixtures();
  input.square.products.find(x=>x.name==='Melon Rita').stockQuantity=9;
  input.storefront.products.find(x=>x.name==='Melon Rita').stock=null;
  input.storefront.products.find(x=>x.name==='Melon Rita').inventoryVerified=false;
  input.storefront.products.find(x=>x.name==='Melon Rita').checkoutReady=false;
  const r=analyzeCommerceScope(input);
  const melon=r.inventory.find(x=>x.slug==='melon-rita');
  assert.equal(melon.merchantReported,4);
  assert.equal(melon.squareReportedSellable,9);
  assert.equal(melon.reconciled,false);
  assert.equal(byId(r,'all_six_lemonades_merchant_recount_reconciled').status,'BLOCKED');
});

test('missing Passion Square SKU remains blocked even if the website lists the recipe',()=>{
  const input=fixtures();
  input.square.products=input.square.products.filter(x=>x.name!=='Passion Guava Pineapple Lemonade');
  const r=analyzeCommerceScope(input);
  assert.equal(r.inventory.find(x=>x.slug==='passion-guava-pineapple').squareCatalogStatus,'missing');
  assert.equal(byId(r,'storefront_passion-guava-pineapple').status,'PASS');
  assert.equal(byId(r,'all_six_lemonades_merchant_recount_reconciled').status,'BLOCKED');
});

test('duplicate Square Calm Waters item is flagged',()=>{
  const input=fixtures();
  input.square.products.push({...input.square.products[0],id:'OLD',squareData:{variationId:'VAR_OLD'}});
  const r=analyzeCommerceScope(input);
  assert.equal(byId(r,'square_website_feed_no_duplicate_calm_waters').status,'BLOCKED');
  assert.equal(r.inventory.find(x=>x.slug==='calm-waters').squareCatalogStatus,'duplicate');
});

test('wrong prices and forbidden Passion ingredient fail separately',()=>{
  const input=fixtures();
  input.storefront.products.find(x=>x.name==='Herbal Vibe').price=0.01;
  input.storefront.products.find(x=>x.name==='Passion Guava Pineapple Lemonade')
    .ingredients.push({name:'Ginger'});
  const r=analyzeCommerceScope(input);
  assert.equal(byId(r,'storefront_herbal-vibe').status,'BLOCKED');
  assert.equal(byId(r,'passion_ingredient_truth').status,'BLOCKED');
});

test('even with matching inventory, payment and webhook E2E must not be falsely certified',()=>{
  const input=fixtures();
  const r=analyzeCommerceScope(input);
  assert.equal(byId(r,'all_six_lemonades_merchant_recount_reconciled').status,'PASS');
  assert.equal(byId(r,'herbal_vibe_12_merchant_recount_reconciled').status,'PASS');
  assert.equal(byId(r,'square_order_uses_canonical_catalog_variation').status,'NOT_PROVEN');
  assert.equal(byId(r,'inventory_reserved_atomically_before_external_capture').status,'NOT_PROVEN');
  assert.equal(byId(r,'real_square_sandbox_pay_refund_decline_e2e').status,'NOT_TESTED');
  assert.equal(byId(r,'live_customer_charge_and_refund_e2e').status,'NOT_TESTED');
  assert.equal(r.certified,false);
});

test('known ad-hoc Square checkout lines are correctly flagged blocked',()=>{
  const input=fixtures();
  input.sourceFiles.payments='catalogObjectId: approvedUnitPriceCents(it) !== null ? undefined : catalogObjectId';
  const r=analyzeCommerceScope(input);
  assert.equal(byId(r,'square_order_uses_canonical_catalog_variation').status,'BLOCKED');
});
