#!/usr/bin/env node
/**
 * OWNER-ONLY, sandbox-only Turso catalog identity reconciliation.
 * Reads the authenticated immutable Preview's DIRECT Square Sandbox catalog.
 * Adds the six approved Square identities into the isolated certification DB
 * with ZERO sellable stock. Never guesses physical counts or preorder capacity.
 */
import {spawn} from 'node:child_process';
import {connect} from '@tursodatabase/serverless';
import {readTursoSandboxCatalogStatus} from '../lib/checkout/turso-preview-runtime.mjs';

const scope=Object.freeze({
  branch:'feat/turso-lemonade-certification-20261027',
  team:'team_HLmyvqEhI158ahAD2U1p7MxM',
  project:'prj_HnwKt5XyWC1Evcrv3mZLa3cdpDcG',
  db:'libsql://gratog-migration-cert-20261018-swatkins.aws-us-east-1.turso.io',
  approved:[
    ['Calm Waters','DDM6ISOPLK3ZKP6JAVV36BQU','3YUSTFWEJBWIXDCVBIT2DNGN'],
    ['SuppleMint','V3EOGQA2DTWBN4EEC3TWZURN','BVBOOMCBBSAWKK4ZP42JGLOV'],
    ['Gracious Roots','2SCG2SA3N4TOEMKSXLSQJGHW','K6NKG3C44MQTDXFTTHHCIWKM'],
    ['Kissed by Gods','YSAUUKCZSVHBN6TYFL34JOSZ','6PZ7M6XSF3FAH7ELMXAYIDJL'],
    ['Melon Rita','XL76VGNSN5RKNVRKXO5QET25','GFMPAA2DCRRIQOPJ47T3WTHV'],
    ['Passion Guava Pineapple Lemonade','LBFLQVN3ZSGQULHNDXE3WP4H','VIMU6X34SAMCOKBSAURGOZON'],
  ]
});
const expectedSha=process.argv[2]||'';
const preview=process.argv[3]||'';
const token=process.env.TURSO_STAGING_AUTH_TOKEN||'';
if(!/^[a-f0-9]{40}$/.test(expectedSha)||!token||token.length<24)
  throw Error('PINNED_SHA_AND_SCOPED_TURSO_TOKEN_REQUIRED');
if(!/^https:\/\/gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app$/.test(preview))
  throw Error('EXACT_PREVIEW_URL_REQUIRED');
const hostname=new URL(preview).hostname;
const run=(command,args)=>new Promise((resolve,reject)=>{
  const c=spawn(command,args,{stdio:['ignore','pipe','pipe'],env:{...process.env,
    VERCEL_TELEMETRY_DISABLED:'1',NO_COLOR:'1'}});
  let out='',outBytes=0;
  const timeout=setTimeout(()=>c.kill('SIGTERM'),45000);
  c.stdout.on('data',chunk=>{outBytes+=chunk.length;if(outBytes<2e6)out+=chunk.toString();else c.kill('SIGTERM');});
  // Do not collect or forward diagnostic output containing session credentials.
  c.stderr.on('data',()=>{});
  c.on('error',()=>{clearTimeout(timeout);reject(Error('OWNER_CLI_UNAVAILABLE'));});
  c.on('close',code=>{clearTimeout(timeout);code===0&&outBytes<2e6?resolve(out):reject(Error('OWNER_CLI_OPERATION_FAILED'));});
});
const deployment=JSON.parse(await run('vercel',['api',
  '/v13/deployments/'+hostname+'?teamId='+scope.team,'--scope',scope.team,'--raw']));
if(deployment.projectId!==scope.project||deployment.target==='production'||
  deployment.meta?.githubCommitRef!==scope.branch||
  deployment.meta?.githubCommitSha!==expectedSha||
  deployment.readyState!=='READY')
  throw Error('PREVIEW_COMMIT_OR_PROJECT_SCOPE_MISMATCH');

const response=JSON.parse(await run('vercel',['curl','/api/storefront/square-catalog',
  '--deployment',preview,'--silent','--show-error']));
if(response.success!==true||response.source!=='square_direct'||response.inventoryVerified!==true||
  response.inventorySource!=='square_inventory_at_location'||!Array.isArray(response.products))
  throw Error('DIRECT_SQUARE_SANDBOX_READBACK_REQUIRED');

