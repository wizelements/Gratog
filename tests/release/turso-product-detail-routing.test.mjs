import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync('app/product/[slug]/page.jsx','utf8');
const activeFunction=page.match(/async function loadSelectedProduct\(slug\) \{[\s\S]*?\n\}/)?.[0];
const load=(snapshot)=>new Function('tursoPreviewSelected','getTursoPreviewStorefrontSnapshot','connectToDatabase','getProductBySlugOrId','toStorefrontProduct','findProductBySlug',
 'return ('+activeFunction+')')(()=>true,snapshot,()=>{throw Error('MONGO_MUST_NOT_BE_OPENED')},()=>{throw Error('CURATED_PRICE_MUST_NOT_SELECT_PRODUCT')});
test('actual SSR detail loader returns the SQL catalog record without Mongo or curated authority',async()=>{
 const product={id:'provider-id',slug:'strawberry-bliss',priceCents:1199,stock:3,checkoutReady:true};
 const select=load(async()=>({products:[product]}));
 assert.equal(await select('strawberry-bliss'),product);assert.equal(await select('provider-id'),product);
 assert.equal(await select('unverified-alias'),null);
 assert.equal((page.match(/await loadSelectedProduct\(slug\)/g)||[]).length,2);
});
test('SQL catalog errors and ambiguous product references cannot become fallback sales',async()=>{
 await assert.rejects(load(async()=>{throw Error('SQL_CONNECTION_FAILED')})('strawberry-bliss'),/SQL_CONNECTION_FAILED/);
 await assert.rejects(load(async()=>({products:[{id:'a',slug:'duplicate'},{id:'b',slug:'duplicate'}]}))('duplicate'),/AMBIGUOUS/);
 assert.match(page,/if\(tursoPreviewSelected\(\)\)throw error/);
});
