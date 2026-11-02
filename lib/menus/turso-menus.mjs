import {randomBytes,randomUUID} from 'node:crypto';

export class TursoMenuError extends Error {
  constructor(code,status=409){super(code);this.name='TursoMenuError';this.code=code;this.status=status;}
}
const fail=(code,status)=>{throw new TursoMenuError(code,status)};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const fields=new Set(['title','description','imageUrl','thumbnailUrl','canvaUrl','printUrl',
  'marketId','weekStart','weekEnd','isActive','isArchived','linkedProducts','seasonalTags']);
const columns=['id','market_id','title','description','image_url','thumbnail_url','canva_url',
  'print_url','week_start','week_end','active','archived','created_at','updated_at'];
const text=(v,key,required=false)=>{
  if(v==null&&!required)return '';
  if(typeof v!=='string'||v.length>2000||(required&&!v.trim()))fail('MENU_INVALID_'+key,422);
  return v;
};
const iso=(v,key)=>{
  const d=v instanceof Date?v:new Date(v);
  if(v==null||!Number.isFinite(d.getTime()))fail('MENU_INVALID_'+key,422);
  return d.toISOString();
};
function patchGuard(patch){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))fail('MENU_PATCH_INVALID',422);
  for(const k of Object.keys(patch))if(!fields.has(k))fail('MENU_FIELD_NOT_EDITABLE',422);
  for(const k of ['isActive','isArchived'])
    if(own(patch,k)&&typeof patch[k]!=='boolean')fail('MENU_FLAG_INVALID',422);
}
function normalize(data,id,createdAt,updatedAt){
  const start=iso(data.weekStart,'WEEK_START'),end=iso(data.weekEnd,'WEEK_END');
  const days=(Date.parse(end)-Date.parse(start))/86400000;
  if(days<6||days>8)fail('MENU_WEEK_RANGE_INVALID',422);
  const image=text(data.imageUrl,'IMAGE_URL',true);
  try{if(!['https:','http:'].includes(new URL(image).protocol))fail('MENU_IMAGE_URL_INVALID',422)}
  catch{fail('MENU_IMAGE_URL_INVALID',422)}
  for(const k of ['linkedProducts','seasonalTags']){
    if(data[k]!=null&&(!Array.isArray(data[k])||data[k].length>200||
      data[k].some(x=>typeof x!=='string'||!x.trim()||x.length>200)||
      new Set(data[k]).size!==data[k].length))fail('MENU_LIST_INVALID',422);
  }
  if(data.isActive&&data.isArchived)fail('MENU_ARCHIVED_CANNOT_ACTIVATE',422);
  return {id,market_id:text(data.marketId,'MARKET_ID')||null,
    title:text(data.title,'TITLE',true),description:text(data.description,'DESCRIPTION'),
    image_url:image,thumbnail_url:text(data.thumbnailUrl,'THUMBNAIL_URL'),
    canva_url:text(data.canvaUrl,'CANVA_URL'),print_url:text(data.printUrl,'PRINT_URL'),
    week_start:start,week_end:end,active:data.isActive?1:0,archived:data.isArchived?1:0,
    created_at:createdAt,updated_at:updatedAt};
}
function changed(result){
  if(!Number.isSafeInteger(result?.changes))fail('MENU_WRITE_UNCONFIRMED',503);
  return result.changes;
}
function transaction(db,fn){
  if(typeof db?.transactionAsync!=='function')fail('MENU_TRANSACTION_REQUIRED',503);
  return db.transactionAsync(fn).immediate();
}
async function project(db,row){
  const [products,tags]=await Promise.all([
    db.all('SELECT product_id FROM menu_products WHERE menu_id=? ORDER BY position',row.id),
    db.all('SELECT tag FROM menu_tags WHERE menu_id=? ORDER BY tag',row.id),
  ]);
  return {id:row.id,title:row.title,description:row.description||'',imageUrl:row.image_url,
    thumbnailUrl:row.thumbnail_url||'',canvaUrl:row.canva_url||'',printUrl:row.print_url||'',
    marketId:row.market_id||'',weekStart:row.week_start,weekEnd:row.week_end,
    isActive:row.active===1,isArchived:row.archived===1,
    linkedProducts:products.map(x=>x.product_id),seasonalTags:tags.map(x=>x.tag),
    createdAt:row.created_at,updatedAt:row.updated_at};
}
export async function getTursoMenuById(db,id){
  if(typeof id!=='string'||!id||id.length>200)fail('MENU_ID_INVALID',422);
  const row=await db.get('SELECT '+columns.join(',')+' FROM menus WHERE id=?',id);
  return row?project(db,row):null;
}
export async function listTursoMenus(db,kind='all'){
  const where={all:'',active:' WHERE active=1 AND archived=0',
    public:' WHERE active=1 OR archived=1'}[kind];
  if(where===undefined)fail('MENU_QUERY_INVALID',422);
  const rows=await db.all('SELECT '+columns.join(',')+' FROM menus'+where+
    ' ORDER BY active DESC,week_start DESC,id');
  return Promise.all(rows.map(row=>project(db,row)));
}
async function children(tx,id,data){
  await tx.run('DELETE FROM menu_products WHERE menu_id=?',id);
  for(const [position,p]of(data.linkedProducts||[]).entries())
    await tx.run('INSERT INTO menu_products(menu_id,product_id,position) VALUES(?,?,?)',id,p,position);
  await tx.run('DELETE FROM menu_tags WHERE menu_id=?',id);
  for(const tag of data.seasonalTags||[])
    await tx.run('INSERT INTO menu_tags(menu_id,tag) VALUES(?,?)',id,tag);
}
async function audit(tx,id,operation,before,after,at){
  if(changed(await tx.run('INSERT INTO menu_operations(id,menu_id,operation,before_json,after_json,occurred_at) VALUES(?,?,?,?,?,?)',
    randomUUID(),id,operation,before?JSON.stringify(before):null,JSON.stringify(after),at))!==1)
    fail('MENU_AUDIT_UNCONFIRMED',503);
}
async function deactivateOthers(tx,id,at){
  const others=await tx.all('SELECT id FROM menus WHERE active=1 AND id<>?',id);
  for(const item of others){
    const before=await getTursoMenuById(tx,item.id);
    if(changed(await tx.run('UPDATE menus SET active=0,updated_at=? WHERE id=? AND active=1',at,item.id))!==1)
      fail('MENU_ACTIVATION_CONFLICT');
    await audit(tx,item.id,'update',before,await getTursoMenuById(tx,item.id),at);
  }
}
export async function createTursoMenu(db,data){
  patchGuard(data);
  const at=new Date().toISOString(),id=randomBytes(12).toString('hex');
  const row=normalize(data,id,at,at);
  return transaction(db,async tx=>{
    if(row.active)await deactivateOthers(tx,id,at);
    if(changed(await tx.run('INSERT INTO menus('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')',
      ...columns.map(k=>row[k])))!==1)fail('MENU_CREATE_UNCONFIRMED',503);
    await children(tx,id,data);
    const after=await getTursoMenuById(tx,id);
    await audit(tx,id,'create',null,after,at);
    return after;
  });
}
export async function updateTursoMenu(db,id,patch,operation='update'){
  patchGuard(patch);
  return transaction(db,async tx=>{
    const before=await getTursoMenuById(tx,id);
    if(!before)return null;
    const at=new Date(Math.max(Date.now(),Date.parse(before.updatedAt)+1)).toISOString();
    const data={...before,...patch};
    const row=normalize(data,id,before.createdAt,at);
    if(row.active)await deactivateOthers(tx,id,at);
    const editable=columns.filter(k=>k!=='id'&&k!=='created_at');
    if(changed(await tx.run('UPDATE menus SET '+editable.map(k=>k+'=?').join(',')+
      ' WHERE id=? AND updated_at=?',...editable.map(k=>row[k]),id,before.updatedAt))!==1)
      fail('MENU_CONCURRENT_MODIFICATION');
    await children(tx,id,data);
    const after=await getTursoMenuById(tx,id);
    await audit(tx,id,operation,before,after,at);
    return after;
  });
}
export const activateTursoMenu=(db,id)=>updateTursoMenu(db,id,{isActive:true,isArchived:false},'activate');
export const archiveTursoMenu=async(db,id)=>Boolean(await updateTursoMenu(db,id,{isActive:false,isArchived:true},'archive'));
