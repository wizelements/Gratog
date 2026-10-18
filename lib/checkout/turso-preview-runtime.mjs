/**
 * Scoped Turso buyer connection. Preview-only and explicit opt-in.
 *
 * Existing Mongo production checkout is deliberately unaffected. An unset
 * token, wrong branch, non-sandbox Square configuration or production DB URL
 * MUST refuse checkout before any order or payment side effect.
 */
const BRANCH='feat/turso-checkout-recovery-20261017';
const STAGING_HOST='gratog-migration-cert-20261017-swatkins.aws-us-east-1.turso.io';

export class TursoPreviewRefusal extends Error {
  constructor(code, status=503) { super(code); this.code=code; this.status=status; }
}
export const tursoPreviewSelected = (env=process.env) =>
  String(env.DATABASE_PROVIDER||'').toLowerCase()==='turso';

export function assertTursoPreviewEnvironment(env=process.env) {
  if (env.VERCEL_ENV !== 'preview' ||
      env.VERCEL_GIT_COMMIT_REF !== BRANCH ||
      env.SQUARE_ENVIRONMENT !== 'sandbox' ||
      env.SQUARE_MOCK_MODE === 'true') {
    throw new TursoPreviewRefusal('TURSO_PREVIEW_ENVIRONMENT_BLOCKED');
  }
  const address=env.TURSO_STAGING_DATABASE_URL||'';
  let parsed;
  try { parsed = new URL(address.replace(/^libsql:/,'https:')); } catch {}
  if (!parsed || parsed.protocol!=='https:' || parsed.hostname!==STAGING_HOST ||
      !address.startsWith('libsql://') || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.pathname!=='/') {
    throw new TursoPreviewRefusal('TURSO_PREVIEW_TARGET_UNVERIFIED');
  }
  if (!env.TURSO_STAGING_AUTH_TOKEN || env.TURSO_STAGING_AUTH_TOKEN.length<24 ||
      !env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID ||
      !(env.ORDER_ACCESS_TOKEN_SECRET || env.JWT_SECRET)) {
    throw new TursoPreviewRefusal('TURSO_PREVIEW_CREDENTIALS_MISSING');
  }
  return {url:address,authToken:env.TURSO_STAGING_AUTH_TOKEN};
}
export async function openTursoPreview(env=process.env) {
  const config=assertTursoPreviewEnvironment(env);
  const {connect}=await import('@tursodatabase/serverless');
  return connect({...config,defaultQueryTimeout:15_000});
}

