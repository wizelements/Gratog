import 'server-only';
import { randomUUID } from 'crypto';
import { getTursoConnection } from '@/lib/db/turso';

type SqlExecutor = Pick<ReturnType<typeof getTursoConnection>, 'all' | 'transaction'>;
type OrderRow = { id:string; order_number:string|null; market_id:string|null; customer_snapshot_json:string|null; fulfillment_json:string|null; status:string; payment_status:string|null; subtotal_cents:number|null; total_cents:number; amount_paid_cents:number|null; balance_due_cents:number|null; created_at:string; updated_at:string };
const PAYMENT_FIELDS: Record<string,string> = { paymentStatus:'payment_status', amountPaid:'amount_paid_cents', balanceDue:'balance_due_cents', squareOrderId:'square_order_id' };
const SELECT_ORDER = `SELECT id, order_number, market_id, customer_snapshot_json, fulfillment_json, status, payment_status, subtotal_cents, total_cents, amount_paid_cents, balance_due_cents, created_at, updated_at FROM orders`;
const json = (value:unknown) => value == null ? null : JSON.stringify(value);
function parse(value:string|null):Record<string,any> { if (!value) return {}; try { return JSON.parse(value); } catch { return {}; } }

function mapOrder(row:OrderRow, items:any[]=[]) {
  const customer=parse(row.customer_snapshot_json); const fulfillment=parse(row.fulfillment_json);
  return { _id:row.id,id:row.id,orderNumber:row.order_number,waitlistNumber:fulfillment.waitlistNumber??null,marketId:row.market_id,
    customerName:customer.name??null,customerEmail:customer.email??null,customerPhone:customer.phone??null,
    pickupLocation:fulfillment.pickupLocation??fulfillment.marketName??null,marketName:fulfillment.marketName??fulfillment.pickupLocation??null,
    pickupDate:fulfillment.pickupDate??null,pickupDay:fulfillment.pickupDay??null,pickupHours:fulfillment.pickupHours??null,
    queuePosition:fulfillment.queuePosition??fulfillment.waitlistPosition??null,confirmationStatus:fulfillment.confirmationStatus??'pending',
    paymentUrl:fulfillment.paymentUrl??null,paymentMethod:fulfillment.paymentMethod??null,paymentProvider:fulfillment.paymentProvider??null,
    items,subtotal:row.subtotal_cents,total:row.total_cents,status:row.status,paymentStatus:row.payment_status,
    amountPaid:row.amount_paid_cents,balanceDue:row.balance_due_cents,createdAt:row.created_at,updatedAt:row.updated_at };
}

async function hydrate(row:OrderRow|undefined, executor:SqlExecutor) {
  if (!row) return null;
  const items=await executor.all(`SELECT id, name_snapshot AS name, quantity, unit_price_cents AS priceCents, total_cents AS totalCents, external_catalog_id AS productId, metadata_json FROM order_items WHERE order_id = ? ORDER BY position`,row.id) as any[];
  return mapOrder(row,items.map(({metadata_json,...item})=>({...item,...parse(metadata_json)})));
}

export async function getNextWaitlistNumber(marketId:string,prefix:string,date:Date,executor:SqlExecutor=getTursoConnection()) {
  const key=`preorder:${marketId}:${date.toISOString().split('T')[0]}`;
  const result=await executor.transaction(async(tx:any)=>{ await tx.run(`INSERT INTO runtime_counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1`,key); return tx.get('SELECT value FROM runtime_counters WHERE name = ?',key); });
  const counter=Number((result as any).value);
  return {waitlistNumber:`${prefix}-${date.getDate().toString().padStart(2,'0')}${counter.toString().padStart(2,'0')}`,counter};
}

