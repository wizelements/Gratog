import { getTursoConnection } from '@/lib/db/turso';
import { randomUUID } from 'node:crypto';
import type { AdminMenu } from './types';
import type { CreateMenuData, UpdateMenuData } from './repository';
type MenuRow = { id:string; title:string; description:string|null; image_url:string; thumbnail_url:string|null; canva_url:string|null; print_url:string|null; market_id:string|null; week_start:string; week_end:string; active:number; archived:number; created_at:string; updated_at:string };
async function hydrate(rows: MenuRow[]): Promise<AdminMenu[]> {
  const db = getTursoConnection(); const result: AdminMenu[] = [];
  for (const value of rows) { const products = await db.all('SELECT product_id FROM menu_products WHERE menu_id = ? ORDER BY position', value.id); const tags = await db.all('SELECT tag FROM menu_tags WHERE menu_id = ? ORDER BY tag', value.id); result.push({ id:value.id,title:value.title,description:value.description??undefined,imageUrl:value.image_url,thumbnailUrl:value.thumbnail_url??undefined,canvaUrl:value.canva_url??undefined,printUrl:value.print_url??undefined,marketId:value.market_id??undefined,weekStart:value.week_start,weekEnd:value.week_end,isActive:Boolean(value.active),isArchived:Boolean(value.archived),linkedProducts:products.map((x:any)=>String(x.product_id)),seasonalTags:tags.map((x:any)=>String(x.tag)),createdAt:value.created_at,updatedAt:value.updated_at }); }
  return result;
}
const select = 'SELECT id,title,description,image_url,thumbnail_url,canva_url,print_url,market_id,week_start,week_end,active,archived,created_at,updated_at FROM menus';
export async function listTursoMenus(mode:'all'|'active'|'public'='all') { const where=mode==='active'?' WHERE active = 1':mode==='public'?' WHERE active = 1 OR archived = 1':''; return hydrate(await getTursoConnection().all(`${select}${where} ORDER BY active DESC, week_start DESC`) as MenuRow[]); }
export async function getTursoMenuById(id:string) { return (await hydrate(await getTursoConnection().all(`${select} WHERE id = ? LIMIT 1`,id) as MenuRow[]))[0]??null; }

async function replaceRelations(tx:any,id:string,products:string[],tags:string[]){
  await tx.run('DELETE FROM menu_products WHERE menu_id = ?',id);
  await tx.run('DELETE FROM menu_tags WHERE menu_id = ?',id);
  for(const [position,productId] of products.entries())await tx.run('INSERT INTO menu_products(menu_id,product_id,position) VALUES(?,?,?)',id,productId,position);
  for(const tag of tags)await tx.run('INSERT INTO menu_tags(menu_id,tag) VALUES(?,?)',id,tag);
}

export async function createTursoMenu(data:CreateMenuData){
  const db=getTursoConnection(),id=randomUUID(),now=new Date().toISOString();
  await db.transactionAsync(async(tx)=>{
    await tx.run(`INSERT INTO menus(id,market_id,title,description,image_url,thumbnail_url,canva_url,print_url,week_start,week_end,active,archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,id,data.marketId||null,data.title,data.description||'',data.imageUrl,data.thumbnailUrl||null,data.canvaUrl||null,data.printUrl||null,data.weekStart.toISOString(),data.weekEnd.toISOString(),data.isActive?1:0,data.isArchived?1:0,now,now);
    await replaceRelations(tx,id,data.linkedProducts??[],data.seasonalTags??[]);
  });
  return getTursoMenuById(id) as Promise<AdminMenu>;
}

export async function updateTursoMenu(id:string,data:UpdateMenuData){
  const db=getTursoConnection(),now=new Date().toISOString();
  const columns:{[K in keyof UpdateMenuData]?:string}={title:'title',description:'description',imageUrl:'image_url',thumbnailUrl:'thumbnail_url',canvaUrl:'canva_url',printUrl:'print_url',marketId:'market_id',weekStart:'week_start',weekEnd:'week_end',isActive:'active',isArchived:'archived'};
  await db.transactionAsync(async(tx)=>{
    const sets=['updated_at = ?']; const values:any[]=[now];
    for(const [key,column] of Object.entries(columns)){
      const value=data[key as keyof UpdateMenuData]; if(value===undefined)continue;
      sets.push(`${column} = ?`); values.push(value instanceof Date?value.toISOString():typeof value==='boolean'?(value?1:0):value);
    }
    const result=await tx.run(`UPDATE menus SET ${sets.join(',')} WHERE id = ?`,...values,id);
    if(Number(result.rowsAffected)!==1)return;
    if(data.linkedProducts!==undefined||data.seasonalTags!==undefined){
      const current=await getTursoMenuById(id);
      await replaceRelations(tx,id,data.linkedProducts??current?.linkedProducts??[],data.seasonalTags??current?.seasonalTags??[]);
    }
  });
  return getTursoMenuById(id);
}

export async function deleteTursoMenu(id:string){return Number((await getTursoConnection().run('DELETE FROM menus WHERE id = ?',id)).rowsAffected)>0;}
export async function setActiveTursoMenu(id:string){
  const db=getTursoConnection(),now=new Date().toISOString();let found=false;
  await db.transactionAsync(async(tx)=>{const target=await tx.get('SELECT id FROM menus WHERE id = ? LIMIT 1',id);if(!target)return;found=true;await tx.run('UPDATE menus SET active=0,updated_at=? WHERE active=1',now);await tx.run('UPDATE menus SET active=1,updated_at=? WHERE id=?',now,id);});
  return found?getTursoMenuById(id):null;
}