// Only independently observed Square Production identities/prices may be
// sold during initial preview certification. Full catalog reconciliation
// must replace this temporary owner-reviewed allowlist.
const verifiedPreviewOffers=new Map([
  ['KZXEV24XZ2UCQUJ64BH7ZUJP:HYODQWXIJJVAPRIZ66SVUYE5',{name:'Strawberry Bliss',cents:1199}],
  ['GFSY4S76P5X5UV6EH5ZYC7W7:6SSWAUSIEJIMPMXODY3DKKMI',{name:'Pineapple Mango Lemonade',cents:1199}],
]);
const blockedProductIds=new Set([
  // Shared Square ID incorrectly labeled as Pineapple Mango vs Vitamin Sea.
  'F2YVC7OVRYJU575JXROKFHFT',
]);
const validKey=x=>typeof x==='string'&&x.length>0&&x.length<=120;
const dollar=n=>n/100;
export async function priceTursoPreviewCart(db, {cart,fulfillmentType,appliedCoupon,couponCode,deliveryTip,
  customer,shippingAddress,deliveryAddress}={}) {
  if (!Array.isArray(cart)||cart.length===0||cart.length>50)
    throw new TursoPreviewRefusal('CART_INVALID',422);
  // services/order.ts sends pickup_market and pickup_dunwoody, not "pickup".
  // Restrict to exactly recognized pickup variants, not broad substring matches.
  if (!['pickup','pickup_market','pickup_dunwoody'].includes(fulfillmentType)) {
    // No shipping/delivery fee may be guessed or silently zeroed.
    throw new TursoPreviewRefusal('TURSO_FULFILLMENT_NOT_CERTIFIED',422);
  }
  if (appliedCoupon||couponCode||Number(deliveryTip||0)!==0 ||
      shippingAddress||deliveryAddress) {
    throw new TursoPreviewRefusal('TURSO_PROMOTION_OR_ADDRESS_NOT_CERTIFIED',422);
  }
  if (!customer||typeof customer!=='object' ||
      typeof customer.name!=='string'||customer.name.trim().length<2 ||
      typeof customer.email!=='string'||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new TursoPreviewRefusal('BUYER_CONTACT_INVALID',422);
  }
  const items=[];
  let subtotalCents=0;
  const seen=new Set();
  for(const raw of cart) {
    const productId=raw?.productId||raw?.id;
    const variationId=raw?.variationId||null;
    const quantity=raw?.quantity;
    if(!validKey(productId)||!validKey(variationId)||!Number.isSafeInteger(quantity)||
       quantity<1||quantity>50||seen.has(productId+':'+variationId)||
       blockedProductIds.has(productId)) {
      throw new TursoPreviewRefusal('TURSO_ITEM_NOT_CERTIFIED',422);
    }
    seen.add(productId+':'+variationId);
    const reviewed=verifiedPreviewOffers.get(productId+':'+variationId);
    if(!reviewed)throw new TursoPreviewRefusal('TURSO_CATALOG_AUTHORITY_UNCERTIFIED',409);
    const row=await db.get(
      'SELECT p.id,p.name,p.active,v.id AS variation_id,v.name AS variation_name,'+
      'v.price_cents,v.currency,v.active AS variation_active,'+
      'i.current_stock,i.active AS stock_active '+
      'FROM products p JOIN product_variations v ON v.product_id=p.id '+
      'LEFT JOIN inventory i ON i.product_id=p.id WHERE p.id=? AND v.id=?',
      productId,variationId
    );
    const unitPriceCents=Number(row?.price_cents);
    if(!row||row.name!==reviewed.name||unitPriceCents!==reviewed.cents||Number(row.active)!==1||Number(row.variation_active)!==1||
       row.currency!=='USD'||!Number.isSafeInteger(unitPriceCents)||
       unitPriceCents<500||Number(row.stock_active)!==1||
       !Number.isSafeInteger(Number(row.current_stock))||
       Number(row.current_stock)<quantity) {
      throw new TursoPreviewRefusal('TURSO_ITEM_UNAVAILABLE_OR_CATALOG_MISMATCH',409);
    }
    const lineTotalCents=unitPriceCents*quantity;
    if(!Number.isSafeInteger(lineTotalCents)) throw new TursoPreviewRefusal('CART_TOTAL_INVALID',422);
    subtotalCents+=lineTotalCents;
    if(!Number.isSafeInteger(subtotalCents))throw new TursoPreviewRefusal('CART_TOTAL_INVALID',422);
    items.push({
      productId,variationId,name:row.name,quantity,unitPriceCents,lineTotalCents,
      catalogObjectId:productId,size:row.variation_name||'Regular',
    });
  }
  // Taxes or supplemental fees require server-authoritative checkout logic;
  // no inference from browser-supplied totals.
  return {items,subtotalCents,taxCents:0,totalCents:subtotalCents,
    total:dollar(subtotalCents),subtotal:dollar(subtotalCents),currency:'USD'};
}

/** Read model used by both server bootstrap and /api/products in Turso Preview. */
export async function getTursoPreviewStorefrontSnapshot(filters={}) {
  const db=await openTursoPreview();
  const rows=await db.all(
    'SELECT p.id,p.name,p.description,p.slug,p.active,p.metadata_json,'+
    'v.id AS variation_id,v.name AS variation_name,v.price_cents,v.currency,'+
    'v.active AS variation_active,i.current_stock,i.active AS stock_active '+
    'FROM products p LEFT JOIN product_variations v ON v.product_id=p.id '+
    'LEFT JOIN inventory i ON i.product_id=p.id ORDER BY p.name,v.id'
  );
  const products=[];
  for(const row of rows) {
    if(!row.variation_id)continue;
    const offer=verifiedPreviewOffers.get(row.id+':'+row.variation_id);
    const stock=Number(row.current_stock);
    const cents=Number(row.price_cents);
    const sellable=Boolean(offer && offer.name===row.name && offer.cents===cents &&
      Number(row.active)===1 && Number(row.variation_active)===1 &&
      Number(row.stock_active)===1 && Number.isSafeInteger(stock) && stock>0);
    let metadata={};try{metadata=JSON.parse(row.metadata_json||'{}')}catch{}
    const category=String(metadata.category||'Beverages').slice(0,60);
    const item={
      id:row.id,name:row.name,slug:row.slug||row.id,
      description:row.description||'',
      category,size:row.variation_name||'Regular',
      price:Number.isSafeInteger(cents)&&cents>0?cents/100:null,
      priceCents:Number.isSafeInteger(cents)?cents:null,
      variationId:row.variation_id,catalogObjectId:row.variation_id,
      variations:[{id:row.variation_id,name:row.variation_name,price:cents/100,
        priceCents:cents}],
      stock:Number.isSafeInteger(stock)?Math.max(0,stock):null,
      currentStock:Number.isSafeInteger(stock)?Math.max(0,stock):null,
      inStock:sellable,checkoutReady:sellable,
      purchaseStatus:sellable?'available':'unavailable',
      checkoutUnavailableReason:sellable?undefined:
        'Online stock or Square catalog identity has not been certified for this selection.',
    };
    if(filters.category && String(filters.category).toLowerCase()!==category.toLowerCase())continue;
    products.push(item);
  }
  const counts=new Map();
  for(const p of products)counts.set(p.category,(counts.get(p.category)||0)+1);
  return {products,categories:[...counts].map(([name,count])=>({name,count})),
    totalCount:products.length,source:'turso-isolated-preview',
    isFallback:false,integrityReports:[]};
}

