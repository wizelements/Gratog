/**
 * Market digital purchase certification and atomic local stock reservation.
 * This ledger protects requests made through our website. It cannot by itself
 * reserve stock from independent Square Online / POS channels; operational
 * isolation and real Square certification are separate mandatory gates.
 */
import { createHash } from 'node:crypto';
import { CURRENT_MENU } from '@/lib/square-menu-stock';
import { approvedUnitPriceCents } from '@/lib/merchant-pricing';
import { resolveMarketQrId } from '@/lib/market-qr-policy';

export type MarketItemRequest = { slug:string; quantity:number };
export type SquareStockEvidence = {
  slug:string; status:string; countStatus:string;
  variationId:string|null; onHand:number|null;
};
export type MarketAllocation = {
  _id:string; marketId:string; serviceDate:string; slug:string;
  squareVariationId:string; squareLocationId:string;
  approvedUnits:number; heldUnits:number; soldUnits:number;
  merchantApprovedAt:Date; squareObservedAt:Date;
  verifiedSquareOnHand:number;
  merchantPhysicalCountVerified:boolean;
  separatelyAllocatedFromOtherChannels:boolean;
  paymentCertification:'verified'|'not_verified';
  sessionStatus:'open'|'closed'|'unpublished';
  priceCents:number;
};

export function stockAdmission(allocated: MarketAllocation|null|undefined,
  square:SquareStockEvidence|null|undefined, requested:number,
  now:Date=new Date()): {ok:boolean;reason:string;remaining:number|null} {
  if (!allocated || !square) return {ok:false,reason:'NO_MARKET_STOCK_ALLOCATION',remaining:null};
  const product=CURRENT_MENU.find(item=>item.slug===allocated.slug);
  const cents=product&&approvedUnitPriceCents({slug:product.slug,name:product.name});
  if (!product || !Number.isSafeInteger(cents) || cents!==allocated.priceCents)
    return {ok:false,reason:'MARKET_PRICE_OR_PRODUCT_UNVERIFIED',remaining:null};
  if (resolveMarketQrId(allocated.marketId)!==allocated.marketId ||
    allocated.sessionStatus!=='open')
    return {ok:false,reason:'MARKET_SESSION_NOT_OPEN',remaining:null};
  if (!allocated.merchantPhysicalCountVerified || !allocated.separatelyAllocatedFromOtherChannels)
    return {ok:false,reason:'MARKET_ALLOCATION_NOT_ISOLATED',remaining:null};
  if (allocated.paymentCertification!=='verified')
    return {ok:false,reason:'SQUARE_PAYMENT_CERTIFICATION_REQUIRED',remaining:null};
  if (square.slug!==allocated.slug||square.status!=='found'||
      square.countStatus!=='reported'||square.variationId!==allocated.squareVariationId||
      !Number.isSafeInteger(square.onHand)||Number(square.onHand)<0)
    return {ok:false,reason:'SQUARE_VARIATION_COUNT_UNVERIFIED',remaining:null};
  if (!(allocated.merchantApprovedAt instanceof Date) ||
      !(allocated.squareObservedAt instanceof Date) ||
      now.getTime()-allocated.squareObservedAt.getTime()>120_000 ||
      now.getTime()-allocated.merchantApprovedAt.getTime()>8*60*60_000 ||
      allocated.squareObservedAt.getTime()>now.getTime()+30_000)
    return {ok:false,reason:'STOCK_CERTIFICATION_STALE',remaining:null};
  for(const amount of [allocated.approvedUnits,allocated.heldUnits,allocated.soldUnits]) {
    if(!Number.isSafeInteger(amount)||amount<0)
      return {ok:false,reason:'INVALID_MARKET_STOCK_LEDGER',remaining:null};
  }
  if (Number(square.onHand)<allocated.approvedUnits-allocated.soldUnits)
    return {ok:false,reason:'MARKET_SQUARE_COUNTS_DIVERGED',remaining:null};
  const remaining=allocated.approvedUnits-allocated.heldUnits-allocated.soldUnits;
  if(!Number.isSafeInteger(requested)||requested<1||remaining<requested)
    return {ok:false,reason:'MARKET_STOCK_NOT_AVAILABLE',remaining:Math.max(0,remaining)};
  return {ok:true,reason:'VERIFIED',remaining};
}

