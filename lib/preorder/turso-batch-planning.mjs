/**
 * Taste of Gratitude merchant-approved production planning policy.
 *
 * IMPORTANT: a planned preorder allowance is NOT on-hand Square inventory.
 * These functions have no payment, catalog or inventory side effects.
 * Capacity is not sellable until an independently certified reservation engine
 * honors the per-date/per-variation allowance transactionally.
 */
export const APPROVED_LEMONADE_OFFERS = Object.freeze([
  {name:'Calm Waters',productId:'DDM6ISOPLK3ZKP6JAVV36BQU',variationId:'3YUSTFWEJBWIXDCVBIT2DNGN'},
  {name:'SuppleMint',productId:'V3EOGQA2DTWBN4EEC3TWZURN',variationId:'BVBOOMCBBSAWKK4ZP42JGLOV'},
  {name:'Gracious Roots',productId:'2SCG2SA3N4TOEMKSXLSQJGHW',variationId:'K6NKG3C44MQTDXFTTHHCIWKM'},
  {name:'Kissed by Gods',productId:'YSAUUKCZSVHBN6TYFL34JOSZ',variationId:'6PZ7M6XSF3FAH7ELMXAYIDJL'},
  {name:'Melon Rita',productId:'XL76VGNSN5RKNVRKXO5QET25',variationId:'GFMPAA2DCRRIQOPJ47T3WTHV'},
  {name:'Passion Guava Pineapple Lemonade',productId:'LBFLQVN3ZSGQULHNDXE3WP4H',variationId:'VIMU6X34SAMCOKBSAURGOZON'},
]);
const offers=new Map(APPROVED_LEMONADE_OFFERS.map(x=>[x.productId,x]));
export class BatchPlanError extends Error{
  constructor(code){super(code);this.name='BatchPlanError';this.code=code;}
}
function validDate(date){
  if(typeof date!=='string'||!/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(date)||date.length!==10)return false;
  const parsed=new Date(date+'T12:00:00Z');
  return !Number.isNaN(parsed.valueOf())&&parsed.toISOString().slice(0,10)===date&&parsed.getUTCDay()===6;
}
export function planFourGallonEquivalent(gallons){
  // Production can run one or two nominal 4-gallon batches per flavor.
  if(gallons!==4&&gallons!==8)throw new BatchPlanError('ONLY_4_OR_8_GALLON_BATCHES_APPROVED');
  const theoreticalBottles=gallons*8; // 128 US fluid ounces/gallon, 16 fl oz/bottle.
  const preorderCap=gallons*4; // Merchant approved: 16 per 4 gal.
  const marketTarget=gallons*3; // Planning target only; actual output is counted later.
  const uncertaintyBuffer=gallons; // Planning buffer, NOT made bottles.
  return {gallons,theoreticalBottles,preorderCap,marketTarget,uncertaintyBuffer,
    actualBottles:null,physicalStockVerified:false,checkoutEnabled:false};
}
export function buildWeeklyBatchPlan({pickupDate,flavors}={}){
  if(!validDate(pickupDate))throw new BatchPlanError('SATURDAY_PICKUP_DATE_REQUIRED');
  if(!Array.isArray(flavors)||flavors.length<4||flavors.length>5)
    throw new BatchPlanError('SELECT_4_OR_5_FLAVORS');
  const seen=new Set(),rows=[];
  for(const input of flavors){
    const offer=offers.get(input?.productId);
    if(!offer||input.variationId && input.variationId!==offer.variationId)
      throw new BatchPlanError('UNAPPROVED_SQUARE_VARIATION');
    if(seen.has(offer.productId))throw new BatchPlanError('DUPLICATE_FLAVOR');
    seen.add(offer.productId);
    const plan=planFourGallonEquivalent(input.gallons);
    rows.push({...offer,...plan,pickupDate,merchantCapacityApproved:true,
      // IMPORTANT: approval of the planning policy does NOT turn on checkout.
      reservationEngineCertified:false,recordedReservations:0});
  }
  return {pickupDate,rows,flavorCount:rows.length,
    gallons:rows.reduce((s,x)=>s+x.gallons,0),
    theoreticalBottles:rows.reduce((s,x)=>s+x.theoreticalBottles,0),
    proposedPreorderCap:rows.reduce((s,x)=>s+x.preorderCap,0),
    physicalStockVerified:false,checkoutEnabled:false};
}
/** Market allocation is adjusted AFTER actual filling; never fake production. */
export function allocateFinishedBottles({actualBottles,committedPreorders,minimumBuffer=2}={}){
  if(!Number.isSafeInteger(actualBottles)||actualBottles<0||
     !Number.isSafeInteger(committedPreorders)||committedPreorders<0||
     !Number.isSafeInteger(minimumBuffer)||minimumBuffer<0)
    throw new BatchPlanError('INVALID_ACTUAL_BOTTLE_COUNTS');
  return {actualBottles,committedPreorders,shortfall:Math.max(0,committedPreorders-actualBottles),
    marketAllocation:Math.max(0,actualBottles-committedPreorders-minimumBuffer),
    buffer:Math.min(minimumBuffer,Math.max(0,actualBottles-committedPreorders))};
}
