import { getTursoConnection } from '@/lib/db/turso';
import { randomUUID } from 'node:crypto';

export type InventorySnapshot = {
  productId: string;
  currentStock: number;
  lowStockThreshold: number;
};

const READ_BATCH_SIZE = 100;

/**
 * Reads inventory by the canonical product IDs produced by the Square/unified
 * catalog projection. IDs are treated as opaque strings; they are never
 * regenerated or interpreted as Mongo ObjectIds.
 */
export async function getInventorySnapshots(
  productIds: string[],
): Promise<Map<string, InventorySnapshot>> {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const snapshots = new Map<string, InventorySnapshot>();
  const db = getTursoConnection();

  for (let offset = 0; offset < uniqueIds.length; offset += READ_BATCH_SIZE) {
    const batch = uniqueIds.slice(offset, offset + READ_BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT product_id, current_stock, low_stock_threshold
       FROM inventory
       WHERE active = 1 AND product_id IN (${placeholders})`,
      ...batch,
    );

    for (const row of rows) {
      const productId = String(row.product_id);
      snapshots.set(productId, {
        productId,
        currentStock: Number(row.current_stock ?? 0),
        lowStockThreshold: Number(row.low_stock_threshold ?? 0),
      });
    }
  }

  return snapshots;
}

export async function reconcileInventory(products:any[],options:any={}){
  if(!Array.isArray(products))throw new Error('products must be an array');
  const db=getTursoConnection(),ids=products.map(p=>p?.id).filter(Boolean),source=options.source||'square_catalog_sync',now=new Date().toISOString();let pruned=0;
  await db.transactionAsync(async(tx)=>{
    for(const product of products.filter(p=>p?.id)){
      const existing=await tx.get('SELECT current_stock,low_stock_threshold FROM inventory WHERE product_id=? LIMIT 1',product.id);
      const primary=product.variations?.[0]||{};
      const threshold=existing?.low_stock_threshold??primary.inventoryAlertThreshold??Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD||5);
      const variationTotal=(product.variations||[]).some((v:any)=>v.inventoryCount!==undefined)?(product.variations||[]).reduce((sum:number,v:any)=>sum+Number(v.inventoryCount||0),0):undefined;
      const stock=existing?.current_stock??(product.inventoryCount!==undefined?Number(product.inventoryCount):variationTotal)??Number(process.env.DEFAULT_PRODUCT_STOCK||25);
      await tx.run(`INSERT INTO inventory(product_id,current_stock,low_stock_threshold,active,source,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET low_stock_threshold=excluded.low_stock_threshold,active=1,source=excluded.source,updated_at=excluded.updated_at`,product.id,stock,threshold,1,source,now);
      await tx.run('DELETE FROM inventory_variations WHERE product_id=?',product.id);
      for(const variation of product.variations||[])if(variation?.id)await tx.run('INSERT INTO inventory_variations(product_id,variation_id) VALUES(?,?)',product.id,variation.id);
    }
    if(options.pruneMissing!==false){
      const sql=ids.length?`UPDATE inventory SET active=0,updated_at=? WHERE product_id NOT IN (${ids.map(()=>'?').join(',')})`:'UPDATE inventory SET active=0,updated_at=?';
      pruned=Number((await tx.run(sql,now,...ids)).rowsAffected??0);
    }
    if(ids.length||pruned)await tx.run(`INSERT INTO inventory_events(id,event_type,created_at,metadata_json) VALUES(?,?,?,?)`,randomUUID(),'catalog_reconcile',now,JSON.stringify({syncedProducts:ids.length,prunedProducts:pruned,source}));
  });
  return{synced:ids.length,pruned};
}

function normalizedItems(payload:any){return(payload?.items||[]).map((item:any)=>({productId:item?.id||item?.productId||item?.squareId,quantity:Number(item?.quantity||0),name:item?.name||'Unknown product',variationId:item?.variationId||item?.catalogObjectId||null})).filter((item:any)=>item.productId&&item.quantity>0)}
async function mutateForOrder(payload:any,eventType:'order_debit'|'order_credit'){
  const orderId=payload?.orderId,items=normalizedItems(payload);if(!orderId||!items.length)return eventType==='order_debit'?{success:false,debited:0,skipped:false,reason:'missing_order_or_items'}:{success:false,restocked:0,skipped:false,reason:'missing_order_or_items'};
  const db=getTursoConnection(),now=new Date().toISOString();let skipped=false;
  await db.transactionAsync(async(tx)=>{
    const claim=await tx.run(`INSERT OR IGNORE INTO inventory_events(id,order_id,event_type,created_at,metadata_json) VALUES(?,?,?,?,?)`,randomUUID(),orderId,eventType,now,JSON.stringify({orderNumber:payload.orderNumber||orderId,actor:payload.actor||'system',items}));
    if(Number(claim.rowsAffected)===0){skipped=true;return;}
    for(const item of items){
      const delta=eventType==='order_debit'?-item.quantity:item.quantity;
      const result=eventType==='order_debit'
        ?await tx.run('UPDATE inventory SET current_stock=current_stock+?,updated_at=? WHERE product_id=? AND current_stock>=?',delta,now,item.productId,item.quantity)
        :await tx.run(`INSERT INTO inventory(product_id,current_stock,low_stock_threshold,active,source,updated_at) VALUES(?,?,?,1,'order_restock',?) ON CONFLICT(product_id) DO UPDATE SET current_stock=inventory.current_stock+excluded.current_stock,updated_at=excluded.updated_at`,item.productId,item.quantity,Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD||5),now);
      if(Number(result.rowsAffected)!==1)throw new Error(`Insufficient inventory for product ${item.productId}`);
    }
  });
  const key=eventType==='order_debit'?'debited':'restocked';return{success:true,[key]:skipped?0:items.length,skipped,...(skipped?{reason:'already_processed'}:{})};
}
export const debitPaidOrder=(payload:any)=>mutateForOrder(payload,'order_debit');
export const restockCancelledOrder=(payload:any)=>mutateForOrder(payload,'order_credit');