export async function createPreorder(order:Record<string,any>,executor:SqlExecutor=getTursoConnection()) {
  const id=String(order._id??order.id??order.orderNumber??randomUUID()); const now=new Date().toISOString(); const items=Array.isArray(order.items)?order.items:[]; const confirmationStatus=order.confirmationStatus||'pending';
  const customer=order.customer??{name:order.customerName,email:order.customerEmail,phone:order.customerPhone};
  const fulfillment={...(order.fulfillment??{}),waitlistNumber:order.waitlistNumber,pickupLocation:order.pickupLocation,marketName:order.marketName,pickupDate:order.pickupDate,pickupDay:order.pickupDay,pickupHours:order.pickupHours,queuePosition:order.queuePosition,confirmationStatus,paymentUrl:order.paymentUrl,paymentMethod:order.paymentMethod,paymentProvider:order.paymentProvider};
  await executor.transaction(async(tx:any)=>{
    await tx.run(`INSERT INTO orders (id, source_collection, order_number, square_order_id, customer_id, market_id, customer_snapshot_json, fulfillment_json, status, payment_status, subtotal_cents, tax_cents, total_cents, amount_paid_cents, balance_due_cents, currency, created_at, updated_at) VALUES (?, 'marketorders', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,id,order.orderNumber??id,order.squareOrderId??null,order.customerId??null,order.marketId??null,json(customer),json(fulfillment),order.status??'PENDING_CONFIRMATION',order.paymentStatus??'PENDING',order.subtotalCents??order.subtotal??0,order.taxCents??order.tax??0,order.totalCents??order.total??0,order.amountPaid??0,order.balanceDue??order.totalCents??order.total??0,order.currency??'USD',now,now);
    for(let position=0;position<items.length;position+=1){const item=items[position];await tx.run(`INSERT INTO order_items (id, order_id, product_id, variation_id, external_catalog_id, name_snapshot, quantity, unit_price_cents, total_cents, position, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,String(item.id??`${id}:${position}`),id,item.productId??null,item.variationId??null,item.catalogObjectId??item.productId??null,String(item.name??'Item'),Number(item.quantity??1),item.priceCents??item.price??null,item.totalCents??null,position,json(item));}
  });
  return {...order,id,_id:id,confirmationStatus,createdAt:now,updatedAt:now};
}

async function findBy(clause:string,value:string,executor:SqlExecutor){const rows=await executor.all(`${SELECT_ORDER} WHERE source_collection = 'marketorders' AND ${clause} LIMIT 1`,value) as OrderRow[];return hydrate(rows[0],executor);}
export const findPreorderByOrderNumber=(value:string,executor:SqlExecutor=getTursoConnection())=>findBy('order_number = ?',value,executor);
export const findPreorderByWaitlistNumber=(value:string,executor:SqlExecutor=getTursoConnection())=>findBy("json_extract(fulfillment_json, '$.waitlistNumber') = ?",value,executor);
export const findPreorder=findPreorderByOrderNumber;
export async function findPreorderByPhone(phone:string,executor:SqlExecutor=getTursoConnection()){const rows=await executor.all(`${SELECT_ORDER} WHERE source_collection = 'marketorders' AND json_extract(customer_snapshot_json, '$.phone') = ? ORDER BY created_at DESC LIMIT 1`,phone) as OrderRow[];return hydrate(rows[0],executor);}

async function updateOrder(orderNumber:string,assignments:string[],values:unknown[],executor:SqlExecutor){if(assignments.length===0)return findPreorderByOrderNumber(orderNumber,executor);await executor.all(`UPDATE orders SET ${assignments.join(', ')}, updated_at = ? WHERE source_collection = 'marketorders' AND order_number = ?`,...values,new Date().toISOString(),orderNumber);return findPreorderByOrderNumber(orderNumber,executor);}
export const updatePreorderStatus=(orderNumber:string,status:string,executor:SqlExecutor=getTursoConnection())=>updateOrder(orderNumber,['status = ?'],[status],executor);
export function updatePreorderPaymentFields(orderNumber:string,fields:Record<string,any>,executor:SqlExecutor=getTursoConnection()){const entries=Object.entries(fields).filter(([key])=>PAYMENT_FIELDS[key]);return updateOrder(orderNumber,entries.map(([key])=>`${PAYMENT_FIELDS[key]} = ?`),entries.map(([,value])=>value),executor);}
export async function updateConfirmationStatus(orderNumber:string,confirmationStatus:string,executor:SqlExecutor=getTursoConnection()){const rows=await executor.all(`${SELECT_ORDER} WHERE source_collection = 'marketorders' AND order_number = ? LIMIT 1`,orderNumber) as OrderRow[];if(!rows[0])return null;return updateOrder(orderNumber,['fulfillment_json = ?'],[json({...parse(rows[0].fulfillment_json),confirmationStatus})],executor);}

export async function findOrdersNeedingReminder(marketDayName?:string,executor:SqlExecutor=getTursoConnection()){
  const args:unknown[]=[];let dayFilter='';if(marketDayName){dayFilter=" AND json_extract(fulfillment_json, '$.pickupDay') = ?";args.push(marketDayName);}
  const rows=await executor.all(`${SELECT_ORDER} WHERE source_collection = 'marketorders' AND status NOT IN ('CANCELLED','REFUNDED','PICKED_UP','FULFILLED') AND coalesce(json_extract(fulfillment_json, '$.confirmationStatus'), 'pending') NOT IN ('reminder_sent','confirmed','cancelled') AND coalesce(json_extract(customer_snapshot_json, '$.email'), '') <> ''${dayFilter} ORDER BY created_at DESC`,...args) as OrderRow[];
  const results=[];for(const row of rows)results.push(await hydrate(row,executor));return results;
}
