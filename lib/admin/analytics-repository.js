import { getTursoConnection } from '@/lib/db/turso';

const paidStatuses = "('completed','fulfilled','paid')";
const dollars = (cents) => Number(cents ?? 0) / 100;

function json(value) {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
}

export async function getDashboardAnalytics(now = new Date()) {
  const db = getTursoConnection();
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();
  const counts = await db.get(`SELECT
    (SELECT count(*) FROM operational_records WHERE source_collection='users') AS customers,
    (SELECT count(*) FROM orders WHERE source_collection='orders') AS orders,
    (SELECT count(*) FROM campaigns) AS campaigns,
    (SELECT count(*) FROM operational_records WHERE source_collection='challenges' AND CAST(json_extract(payload_json,'$.streakDays') AS INTEGER)>=3) AS active_challenges,
    (SELECT count(*) FROM campaigns WHERE status='sending') AS active_campaigns,
    (SELECT count(*) FROM campaigns WHERE status='sent') AS sent_campaigns`);
  const revenue = await db.get(`SELECT
    COALESCE(sum(total_cents),0) AS total_cents,
    COALESCE(sum(CASE WHEN created_at>=? THEN total_cents ELSE 0 END),0) AS recent_cents
    FROM orders WHERE source_collection='orders' AND status IN ${paidStatuses}`, cutoff);
  const recentOrders = await db.all(`SELECT id,order_number,status,total_cents,created_at
    FROM orders WHERE source_collection='orders' ORDER BY created_at DESC LIMIT 5`);
  const recentUsers = await db.all(`SELECT source_id,payload_json,occurred_at
    FROM operational_records WHERE source_collection='users' ORDER BY occurred_at DESC LIMIT 5`);
  const totalOrders = Number(counts.orders ?? 0);
  const totalRevenue = dollars(revenue.total_cents);
  return {
    customers: { total: Number(counts.customers ?? 0), active: Number(counts.active_challenges ?? 0), recentSignups: recentUsers.length },
    orders: { total: totalOrders, last30Days: recentOrders.filter((row) => String(row.created_at) >= cutoff).length },
    revenue: { total: totalRevenue, last30Days: dollars(revenue.recent_cents), averageOrderValue: totalOrders ? (totalRevenue / totalOrders).toFixed(2) : 0 },
    campaigns: { total: Number(counts.campaigns ?? 0), active: Number(counts.active_campaigns ?? 0), sent: Number(counts.sent_campaigns ?? 0) },
    recentActivity: {
      orders: recentOrders.map((row) => ({ ...row, total: dollars(row.total_cents), createdAt: row.created_at })),
      customers: recentUsers.map((row) => { const value=json(row.payload_json); return { id: row.source_id, name: value.name, email: value.email, createdAt: value.createdAt ?? row.occurred_at }; }),
    },
  };
}

