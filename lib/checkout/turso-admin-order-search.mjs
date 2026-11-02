/** Turso-native, strictly read-only market order search. Call only after
 * requireAdminSession has revalidated the caller against Turso identity. */
const invalid = () => new Error('TURSO_ORDER_SEARCH_RECONCILIATION_REQUIRED');
export async function searchTursoMarketOrders(db,{query,marketId}={}) {
  if(typeof query!=='string'||typeof marketId!=='string'||query.length<3||query.length>80||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(marketId))throw Error('TURSO_ORDER_SEARCH_INVALID');
  const needle=query.toLowerCase();
  const digits=query.replace(/\D/g,'');
  const searchablePhone="replace(replace(replace(replace(replace(coalesce(json_extract(customer_snapshot_json,'$.phone'),''),'-',''),'(',''),')',''),' ',''),'+','')";
  // INSTR takes a literal substring: a buyer-entered % or _ cannot widen
  // the search. Market identity is mandatory and always parameter-bound.
  const rows=await db.all(
    'SELECT id,order_number,status,total_cents,currency,customer_snapshot_json,created_at '+
    'FROM orders WHERE market_id=? AND source_collection=? AND ('+
    'instr(lower(coalesce(order_number,\'\')),?)>0 OR '+
    "instr(lower(coalesce(json_extract(customer_snapshot_json,'$.name'),'')),?)>0"+
    (digits.length>=4&&digits.length<=15?' OR instr('+searchablePhone+',?)>0':'')+
    ') ORDER BY created_at DESC,id DESC LIMIT 10',
    marketId,'marketorders',needle,needle,
    ...(digits.length>=4&&digits.length<=15?[digits]:[])
  );
  if(!Array.isArray(rows)||rows.length>10)throw invalid();
  const result=[];
  for(const row of rows){
    const cents=Number(row.total_cents);
    if(row.currency!=='USD'||row.total_cents==null||!Number.isSafeInteger(cents)||cents<0||
      typeof row.id!=='string'||!row.id||typeof row.created_at!=='string')throw invalid();
    let customer;
    try{customer=JSON.parse(row.customer_snapshot_json)}catch{throw invalid()}
    if(!customer||typeof customer!=='object'||Array.isArray(customer)||
       (customer.name!=null&&typeof customer.name!=='string'))throw invalid();
    const items=await db.all('SELECT name_snapshot,quantity FROM order_items WHERE order_id=? ORDER BY position',row.id);
    if(!Array.isArray(items)||!items.length||items.some(item=>typeof item.name_snapshot!=='string'||
      !item.name_snapshot.trim()||!Number.isSafeInteger(Number(item.quantity))||Number(item.quantity)<1))throw invalid();
    result.push({id:row.id,orderNumber:row.order_number||null,customerName:customer.name||'N/A',
      status:row.status,total:cents/100,items:items.map(item=>({name:item.name_snapshot,quantity:Number(item.quantity)})),
      createdAt:row.created_at});
  }
  return result;
}
