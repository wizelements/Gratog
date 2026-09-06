import { getTursoConnection } from '@/lib/db/turso';
import type { AdminMenu } from './types';
type MenuRow = { id:string; title:string; description:string|null; image_url:string; thumbnail_url:string|null; canva_url:string|null; print_url:string|null; market_id:string|null; week_start:string; week_end:string; active:number; archived:number; created_at:string; updated_at:string };
async function hydrate(rows: MenuRow[]): Promise<AdminMenu[]> {
  const db = getTursoConnection(); const result: AdminMenu[] = [];
  for (const value of rows) { const products = await db.all('SELECT product_id FROM menu_products WHERE menu_id = ? ORDER BY position', value.id); const tags = await db.all('SELECT tag FROM menu_tags WHERE menu_id = ? ORDER BY tag', value.id); result.push({ id:value.id,title:value.title,description:value.description??undefined,imageUrl:value.image_url,thumbnailUrl:value.thumbnail_url??undefined,canvaUrl:value.canva_url??undefined,printUrl:value.print_url??undefined,marketId:value.market_id??undefined,weekStart:value.week_start,weekEnd:value.week_end,isActive:Boolean(value.active),isArchived:Boolean(value.archived),linkedProducts:products.map((x:any)=>String(x.product_id)),seasonalTags:tags.map((x:any)=>String(x.tag)),createdAt:value.created_at,updatedAt:value.updated_at }); }
  return result;
}
const select = 'SELECT id,title,description,image_url,thumbnail_url,canva_url,print_url,market_id,week_start,week_end,active,archived,created_at,updated_at FROM menus';
export async function listTursoMenus(mode:'all'|'active'|'public'='all') { const where=mode==='active'?' WHERE active = 1':mode==='public'?' WHERE active = 1 OR archived = 1':''; return hydrate(await getTursoConnection().all(`${select}${where} ORDER BY active DESC, week_start DESC`) as MenuRow[]); }
export async function getTursoMenuById(id:string) { return (await hydrate(await getTursoConnection().all(`${select} WHERE id = ? LIMIT 1`,id) as MenuRow[]))[0]??null; }
