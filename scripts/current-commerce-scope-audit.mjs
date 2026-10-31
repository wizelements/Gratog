#!/usr/bin/env node
/**
 * Public, read-only Taste of Gratitude commerce audit.
 * This program deliberately NEVER creates orders, writes to Square, changes
 * stock, accesses customer data, or pretends to certify paid checkout.
 *
 * On success, this audit has EXECUTED. Certification may still be BLOCKED.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PROD = 'https://tasteofgratitude.shop';
const EXPECTED = Object.freeze([
  { name:'Calm Waters',slug:'calm-waters',price:11.99 },
  { name:'SuppleMint',slug:'supplemint',price:11.99 },
  { name:'Gracious Roots',slug:'gracious-roots',price:11.99 },
  { name:'Kissed by Gods',slug:'kissed-by-gods',price:11.99 },
  { name:'Melon Rita',slug:'melon-rita',price:11.99 },
  { name:'Passion Guava Pineapple Lemonade',slug:'passion-guava-pineapple',price:11.99 },
  { name:'Always Pursue Gratitude',slug:'apg',price:12.99 },
  { name:'Herbal Vibe',slug:'herbal-vibe',price:15.99 },
]);
const normalize = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const equivalent = (p,t) => normalize(p.name)===normalize(t.name) ||
  (t.slug==='apg' && ['apg','apg always pursue gratitude'].includes(normalize(p.name))) ||
  (t.slug==='passion-guava-pineapple' && [
    'passion fruit guava pineapple lemon','passion fruit guava pineapple lemonade'
  ].includes(normalize(p.name))) ||
  (t.slug==='supplemint' && normalize(p.name)==='supple mint');
const money = n => Number.isFinite(Number(n)) && Math.abs(Number(n))<1e7 ? Number(n) : null;
const check = (id,status,detail) => ({id,status,detail});

export function analyzeCommerceScope({storefront,square,health,webhook,recount,sourceFiles}) {
  const checks=[];
  const merchantCounts=new Map((recount.items || []).map(x=>[x.slug,x.reportedQuantity]));
  const main=Array.isArray(storefront.products)?storefront.products:[];
  const direct=Array.isArray(square.products)?square.products:[];
  checks.push(check('square_production_location_connection',
    health.ok===true && health.environment==='production' &&
      health.squareConnectivity?.ok===true && health.squareConnectivity?.status==='ACTIVE'?'PASS':'BLOCKED',
    {environment:health.environment,locationConnected:health.squareConnectivity?.ok===true,
      locationName:health.squareConnectivity?.locationName||null}));
  const inventory=[];
  for(const target of EXPECTED){
    const m=main.filter(p=>equivalent(p,target)),s=direct.filter(p=>equivalent(p,target));
    const local=m[0],squareProduct=s[0];
    const expectedCount=merchantCounts.get(target.slug) ?? null;
    const sqCount=s.length===1 && squareProduct.countStatus==='reported' &&
      Number.isSafeInteger(squareProduct.stockQuantity) ? squareProduct.stockQuantity : null;
    const validPrice=m.length===1 && money(local.price)===target.price;
    checks.push(check('storefront_'+target.slug,
      validPrice?'PASS':'BLOCKED',
      {matchingEntries:m.length,approvedPrice:target.price,displayPrice:local?.price??null}));
    const hasIdentity=s.length===1 && typeof squareProduct?.squareData?.variationId==='string' &&
      Boolean(squareProduct.squareData.variationId);
    inventory.push({
      slug:target.slug,merchantReported:expectedCount,merchantCountVerifiedInSquare:false,
      squareCatalogStatus:hasIdentity?'found':s.length>1?'duplicate':'missing',
      squareVariationId:hasIdentity?squareProduct.squareData.variationId:null,
      squareStockStatus:squareProduct?.countStatus??'unknown',
      squareReportedSellable:sqCount,
      websiteStock:local?.stock??null,websiteCheckoutReady:local?.checkoutReady===true,
      feedCheckoutReady:squareProduct?.checkoutReady===true,
      reconciled:expectedCount!==null&&hasIdentity&&sqCount===expectedCount&&
        local?.checkoutReady===true&&local?.inventoryVerified===true,
    });
  }
  const names=main.map(p=>normalize(p.name));
  const duplicates=names.filter((x,i)=>names.indexOf(x)!==i);
  const disallowed=main.filter(p=>!EXPECTED.some(x=>equivalent(p,x))).map(p=>p.name);
  checks.push(check('website_approved_menu_only',duplicates.length===0&&disallowed.length===0?'PASS':'BLOCKED',
    {duplicateNames:duplicates,unapprovedNames:disallowed,count:main.length}));
  const directDuplicates=direct.map(p=>normalize(p.name)).filter((n,i,a)=>a.indexOf(n)!==i);
  checks.push(check('square_website_feed_no_duplicate_calm_waters',
    directDuplicates.length===0 && direct.filter(p=>normalize(p.name)==='calm waters').length===1?'PASS':'BLOCKED',
    {duplicates:directDuplicates}));
  const passion=main.find(p=>equivalent(p,EXPECTED[5]));
  const ingredients=(passion?.ingredients||[]).map(x=>normalize(typeof x==='string'?x:x?.name));
  checks.push(check('passion_ingredient_truth',passion && !ingredients.some(x=>x.includes('ginger')||x.includes('sea moss')) &&
    ['passion fruit','guava','pineapple','lemon','agave','alkaline water'].every(x=>ingredients.includes(x))?'PASS':'BLOCKED',
    {ingredients}));
  checks.push(check('all_six_lemonades_merchant_recount_reconciled',inventory.filter(x=>merchantCounts.has(x.slug) && x.slug!=='herbal-vibe').every(x=>x.reconciled)?'PASS':'BLOCKED',
    {unreconciled:inventory.filter(x=>merchantCounts.has(x.slug) && !x.reconciled).map(x=>x.slug)}));
  checks.push(check('herbal_vibe_12_merchant_recount_reconciled',
    inventory.find(x=>x.slug==='herbal-vibe')?.reconciled?'PASS':'BLOCKED',
    {merchantReported:merchantCounts.get('herbal-vibe')??null,
      square:inventory.find(x=>x.slug==='herbal-vibe')?.squareReportedSellable??null}));
  const noFalseSales=main.every(x=>x.checkoutReady!==true || x.inventoryVerified===true);
  checks.push(check('website_no_false_stock_checkout',noFalseSales?'PASS':'BLOCKED',
    {checkoutReadyCount:main.filter(x=>x.checkoutReady===true).length}));
  checks.push(check('square_webhook_route_exists',webhook.status==='active'?'PASS':'BLOCKED',
    {routeResponds:webhook.status==='active'}));
  const paymentSource=sourceFiles?.payments||'';
  const stockSource=sourceFiles?.inventory||'';
  const webhookSource=sourceFiles?.webhook||'';
  checks.push(check('square_order_uses_canonical_catalog_variation',
    paymentSource && !paymentSource.includes('catalogObjectId: approvedUnitPriceCents(it) !== null ? undefined : catalogObjectId')?'NOT_PROVEN':'BLOCKED',
    {reason:'Known approved-SKU ad-hoc order-line fallback must be removed and integration-tested before certification'}));
  checks.push(check('inventory_reserved_atomically_before_external_capture','NOT_PROVEN',
    {reason:'Prepayment inventory read plus post-payment debit does not independently prove no-oversell; disposable DB and provider concurrency E2E required',
      observedPrepaymentRead:paymentSource.includes('checkInventoryForPayment(db, order.items)'),
      observedPostchargeDebit:paymentSource.includes('consumeInventoryForPaidOrder(db')}));
  checks.push(check('square_inventory_webhook_updates_checkout_ledger',
    webhookSource.includes("stockSource: 'square_inventory_rest'")?'NOT_PROVEN':'BLOCKED',
    {reason:'Webhook updates square_inventory but verified first-party inventory collection must receive readback with correct source and freshness'}));
  checks.push(check('production_square_merchant_catalog_write','NOT_TESTED',
    {reason:'No authorized Square merchant catalog-write execution available in this read-only audit'}));
  checks.push(check('real_square_sandbox_pay_refund_decline_e2e','NOT_TESTED',
    {reason:'Requires separately triggered, restricted real Square Sandbox workflow with credentials and retained receipts'}));
  checks.push(check('live_customer_charge_and_refund_e2e','NOT_TESTED',
    {reason:'Production monetary side effects intentionally excluded from a public GET-only certification audit'}));
  const unsafeCount=checks.filter(x=>x.status==='BLOCKED').length;
  return {
    schemaVersion:1, kind:'public_readonly_live_commerce_scope',
    checkedAt:new Date().toISOString(), domain:PROD,
    result:'AUDIT_EXECUTED_NOT_CERTIFIED',
    certified:false,
    summary:{passed:checks.filter(x=>x.status==='PASS').length,
      blocked:unsafeCount,notProven:checks.filter(x=>x.status==='NOT_PROVEN').length,
      notTested:checks.filter(x=>x.status==='NOT_TESTED').length},
    merchantRecountSource:recount.source||null,
    merchantRecountDate:recount.recordedDate||null,
    inventory, checks,
    conclusion:'Live checkout remains disabled until authorized Square inventory write/readback, canonical SKU mapping, atomic reservation and payment/refund/webhook E2E are independently verified.',
  };
}
async function readJSON(path) {
  if(!path.startsWith('/api/'))throw Error('PUBLIC_PROBE_PATH_REQUIRED');
  const url=new URL(path,PROD);
  if(url.hostname!=='tasteofgratitude.shop')throw Error('PRODUCTION_ORIGIN_MISMATCH');
  const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('READ_ONLY_PROBE_HTTP_'+response.status+'_'+path);
  return response.json();
}
async function runLive(){
  const [storefront,square,health,webhook]=await Promise.all([
    readJSON('/api/storefront/catalog'),
    readJSON('/api/storefront/square-catalog'),
    readJSON('/api/health/payments?deep=true'),
    readJSON('/api/webhooks/square'),
  ]);
  const recount=JSON.parse(readFileSync(resolve('ops/reconciliation/2026-10-31-merchant-bottle-counts.json'),'utf8'));
  const sourceFiles={
    payments:readFileSync(resolve('app/api/payments/route.ts'),'utf8'),
    inventory:readFileSync(resolve('lib/custom-inventory.js'),'utf8'),
    webhook:readFileSync(resolve('app/api/webhooks/square/route.ts'),'utf8'),
  };
  return analyzeCommerceScope({storefront,square,health,webhook,recount,sourceFiles});
}
const invoked=process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(invoked){
  if(!process.argv.includes('--live'))throw Error('USAGE: node scripts/current-commerce-scope-audit.mjs --live');
  const outfile='test-results/current-commerce-scope.json';
  let report;
  try{report=await runLive()}catch(error){
    report={kind:'public_readonly_live_commerce_scope',checkedAt:new Date().toISOString(),
      result:'AUDIT_INCOMPLETE',certified:false,error:String(error?.message||error)};
  }
  mkdirSync('test-results',{recursive:true});
  writeFileSync(outfile,JSON.stringify(report,null,2)+'\n');
  console.log('COMMERCE_SCOPE',JSON.stringify({result:report.result,certified:report.certified,
    summary:report.summary||null,error:report.error||null,
    report:outfile}));
  if(report.result==='AUDIT_INCOMPLETE')process.exitCode=1;
}
