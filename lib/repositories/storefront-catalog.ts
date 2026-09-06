import 'server-only';
import { getTursoConnection } from '@/lib/db/turso';

type Executor = Pick<ReturnType<typeof getTursoConnection>, 'all' | 'get'>;
function meta(value:unknown){if(typeof value!=='string'||!value)return{};try{return JSON.parse(value)}catch{return{}}}
async function hydrate(row:any,executor:Executor){
  const metadata=meta(row.metadata_json);
  const variations=await executor.all(`SELECT id,square_variation_id,name,price_cents,currency,active FROM product_variations WHERE product_id=? ORDER BY id`,row.id) as any[];
  const stock=row.current_stock==null?null:Number(row.current_stock);
  return {id:String(row.id),squareId:row.square_catalog_id??String(row.id),slug:row.slug,name:row.name,description:row.description,
    category:metadata.category??null,intelligentCategory:metadata.category??null,tags:Array.isArray(metadata.tags)?metadata.tags:[],
    images:Array.isArray(metadata.images)?metadata.images:[],image:Array.isArray(metadata.images)?metadata.images[0]??null:null,
    active:Number(row.active)===1,inStock:stock==null?undefined:stock>0,stock,
    priceCents:variations[0]?.price_cents==null?null:Number(variations[0].price_cents),price:variations[0]?.price_cents==null?null:Number(variations[0].price_cents)/100,
    variations:variations.filter(v=>Number(v.active)===1).map(v=>({id:String(v.square_variation_id??v.id),variationId:String(v.square_variation_id??v.id),name:v.name,priceCents:v.price_cents==null?null:Number(v.price_cents),price:v.price_cents==null?null:Number(v.price_cents)/100,currency:v.currency})),
    source:metadata.source??'turso',createdAt:row.created_at,updatedAt:row.updated_at,syncedAt:row.updated_at};
}
export async function getStorefrontProductBySlug(slug:string,executor:Executor=getTursoConnection()){
  const row=await executor.get(`SELECT p.*,i.current_stock FROM products p LEFT JOIN inventory i ON i.product_id=p.id WHERE p.active=1 AND (p.slug=? OR p.id=?) LIMIT 1`,slug,slug);
  return row?hydrate(row,executor):null;
}
export async function listStorefrontProducts(filters:Record<string,unknown>={},executor:Executor=getTursoConnection()){
  const where=['p.active=1'];const values:unknown[]=[];
  if(filters.category){where.push("lower(json_extract(p.metadata_json,'$.category'))=lower(?)");values.push(String(filters.category))}
  if(filters.tag){where.push("EXISTS (SELECT 1 FROM json_each(p.metadata_json,'$.tags') WHERE lower(value)=lower(?))");values.push(String(filters.tag))}
  if(filters.search){const q=`%${String(filters.search).replace(/[\\%_]/g,'\\$&')}%`;where.push("(p.name LIKE ? ESCAPE '\\' OR coalesce(p.description,'') LIKE ? ESCAPE '\\')");values.push(q,q)}
  const rows=await executor.all(`SELECT p.*,i.current_stock FROM products p LEFT JOIN inventory i ON i.product_id=p.id WHERE ${where.join(' AND ')} ORDER BY p.name LIMIT 250`,...values) as any[];
  const result=[];for(const row of rows)result.push(await hydrate(row,executor));return result;
}
