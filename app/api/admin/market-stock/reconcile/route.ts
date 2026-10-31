import { NextResponse } from 'next/server';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import { PERMISSIONS } from '@/lib/security';
import { connectToDatabase } from '@/lib/db-optimized';
import { readApprovedSquareMenuStock } from '@/lib/square-menu-stock';
import { getActiveMarketPickups } from '@/data/markets';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const fail=(code:string,status=422)=>NextResponse.json({success:false,code}, {status,headers});

/**
 * Merchant physical market-count reconciliation. Never changes Square stock,
 * creates a paid order or grants checkout authorization.
 */
export const POST=withAdminMiddleware(async(request)=>{
  let body:any;
  try{body=await request.json();}catch{return fail('INVALID_JSON',400);}
  const marketId=typeof body?.marketId==='string'?body.marketId.trim():'';
  const serviceDate=typeof body?.serviceDate==='string'?body.serviceDate:'';
  const slug=typeof body?.slug==='string'?body.slug.trim():'';
  const approvedUnits=Number(body?.physicallyCountedUnits);
  const market=getActiveMarketPickups().find(m=>m.id===marketId);
  if(!market||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(serviceDate)||
    !Number.isSafeInteger(approvedUnits)||approvedUnits<0||approvedUnits>500 ||
    new Date(serviceDate+'T12:00:00Z').getUTCDay()!==market.dayOfWeek)
    return fail('INVALID_MARKET_COUNT');
  // Require a fresh staff recount confirmation; not historical owner counts.
  if(body.physicalCountConfirmed!==true)return fail('PHYSICAL_RECOUNT_CONFIRMATION_REQUIRED');
  try{
    const square=await readApprovedSquareMenuStock();
    const row=square.report.find(x=>x.slug===slug);
    if(!row||row.status!=='found'||row.countStatus!=='reported'||
      !row.variationId||!Number.isSafeInteger(row.onHand)||row.onHand<approvedUnits)
      return fail('SQUARE_RECONCILIATION_REQUIRED',409);
    const checkedAt=new Date(square.checkedAt);
    if(Date.now()-checkedAt.getTime()>2*60_000)return fail('SQUARE_READBACK_STALE',409);
    const {db}=await connectToDatabase();
    const id=`${marketId}:${serviceDate}:${slug}`;
    const collection=db.collection('market_stock_allocations');
    const other=await collection.aggregate([
      {$match:{serviceDate,slug,_id:{$ne:id}}},
      {$group:{_id:null,units:{$sum:'$approvedUnits'}}},
    ]).toArray();
    if((other[0]?.units||0)+approvedUnits>row.onHand)
      return fail('MARKET_ALLOCATIONS_EXCEED_SQUARE',409);
    const existing=await collection.findOne({_id:id});
    if(existing&&(existing.heldUnits>0||existing.soldUnits>0))
      return fail('MARKET_HAS_COMMITTED_STOCK',409);

    const document={
      marketId,serviceDate,slug,
      squareVariationId:row.variationId,
      squareLocationId:square.locationId,
      approvedUnits,verifiedSquareOnHand:row.onHand,
      merchantPhysicalCountVerified:true,
      merchantApprovedAt:new Date(),
      squareObservedAt:checkedAt,
      // Only a genuinely isolated allocation + independently verified Square
      // payment flow can turn these on at a separate certification gate.
      separatelyAllocatedFromOtherChannels:false,
      paymentCertification:'not_verified',
      sessionStatus:'unpublished',
      priceCents:({
        'calm-waters':1199,supplemint:1199,'gracious-roots':1199,
        'kissed-by-gods':1199,'melon-rita':1199,'passion-guava-pineapple':1199,
        apg:1299,'herbal-vibe':1599,'soursop-chai-gel':3600,
      } as Record<string,number>)[slug],
      approvedBy:request.admin.email,
      lastReconciledAt:new Date(),
    };
    if(!document.priceCents)return fail('PRICE_NOT_APPROVED',409);
    await collection.updateOne({_id:id,heldUnits:0,soldUnits:0},{
      $set:document,
      $setOnInsert:{_id:id,heldUnits:0,soldUnits:0},
    },{upsert:true});
    return NextResponse.json({success:true,slug,marketId,serviceDate,
      physicalCount:approvedUnits,squareCount:row.onHand,
      variationId:row.variationId,checkoutAuthorized:false,
      message:'Market physical count reconciled to Square readback. Digital payment remains locked pending independent certification.'},
      {headers});
  }catch{
    return fail('MARKET_STOCK_RECONCILIATION_UNAVAILABLE',503);
  }
}, {permission:PERMISSIONS.INVENTORY_ADJUST,resource:'market_stock',action:'reconcile'});