/**
 * Atomic across multiple SKU rows in replica-set MongoDB. Must be invoked
 * ONLY after a fresh Square stock reread and verified checkout release gate.
 * All reservations begin unpaid and expire; payment must use independently
 * verified Square evidence before commit.
 */
export async function reserveMarketItems({
  db, client, marketId, serviceDate, items, requestId, squareRows, now=new Date(),
}:{
  db:any;client:any;marketId:string;serviceDate:string;items:MarketItemRequest[];
  requestId:string;squareRows:SquareStockEvidence[];now?:Date;
}) {
  if (process.env.MARKET_QR_CHECKOUT_RELEASE_CERTIFIED!=='true') {
    throw new Error('MARKET_CHECKOUT_NOT_CERTIFIED');
  }
  if(resolveMarketQrId(marketId)!==marketId||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(serviceDate))
    throw new Error('MARKET_SESSION_INVALID');
  if (!Array.isArray(items)||!items.length||items.length>20 ||
    new Set(items.map(x=>x.slug)).size!==items.length)
    throw new Error('MARKET_ITEMS_INVALID');
  const requestHash=createHash('sha256').update(JSON.stringify({marketId,serviceDate,items})).digest('hex');
  if(!/^[a-f0-9-]{36}$/i.test(requestId))throw new Error('REQUEST_ID_INVALID');
  const holdId='market_hold_'+createHash('sha256').update(requestId).digest('hex');
  const session=client.startSession();
  try {
    let receipt:any;
    await session.withTransaction(async()=>{
      const holds=db.collection('market_reservations');
      const previous=await holds.findOne({_id:holdId},{session});
      if(previous) {
        if(previous.requestHash!==requestHash)throw new Error('MARKET_IDEMPOTENCY_CONFLICT');
        receipt=previous;return;
      }
      const stock=db.collection('market_stock_allocations');
      for(const line of items) {
        const allocationId=`${marketId}:${serviceDate}:${line.slug}`;
        const row=await stock.findOne({_id:allocationId},{session});
        const square=squareRows.find(item=>item.slug===line.slug);
        const ready=stockAdmission(row,square,line.quantity,now);
        if(!ready.ok)throw new Error(ready.reason);
        // One atomic row update plus Mongo transaction for multi-product carts.
        const updated=await stock.updateOne({
          _id:allocationId,
          sessionStatus:'open',
          paymentCertification:'verified',
          squareVariationId:square!.variationId,
          heldUnits:row.heldUnits,
          soldUnits:row.soldUnits,
          approvedUnits:row.approvedUnits,
        },{$inc:{heldUnits:line.quantity}},{session});
        if(updated.modifiedCount!==1)throw new Error('MARKET_STOCK_RESERVATION_RACE');
      }
      receipt={
        _id:holdId,requestHash,marketId,serviceDate,items,
        status:'held',paymentStatus:'not_charged',
        expiresAt:new Date(now.getTime()+8*60_000),
        createdAt:now,
      };
      await holds.insertOne(receipt,{session});
    });
    return receipt;
  }finally {await session.endSession();}
}

export async function releaseMarketHold({db,client,holdId}:{
  db:any;client:any;holdId:string;
}) {
  const session=client.startSession();
  try {
    let result=false;
    await session.withTransaction(async()=>{
      const holds=db.collection('market_reservations');
      const hold=await holds.findOne({_id:holdId},{session});
      if(!hold||hold.status!=='held')return;
      const updated=await holds.updateOne({_id:holdId,status:'held'},{
        $set:{status:'released',releasedAt:new Date()},
      },{session});
      if(updated.modifiedCount!==1)return;
      for(const line of hold.items) {
        const id=`${hold.marketId}:${hold.serviceDate}:${line.slug}`;
        const stock=await db.collection('market_stock_allocations').updateOne({
          _id:id,heldUnits:{$gte:line.quantity},
        },{$inc:{heldUnits:-line.quantity}},{session});
        if(stock.modifiedCount!==1)throw new Error('MARKET_STOCK_RELEASE_FAILED');
      }
      result=true;
    });
    return result;
  }finally {await session.endSession();}
}