export async function getCustomerAnalyticsData(now = new Date()) {
  const db = getTursoConnection();
  const cutoff = new Date(now.getTime() - 180 * 86400000).toISOString();
  const totals = await db.get(`SELECT
    (SELECT count(*) FROM operational_records WHERE source_collection='users') AS total,
    (SELECT count(*) FROM operational_records WHERE source_collection='challenges' AND CAST(json_extract(payload_json,'$.streakDays') AS INTEGER)>=3) AS active,
    (SELECT count(*) FROM operational_records WHERE source_collection='challenges' AND CAST(json_extract(payload_json,'$.streakDays') AS INTEGER)<3) AS inactive,
    (SELECT count(*) FROM operational_records WHERE source_collection='users' AND json_extract(payload_json,'$.emailPreferences.marketing')=1) AS opted_in,
    (SELECT count(*) FROM operational_records WHERE source_collection='users' AND json_extract(payload_json,'$.emailPreferences.marketing')=0) AS opted_out`);
  const growth = await db.all(`SELECT substr(occurred_at,1,7) AS month,count(*) AS count FROM operational_records
    WHERE source_collection='users' AND occurred_at>=? GROUP BY substr(occurred_at,1,7) ORDER BY month`, cutoff);
  const frequency = await db.all(`SELECT customer_id,count(*) AS order_count FROM orders
    WHERE source_collection='orders' AND customer_id IS NOT NULL GROUP BY customer_id`);
  const values = await db.all(`SELECT customer_id,sum(total_cents) AS total_cents FROM orders
    WHERE source_collection='orders' AND customer_id IS NOT NULL AND status IN ${paidStatuses} GROUP BY customer_id`);
  const tiers = await db.all(`SELECT CASE WHEN points>=1000 THEN 'gold' WHEN points>=500 THEN 'silver' ELSE 'bronze' END AS tier,count(*) AS count
    FROM reward_accounts GROUP BY tier`);
  const total = Number(totals.total ?? 0);
  const optedIn = Number(totals.opted_in ?? 0);
  return {
    total,
    growth: growth.map((row) => ({ month: row.month, count: Number(row.count) })),
    segments: {
      byFrequency: { firstTime: frequency.filter((x)=>Number(x.order_count)===1).length, repeat: frequency.filter((x)=>Number(x.order_count)>=2&&Number(x.order_count)<5).length, loyal: frequency.filter((x)=>Number(x.order_count)>=5).length },
      byValue: { high: values.filter((x)=>Number(x.total_cents)>=20000).length, medium: values.filter((x)=>Number(x.total_cents)>=5000&&Number(x.total_cents)<20000).length, low: values.filter((x)=>Number(x.total_cents)<5000).length },
      byRewards: { bronze: Number(tiers.find((x)=>x.tier==='bronze')?.count??0), silver: Number(tiers.find((x)=>x.tier==='silver')?.count??0), gold: Number(tiers.find((x)=>x.tier==='gold')?.count??0) },
      byChallenge: { active: Number(totals.active ?? 0), inactive: Number(totals.inactive ?? 0) },
    },
    emailPreferences: { optedIn, optedOut: Number(totals.opted_out ?? 0), optInRate: total ? ((optedIn/total)*100).toFixed(1) : 0 },
  };
}

export async function getSalesAnalyticsData(now = new Date()) {
  const db = getTursoConnection();
  const cutoff = new Date(now.getTime() - 365 * 86400000).toISOString();
  const total = await db.get(`SELECT count(*) AS orders,COALESCE(sum(total_cents),0) AS cents FROM orders WHERE source_collection='orders' AND status IN ${paidStatuses}`);
  const overTime = await db.all(`SELECT substr(created_at,1,7) AS month,count(*) AS orders,sum(total_cents) AS cents FROM orders
    WHERE source_collection='orders' AND status IN ${paidStatuses} AND created_at>=? GROUP BY substr(created_at,1,7) ORDER BY month`, cutoff);
  const products = await db.all(`SELECT name_snapshot AS name,sum(quantity) AS quantity,sum(COALESCE(total_cents,quantity*unit_price_cents,0)) AS cents
    FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.source_collection='orders' AND orders.status IN ${paidStatuses}
    GROUP BY name_snapshot ORDER BY quantity DESC LIMIT 10`);
  const categories = await db.all(`SELECT COALESCE(json_extract(order_items.metadata_json,'$.category'),'Uncategorized') AS category,count(*) AS orders,
    sum(quantity) AS quantity,sum(COALESCE(order_items.total_cents,quantity*unit_price_cents,0)) AS cents FROM order_items JOIN orders ON orders.id=order_items.order_id
    WHERE orders.source_collection='orders' AND orders.status IN ${paidStatuses} GROUP BY category ORDER BY cents DESC`);
  const fulfillment = await db.all(`SELECT COALESCE(json_extract(fulfillment_json,'$.type'),'unknown') AS type,count(*) AS orders,sum(total_cents) AS cents
    FROM orders WHERE source_collection='orders' AND status IN ${paidStatuses} GROUP BY type`);
  const orderCount=Number(total.orders??0), revenue=dollars(total.cents);
  return {
    total:{orders:orderCount,revenue,averageOrderValue:orderCount?(revenue/orderCount).toFixed(2):0},
    salesOverTime:overTime.map((x)=>({month:x.month,orders:Number(x.orders),revenue:dollars(x.cents)})),
    topProducts:products.map((x)=>({name:x.name||'Unknown',quantity:Number(x.quantity),revenue:dollars(x.cents)})),
    categoryBreakdown:categories.map((x)=>({category:x.category||'Uncategorized',orders:Number(x.orders),quantity:Number(x.quantity),revenue:dollars(x.cents)})),
    fulfillmentTypes:fulfillment.map((x)=>({type:x.type||'unknown',orders:Number(x.orders),revenue:dollars(x.cents)})),
  };
}
