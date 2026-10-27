import test from 'node:test';
import assert from 'node:assert/strict';
import {priceTursoPreviewCart,tursoPreviewSelected} from '../../lib/checkout/turso-preview-runtime.mjs';
const offers=[
 ['DDM6ISOPLK3ZKP6JAVV36BQU','3YUSTFWEJBWIXDCVBIT2DNGN','Calm Waters'],
 ['V3EOGQA2DTWBN4EEC3TWZURN','BVBOOMCBBSAWKK4ZP42JGLOV','SuppleMint'],
 ['2SCG2SA3N4TOEMKSXLSQJGHW','K6NKG3C44MQTDXFTTHHCIWKM','Gracious Roots'],
 ['YSAUUKCZSVHBN6TYFL34JOSZ','6PZ7M6XSF3FAH7ELMXAYIDJL','Kissed by Gods'],
 ['XL76VGNSN5RKNVRKXO5QET25','GFMPAA2DCRRIQOPJ47T3WTHV','Melon Rita'],
 ['LBFLQVN3ZSGQULHNDXE3WP4H','VIMU6X34SAMCOKBSAURGOZON','Passion Guava Pineapple Lemonade'],
];
const body=(p,v)=>({cart:[{productId:p,variationId:v,quantity:1}],fulfillmentType:'pickup',
 customer:{name:'Unit test buyer',email:'buyer@example.invalid'}});
test('all six exact merchant Sandbox identities use the approved price and require actual native stock',async()=>{
 for(const[p,v,name]of offers){
  const record={id:p,name,active:1,variation_id:v,variation_name:'16 oz',price_cents:1199,
   currency:'USD',variation_active:1,current_stock:1,stock_active:1};
  const db={get:async(sql,pid,vid)=>{assert.equal(pid,p);assert.equal(vid,v);return record}};
  assert.equal((await priceTursoPreviewCart(db,body(p,v))).totalCents,1199);
  record.current_stock=0;
  await assert.rejects(()=>priceTursoPreviewCart(db,body(p,v)),{code:'TURSO_ITEM_UNAVAILABLE_OR_CATALOG_MISMATCH'});
 }
});
test('legacy Production identities cannot authorize Sandbox checkout',async()=>{
 let queried=false;
 const db={get:async()=>{queried=true;throw Error('Production catalog must not be queried')}};
 await assert.rejects(()=>priceTursoPreviewCart(db,body('KZXEV24XZ2UCQUJ64BH7ZUJP','HYODQWXIJJVAPRIZ66SVUYE5')),
  {code:'TURSO_CATALOG_AUTHORITY_UNCERTIFIED'});
 assert.equal(queried,false);
});

test('the Turso integration Preview selects Turso without relying on inherited provider config',()=>{
for(const DATABASE_PROVIDER of [undefined,'mongodb','turso']) assert.equal(tursoPreviewSelected({DATABASE_PROVIDER,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/turso-lemonade-certification-20261027'}),true);
assert.equal(tursoPreviewSelected({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'}),false);
});