const approved=[];
for(const [name,id,variationId] of scope.approved){
  const matches=response.products.filter(x=>x.name===name&&x.id===id&&
    x.squareData?.variationId===variationId);
  if(matches.length!==1)throw Error('SQUARE_CATALOG_IDENTITY_MISMATCH_'+name.replaceAll(' ','_'));
  const p=matches[0];
  if(p.priceCents!==1199||p.currency!=='USD'||p.stockQuantity!==0||
    !Array.isArray(p.variations)||p.variations.length!==1||
    p.variations[0].id!==variationId||p.variations[0].stockQuantity!==0)
    throw Error('SQUARE_SANDBOX_STOCK_OR_PRICE_NOT_CERTIFIED');
  approved.push({name,id,variationId});
}
const db=connect({url:scope.db,authToken:token,defaultQueryTimeout:15000});
const prepared=[];
try {
  // Preflight every existing key before any write, rejecting ambiguous imports.
  for(const p of approved){
    const productRows=await db.all(
      'SELECT id,name,square_catalog_id,active FROM products WHERE id=? OR square_catalog_id=?',
      p.id,p.id);
    const variationRows=await db.all(
      'SELECT id,product_id,square_variation_id,price_cents,currency,active FROM product_variations WHERE id=? OR square_variation_id=?',
      p.variationId,p.variationId);
    const inv=await db.get('SELECT current_stock,source,active FROM inventory WHERE product_id=?',p.id);
    if(productRows.length>1||variationRows.length>1||
      productRows.some(x=>x.id!==p.id||x.name!==p.name||
        x.square_catalog_id!==p.id||Number(x.active)!==1)||
      variationRows.some(x=>x.id!==p.variationId||x.product_id!==p.id||
        x.square_variation_id!==p.variationId||Number(x.price_cents)!==1199||
        x.currency!=='USD'||Number(x.active)!==1)||
      (inv&&(Number(inv.current_stock)!==0||Number(inv.active)!==1||
        inv.source!=='square_sandbox_zero_not_physical')))
      throw Error('PREEXISTING_STAGING_RECORD_NEEDS_RECONCILIATION');
    if((productRows.length===0)!==(variationRows.length===0)||
      (productRows.length===0)!==(inv===undefined||inv===null))
      throw Error('PARTIAL_STAGING_CATALOG_REQUIRES_REVIEW');
    prepared.push({...p,existing:productRows.length===1});
  }
  const write=db.transactionAsync(async tx=>{
    const now=new Date().toISOString();
    for(const p of prepared.filter(x=>!x.existing)){
      await tx.run('INSERT INTO products (id,square_catalog_id,slug,name,description,active,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        p.id,p.id,'square-sbx-'+p.id.toLowerCase(),p.name,
        'Approved 16 oz bottled lemonade, Square Sandbox certification only',1,
        JSON.stringify({category:'lemonades',sandbox:true,physicalStockVerified:false,merchantPreorderCapacityApproved:false}),
        now,now);
      await tx.run('INSERT INTO product_variations (id,product_id,square_variation_id,name,price_cents,currency,active) VALUES (?,?,?,?,?,?,?)',
        p.variationId,p.id,p.variationId,'16 oz',1199,'USD',1);
      await tx.run('INSERT INTO inventory (product_id,current_stock,low_stock_threshold,active,source,updated_at) VALUES (?,?,?,?,?,?)',
        p.id,0,0,1,'square_sandbox_zero_not_physical',now);
      await tx.run('INSERT INTO inventory_variations (product_id,variation_id) VALUES (?,?)',p.id,p.variationId);
    }
  });
  await write.immediate();
  const status=await readTursoSandboxCatalogStatus(db);
  if(status.catalogVerified!==true||status.verifiedProducts!==6||status.stockedProducts!==0)
    throw Error('STAGING_CATALOG_READBACK_FAILED');
  console.log(JSON.stringify({kind:'isolated-preview-catalog-reconciliation',pass:true,
    branch:scope.branch,sha:expectedSha,verifiedProducts:6,stockedProducts:0,
    rowsInserted:prepared.filter(x=>!x.existing).length,inventoryPositive:false,
    buyerCheckoutCertified:false,merchantCapacityApproved:false,
    squareInventoryWritten:false,productionChanged:false,secretsPrinted:false}));
}finally{
  try { if(typeof db.close==='function')await db.close(); }catch { /* no provider secrets in errors */ }
  delete process.env.TURSO_STAGING_AUTH_TOKEN;
}
