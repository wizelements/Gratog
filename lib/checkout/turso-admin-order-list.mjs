/** Authenticated operator read model for canonical orders. No Mongo calls and
 * no writes. This is not proof of final historical/provider reconciliation. */
const fail=()=>{throw Error('TURSO_ADMIN_ORDERS_RECONCILIATION_REQUIRED')};
const statuses=new Set(['pending','paid','payment_processing','confirmed','preparing','ready',
  'delivered','picked_up','shipped','fulfilled','cancelled','refunded',
  'CONFIRMED','COMPLETED','PENDING_PAYMENT']);
const fulfillmentTypes=new Set(['pickup','pickup_market','pickup_dunwoody','delivery','shipping']);
const money=value=>{if(value==null||!Number.isSafeInteger(Number(value))||Number(value)<0)throw fail();return Number(value)/100};
const parseJson=value=>{if(value==null)return{};let obj;try{obj=JSON.parse(value)}catch{throw fail()}if(!obj||typeof obj!=='object'||Array.isArray(obj))throw fail();return obj};
const normalizedTime=value=>{
  if(typeof value!=='string'||!value.trim())return null;
  const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms).toISOString():null;
};
export async function listTursoAdminOrders(db,filters={}){
  const {page=1,limit=50,status,search,fulfillmentType,startDate,endDate}=filters;
  if(!Number.isSafeInteger(page)||page<1||page>100_000||!Number.isSafeInteger(limit)||limit<1||limit>100||
    (search!=null&&(typeof search!=='string'||search.length>80)))throw Error('TURSO_ADMIN_ORDERS_INVALID_FILTER');
  const offset=(page-1)*limit;
  const where=["o.source_collection='orders'"];
  const args=[];
  if(statuses.has(status)){where.push('o.status=?');args.push(status)}
  if(fulfillmentTypes.has(fulfillmentType)){
    where.push("coalesce(json_extract(o.fulfillment_json,'$.type'),json_extract(o.fulfillment_json,'$.details.type'))=?");
    args.push(fulfillmentType);
  }
  const from=normalizedTime(startDate),to=normalizedTime(endDate);
  if(from){where.push('o.created_at>=?');args.push(from)}
  if(to){where.push('o.created_at<=?');args.push(to)}
  if(search){where.push("(instr(lower(coalesce(o.order_number,'')),?)>0 OR "+
    "instr(lower(coalesce(json_extract(o.customer_snapshot_json,'$.name'),'')),?)>0 OR "+
    "instr(lower(coalesce(json_extract(o.customer_snapshot_json,'$.email'),'')),?)>0)");
    args.push(search.toLowerCase(),search.toLowerCase(),search.toLowerCase());
  }
  const clause=where.join(' AND ');
  const totals=await db.get('SELECT COUNT(*) AS total FROM orders o WHERE '+clause,...args);
  const total=Number(totals?.total);
  if(!Number.isSafeInteger(total)||total<0)throw fail();
  const rows=await db.all('SELECT o.id,o.order_number,o.square_order_id,o.customer_snapshot_json,'+
    'o.fulfillment_json,o.legacy_snapshot_json,o.status,o.payment_status,o.total_cents,o.currency,'+
    'o.created_at,o.updated_at FROM orders o WHERE '+clause+' ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?',
    ...args,limit,offset);
  if(!Array.isArray(rows)||rows.length>limit)throw fail();
  const orders=[];
  for(const row of rows){
    if(!row.id||row.currency!=='USD'||typeof row.created_at!=='string')throw fail();
    const customer=parseJson(row.customer_snapshot_json);
    const legacy=parseJson(row.legacy_snapshot_json);
    const fulfillment=parseJson(row.fulfillment_json);
    const lines=await db.all('SELECT name_snapshot,quantity FROM order_items WHERE order_id=? ORDER BY position',row.id);
    if(!Array.isArray(lines)||!lines.length||lines.some(line=>typeof line.name_snapshot!=='string'||
      !line.name_snapshot.trim()||!Number.isSafeInteger(Number(line.quantity))||Number(line.quantity)<1))throw fail();
    const totalAmount=money(row.total_cents);
    const declared=typeof legacy.fulfillmentType==='string'?legacy.fulfillmentType:
      typeof fulfillment.type==='string'?fulfillment.type:null;
    orders.push({
      _id:row.id,id:row.id,orderNumber:row.order_number,status:row.status,
      paymentStatus:row.payment_status,fulfillmentType:declared,
      customerName:customer.name||'N/A',customerEmail:customer.email||'',customerPhone:customer.phone||'',
      total:totalAmount,items:lines.map(line=>({name:line.name_snapshot,quantity:Number(line.quantity),isPreorder:false})),
      pickup:legacy.pickup||null,pickupDate:legacy.pickupDate||null,
      deliveryAddress:legacy.deliveryAddress||null,
      orderTiming:legacy.orderTiming||null,deliveryTimeSlot:legacy.deliveryTimeSlot||null,
      emailSentAt:legacy.emailSentAt||null,emailFailedAt:legacy.emailFailedAt||null,
      staffNotifiedAt:legacy.staffNotifiedAt||null,staffNotificationStatus:legacy.staffNotificationStatus||null,
      queuePosition:legacy.queuePosition||null,fulfillmentNotes:legacy.fulfillmentNotes||legacy.notes||null,
      paidAt:legacy.paidAt||null,firstPaidAt:legacy.firstPaidAt||null,
      createdAt:row.created_at,updatedAt:row.updated_at,squareOrderId:row.square_order_id||null,
    });
  }
  // Financial metric derives from the local capture/refund ledger, NOT from
  // unpaid cart/order totals. External Square readback remains a release gate.
  const stats=await db.get("SELECT COUNT(*) AS total_orders,"+
    "SUM(CASE WHEN status IN ('pending','confirmed','preparing') THEN 1 ELSE 0 END) AS pending_orders,"+
    'SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS today_orders '+
    "FROM orders WHERE source_collection='orders'",new Date().toISOString().slice(0,10));
  const ledger=await db.get("SELECT COALESCE(SUM(p.amount_cents),0) AS cents FROM payments p "+
    "JOIN orders o ON o.id=p.order_id WHERE o.source_collection='orders' AND p.status='COMPLETED'");
  const refunds=await db.get("SELECT COALESCE(SUM(r.amount_cents),0) AS cents FROM square_refund_entries r "+
    "JOIN orders o ON o.id=r.order_id WHERE o.source_collection='orders'");
  if(!stats||money(ledger?.cents)<money(refunds?.cents))throw fail();
  const expectedTotal=Number(stats.total_orders);
  if(!Number.isSafeInteger(expectedTotal)||expectedTotal<0)throw fail();
  return {success:true,orders,pagination:{page,limit,total,pages:Math.ceil(total/limit)},
    stats:{totalRevenue:(Number(ledger.cents)-Number(refunds.cents))/100,
      totalOrders:expectedTotal,pendingOrders:Number(stats.pending_orders||0),todayOrders:Number(stats.today_orders||0),
      revenueEvidence:'local_payment_and_refund_ledger_only',providerReconciliationCertified:false}};
}
