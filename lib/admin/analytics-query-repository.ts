import 'server-only';
import { getTursoConnection } from '@/lib/db/turso';

type AnalyticsType = 'sales'|'orders'|'customers'|'products'|'revenue';
type GroupBy = 'day'|'week'|'month';
const dollars=(value:unknown)=>Number(value??0)/100;
const period={day:"substr(created_at,1,10)",week:"strftime('%Y-W%W',created_at)",month:"substr(created_at,1,7)"} as const;

export async function queryAdminAnalytics(type:AnalyticsType,start:Date,end:Date,groupBy:GroupBy,limit:number){
  const db=getTursoConnection(), from=start.toISOString(), to=end.toISOString(), bucket=period[groupBy];
  if(type==='sales'||type==='revenue'){
    const rows=await db.all(`SELECT ${bucket} AS period,count(*) AS orders,sum(total_cents) AS cents,avg(total_cents) AS average_cents FROM orders WHERE created_at>=? AND created_at<=? AND status NOT IN ('cancelled','refunded') GROUP BY period ORDER BY period LIMIT ?`,from,to,limit);
    if(type==='sales') return rows.map(r=>({_id:r.period,sales:dollars(r.cents),orders:Number(r.orders),averageOrderValue:dollars(r.average_cents)}));
    const summary=await db.get(`SELECT sum(total_cents) AS cents,count(*) AS orders,avg(total_cents) AS average_cents,min(total_cents) AS min_cents,max(total_cents) AS max_cents FROM orders WHERE created_at>=? AND created_at<=? AND status NOT IN ('cancelled','refunded')`,from,to);
    return {byPeriod:rows.map(r=>({_id:r.period,revenue:dollars(r.cents),orders:Number(r.orders)})),summary:Number(summary?.orders??0)?{_id:null,totalRevenue:dollars(summary?.cents),totalOrders:Number(summary?.orders),averageOrder:dollars(summary?.average_cents),minOrder:dollars(summary?.min_cents),maxOrder:dollars(summary?.max_cents)}:null};
  }
  if(type==='orders'){
    const byStatus=await db.all(`SELECT status AS _id,count(*) AS count,sum(total_cents) AS cents FROM orders WHERE created_at>=? AND created_at<=? GROUP BY status ORDER BY count DESC LIMIT ?`,from,to,limit);
    const byFulfillment=await db.all(`SELECT COALESCE(json_extract(fulfillment_json,'$.type'),'unknown') AS _id,count(*) AS count FROM orders WHERE created_at>=? AND created_at<=? GROUP BY _id`,from,to);
    return {byStatus:byStatus.map(r=>({_id:r._id,count:Number(r.count),total:dollars(r.cents)})),byFulfillment};
  }
  if(type==='customers'){
    const counts=await db.get(`SELECT (SELECT count(*) FROM customers WHERE created_at>=? AND created_at<=?) AS new_customers,(SELECT count(DISTINCT customer_id) FROM orders WHERE created_at>=? AND created_at<=? AND customer_id IS NOT NULL) AS active_customers`,from,to,from,to);
    const byRewards=await db.all(`SELECT CASE WHEN points>=1000 THEN 'gold' WHEN points>=500 THEN 'silver' ELSE 'bronze' END AS _id,count(*) AS count FROM reward_accounts GROUP BY _id LIMIT ?`,limit);
    return {newCustomers:Number(counts?.new_customers??0),activeCustomers:Number(counts?.active_customers??0),byRewards};
  }
  const products=await db.all(`SELECT COALESCE(order_items.product_id,order_items.external_catalog_id) AS _id,order_items.name_snapshot AS name,sum(order_items.quantity) AS quantity,sum(COALESCE(order_items.total_cents,order_items.quantity*order_items.unit_price_cents,0)) AS cents FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.created_at>=? AND orders.created_at<=? AND orders.status NOT IN ('cancelled','refunded') GROUP BY _id,name ORDER BY quantity DESC LIMIT ?`,from,to,limit);
  return products.map(r=>({_id:r._id,name:r.name,quantity:Number(r.quantity),revenue:dollars(r.cents)}));
}