/** Same authoritative SQL price engine used by payable Preview orders. */
export async function priceTursoPreviewVariations(db,lines) {
  if(!Array.isArray(lines)||!lines.length||lines.length>50)
    throw new TursoPreviewRefusal('CART_INVALID',422);
  const cart=[];
  for(const line of lines) {
    if(!validKey(line?.variationId)||!Number.isSafeInteger(line?.qty)||
       line.qty<1||line.qty>50)throw new TursoPreviewRefusal('CART_LINE_INVALID',422);
    const item=await db.get('SELECT product_id FROM product_variations WHERE id=?',line.variationId);
    if(!item?.product_id)throw new TursoPreviewRefusal('TURSO_ITEM_NOT_CERTIFIED',409);
    cart.push({productId:item.product_id,variationId:line.variationId,quantity:line.qty});
  }
  return priceTursoPreviewCart(db,{cart,fulfillmentType:'pickup',
    customer:{name:'Read-only cart quote',email:'quote@example.invalid'}});
}

/**
 * Validates real checkout pickup selection against migrated market authority.
 * The browser's "dunwoody" pickup has no matching active Turso market; never
 * create a payable order there until operations reconcile market ownership.
 */
export async function validateTursoPreviewPickup(db,{pickup,fulfillmentType}={},now=new Date()) {
  if(!['pickup','pickup_market','pickup_dunwoody'].includes(fulfillmentType)||
      !pickup || typeof pickup!=='object') {
    throw new TursoPreviewRefusal('TURSO_PICKUP_CONFIGURATION_INVALID',422);
  }
  const locationId=String(pickup.locationId||'').toLowerCase();
  if(locationId!=='serenbe'||fulfillmentType==='pickup_dunwoody') {
    throw new TursoPreviewRefusal('TURSO_PICKUP_LOCATION_NOT_CERTIFIED',422);
  }
  const market=await db.get(
    "SELECT id,name,day_of_week,active FROM markets "+
    "WHERE lower(name)=lower(?) LIMIT 1",
    'Serenbe Farmers Market'
  );
  if(!market || Number(market.active)!==1||Number(market.day_of_week)!==6) {
    throw new TursoPreviewRefusal('TURSO_PICKUP_MARKET_NOT_ACTIVE',422);
  }
  const selected=pickup.date;
  if(typeof selected!=='string'||
     !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(selected)||
     !Number.isFinite(Date.parse(selected))) {
    throw new TursoPreviewRefusal('TURSO_PICKUP_DATE_INVALID',422);
  }
  const toAtlantaDate=value=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
      year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
    const get=k=>parts.find(p=>p.type===k)?.value;
    return get('year')+'-'+get('month')+'-'+get('day');
  };
  const pickupDay=toAtlantaDate(new Date(selected));
  const currentDay=toAtlantaDate(now);
  const utcMidnight=new Date(pickupDay+'T12:00:00Z');
  const days=Math.round((Date.parse(pickupDay+'T00:00:00Z')-
    Date.parse(currentDay+'T00:00:00Z'))/86_400_000);
  // No after-cutoff same-day promises. Delivery schedule may need dedicated
  // calendar authority before lifting this restriction.
  if(utcMidnight.getUTCDay()!==6||days<1||days>35) {
    throw new TursoPreviewRefusal('TURSO_PICKUP_DATE_NOT_CERTIFIED',422);
  }
  return {type:'pickup_market',pickup:{locationId:'serenbe',
    date:selected,marketId:market.id}};
}
