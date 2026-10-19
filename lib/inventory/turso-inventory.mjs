/** Staff stock ledger. Caller authenticates/authorizes before opening Turso. */
import {randomUUID} from 'node:crypto';
import {getTursoVerifiedAdminSession} from '../auth/turso-admin-session.mjs';

export class TursoInventoryError extends Error {
  constructor(code,status=409) { super(code); this.name='TursoInventoryError'; this.code=code; this.status=status; }
}
const reject=(code,status)=>{throw new TursoInventoryError(code,status)};
const text=(v,max=200)=>typeof v==='string' && v.length>0 && v.length<=max && v.trim()===v;
const changes=result=>{
  if(!Number.isSafeInteger(result?.changes)||result.changes<0)
    reject('INVENTORY_WRITE_CONFIRMATION_MISSING',503);
  return result.changes;
};
const fields='i.product_id,i.current_stock,i.low_stock_threshold,i.active,i.source,i.updated_at,i.version,'+
  'p.name,p.square_catalog_id,p.metadata_json';

export function projectTursoInventory(row) {
  if(!row)return null;
  if(!text(row.product_id)||!Number.isSafeInteger(row.current_stock)||
     !Number.isSafeInteger(row.low_stock_threshold)||row.low_stock_threshold<0 ||
     !Number.isSafeInteger(row.version)||row.version<0 || ![0,1].includes(row.active))
    reject('INVENTORY_ROW_INVALID',503);
  let metadata={};
  if(row.metadata_json!=null) {
    try {metadata=JSON.parse(row.metadata_json)}catch{reject('INVENTORY_PRODUCT_METADATA_INVALID',503)}
    if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))
      reject('INVENTORY_PRODUCT_METADATA_INVALID',503);
  }
  const image=(Array.isArray(metadata.images)?metadata.images[0]:null)||metadata.image;
  return {
    id:row.product_id,productId:row.product_id,name:row.name,productName:row.name,
    squareId:row.square_catalog_id,stock:row.current_stock,currentStock:row.current_stock,
    lowStockThreshold:row.low_stock_threshold,version:row.version,
    isActive:row.active===1,source:row.source,updatedAt:row.updated_at,
    inStock:row.active===1 && row.current_stock>0,
    stockStatus:row.current_stock<0?'requires_reconciliation':row.current_stock===0?
      'out_of_stock':row.current_stock<=row.low_stock_threshold?'low_stock':'in_stock',
    // A historical negative balance remains visible and is never changed by a read.
    requiresReconciliation:row.current_stock<0,
    image:typeof image==='string'?image:'/images/sea-moss-default.svg',
    subtitle:typeof metadata.category==='string'?metadata.category:'',
  };
}
export async function getTursoInventory(db,productId) {
  if(!text(productId))reject('INVENTORY_PRODUCT_ID_INVALID',400);
  return projectTursoInventory(await db.get('SELECT '+fields+
    ' FROM inventory i JOIN products p ON p.id=i.product_id WHERE i.product_id=?',productId));
}
export async function listTursoInventory(db) {
  const rows=await db.all('SELECT '+fields+' FROM inventory i JOIN products p ON p.id=i.product_id ORDER BY p.name,i.product_id');
  if(!Array.isArray(rows))reject('INVENTORY_RESULT_INVALID',503);
  return rows.map(projectTursoInventory);
}
function projectAdjustment(row,replayed) {
  return {success:true,newStock:row.resulting_stock,previousStock:row.previous_stock,
    adjustment:row.adjustment,version:row.result_version,eventId:row.event_id,
    replayed};
}
export async function adjustTursoInventory(db,{productId,adjustment,reason,actorId,expectedVersion,requestKey,claim}={}) {
  if(!text(productId)||!text(actorId)||!text(requestKey,120)||
     !/^[A-Za-z0-9:_-]{12,120}$/.test(requestKey) ||
     !Number.isSafeInteger(adjustment)||adjustment===0||Math.abs(adjustment)>10000 ||
     !Number.isSafeInteger(expectedVersion)||expectedVersion<0 ||
     !text(reason,500))reject('INVENTORY_ADJUSTMENT_INVALID',400);
  if(typeof db?.transactionAsync!=='function')reject('INVENTORY_TRANSACTION_REQUIRED',503);
  const work=db.transactionAsync(async tx=>{
    const currentAdmin=await getTursoVerifiedAdminSession(tx,claim);
    if(!currentAdmin||currentAdmin.id!==actorId)reject('INVENTORY_ADMIN_ACCESS_REVOKED',401);
    const prior=await tx.get('SELECT * FROM inventory_staff_adjustments WHERE request_key=?',requestKey);
    if(prior) {
      if(prior.product_id!==productId || prior.actor_id!==actorId || prior.adjustment!==adjustment ||
         prior.expected_version!==expectedVersion || prior.reason!==reason)
        reject('INVENTORY_IDEMPOTENCY_CONFLICT');
      return projectAdjustment(prior,true);
    }
    const current=await getTursoInventory(tx,productId);
    if(!current)reject('INVENTORY_NOT_FOUND',404);
    if(current.version!==expectedVersion)reject('INVENTORY_CONCURRENT_MODIFICATION');
    if(!current.isActive)reject('INVENTORY_INACTIVE');
    const stock=current.currentStock+adjustment;
    if(!Number.isSafeInteger(stock)||stock<0)reject('INVENTORY_INSUFFICIENT_STOCK');
    if(!Number.isSafeInteger(current.version+1))reject('INVENTORY_VERSION_EXHAUSTED',503);
    const at=new Date().toISOString();
    if(changes(await tx.run('UPDATE inventory SET current_stock=current_stock+?,version=version+1,updated_at=? '+
      'WHERE product_id=? AND active=1 AND version=? AND current_stock=? AND current_stock+?>=0',
      adjustment,at,productId,expectedVersion,current.currentStock,adjustment))!==1)
      reject('INVENTORY_CONCURRENT_MODIFICATION');
    const eventId=randomUUID();
    if(changes(await tx.run('INSERT INTO inventory_events (id,product_id,event_type,adjustment,created_at,metadata_json) VALUES (?,?,?,?,?,?)',
      eventId,productId,'staff_adjustment',adjustment,at,JSON.stringify({actorId,reason,requestKey,
        previousStock:current.currentStock,newStock:stock,expectedVersion,version:expectedVersion+1})))!==1)
      reject('INVENTORY_AUDIT_NOT_CONFIRMED',503);
    const recorded={request_key:requestKey,actor_id:actorId,product_id:productId,adjustment,
      expected_version:expectedVersion,previous_stock:current.currentStock,resulting_stock:stock,
      result_version:expectedVersion+1,reason,event_id:eventId,created_at:at};
    const keys=Object.keys(recorded);
    if(changes(await tx.run('INSERT INTO inventory_staff_adjustments ('+keys.join(',')+') VALUES ('+
      keys.map(()=>'?').join(',')+')',...keys.map(k=>recorded[k])))!==1)
      reject('INVENTORY_IDEMPOTENCY_NOT_CONFIRMED',503);
    return projectAdjustment(recorded,false);
  });
  if(typeof work?.immediate!=='function')reject('INVENTORY_IMMEDIATE_TRANSACTION_REQUIRED',503);
  return work.immediate();
}

