import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { withAdminMiddleware } from '@/lib/middleware/admin';
import { PERMISSIONS } from '@/lib/security';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
const fail=(code:string,status=422)=>NextResponse.json({success:false,code}, {status,headers});

/**
 * Merchant queue of genuine uncharged multi-item website requests.
 * Only authorized admins may see customer contact details. No button in this
 * API can mark an order paid: Square payment webhooks remain authoritative.
 */
export const GET=withAdminMiddleware(async()=>{
  try{
    const {db}=await connectToDatabase();
    const rows=await db.collection('nonmarket_order_requests')
      .find({status:{$in:['awaiting_merchant_review','contacting_customer','awaiting_customer_changes','declined']}},
        {projection:{requestHash:0}})
      .sort({createdAt:-1}).limit(75).toArray();
    return NextResponse.json({success:true,requests:rows,count:rows.length}, {headers});
  }catch{return fail('REQUEST_QUEUE_UNAVAILABLE',503);}
},{permission:PERMISSIONS.ORDERS_VIEW,resource:'nonmarket_order_requests',action:'view'});

export const PATCH=withAdminMiddleware(async(request)=>{
  let body:any;
  try{body=await request.json();}catch{return fail('INVALID_JSON',400);}
  const id=typeof body?.requestId==='string'?body.requestId:'';
  const status=typeof body?.status==='string'?body.status:'';
  if(!/^nonmarket_order_request_[a-f0-9]{64}$/.test(id))return fail('INVALID_REQUEST_ID');
  const allowed=['contacting_customer','awaiting_customer_changes','declined'];
  if(!allowed.includes(status))return fail('STATUS_REQUIRES_PAYMENT_VERIFICATION');
  try{
    const {db}=await connectToDatabase();
    const previous=await db.collection('nonmarket_order_requests').findOne({_id:id});
    if(!previous)return fail('REQUEST_NOT_FOUND',404);
    if(previous.paymentStatus!=='not_charged'||previous.capacityReserved!==false)
      return fail('PAYMENT_STATE_NOT_EDITABLE',409);
    if(previous.status==='declined'&&status!=='declined')
      return fail('DECLINED_REQUEST_IS_FINAL',409);
    await db.collection('nonmarket_order_requests').updateOne({
      _id:id,paymentStatus:'not_charged',capacityReserved:false,
    },{
      $set:{status,lastMerchantActionAt:new Date(),lastMerchantActor:request.admin.email},
    });
    return NextResponse.json({success:true,requestId:id,status,paymentStatus:'not_charged'}, {headers});
  }catch{return fail('REQUEST_UPDATE_UNAVAILABLE',503);}
},{permission:PERMISSIONS.ORDERS_UPDATE_STATUS,resource:'nonmarket_order_requests',action:'update'});