export async function applyTursoInventorySnapshot(db,products) {
  if(!Array.isArray(products))reject('INVENTORY_PRODUCTS_INVALID',400);
  if(!products.length)return [];
  const ids=[...new Set(products.map(p=>p.id))];
  if(ids.some(id=>!text(id))||ids.length>1000)reject('INVENTORY_PRODUCTS_INVALID',400);
  const rows=await db.all('SELECT '+fields+' FROM inventory i JOIN products p ON p.id=i.product_id '+
    'WHERE i.product_id IN ('+ids.map(()=>'?').join(',')+')',...ids);
  const byId=new Map(rows.map(row=>{const item=projectTursoInventory(row);return [item.id,item]}));
  return products.map(product=>{
    const item=byId.get(product.id);
    if(!item)return {...product,stock:null,currentStock:null,inStock:false,availability:'unknown',
      purchaseStatus:'unknown',checkoutReady:false,isPreorder:false,
      checkoutUnavailableReason:'Stock has not been confirmed.'};
    const available=item.isActive && item.currentStock>0;
    return {...product,stock:item.currentStock,currentStock:item.currentStock,
      lowStockThreshold:item.lowStockThreshold,inStock:available,
      availability:available?'in_stock':item.currentStock<0?'requires_reconciliation':'out_of_stock',
      purchaseStatus:available?'in_stock':'out_of_stock',isPreorder:false,
      checkoutReady:product.checkoutReady===true && available,
      ...(available?{}:{checkoutUnavailableReason:'Available stock has not been confirmed.'})};
  });
}
export async function checkTursoInventoryForPayment(db,items) {
  if(!Array.isArray(items)||!items.length||items.length>100)return {valid:false,code:'INVALID_ORDER_ITEMS'};
  const quantities=new Map();
  for(const item of items) {
    const productId=item?.id||item?.productId||item?.squareId;
    if(!text(productId)||!Number.isSafeInteger(item.quantity)||item.quantity<1)
      return {valid:false,code:'INVALID_ORDER_ITEMS'};
    const quantity=(quantities.get(productId)||0)+item.quantity;
    if(!Number.isSafeInteger(quantity))return {valid:false,code:'INVALID_ORDER_ITEMS'};
    quantities.set(productId,quantity);
  }
  for(const [id,quantity] of quantities) {
    const row=await getTursoInventory(db,id);
    if(!row?.isActive||row.currentStock<quantity)
      return {valid:false,code:'INVENTORY_UNAVAILABLE',productId:id};
  }
  // Read admission only. Atomic checkout reservation is still mandatory.
  return {valid:true};
}
