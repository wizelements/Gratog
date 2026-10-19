/**
 * Read-only Turso projection for the public markets feed.
 * Uses the existing preview environment authorization at the caller boundary;
 * never silently falls back to Mongo after a Turso read failure.
 */
export class TursoMarketParityError extends Error {
  constructor(reason) { super(reason); this.name='TursoMarketParityError'; }
}
function requireText(value,field) {
  if(typeof value!=='string' || !value.trim())throw new TursoMarketParityError('MARKET_'+field+'_MISSING');
  return value;
}
function optionalText(value,field) {
  if(value == null)return undefined;
  if(typeof value!=='string')throw new TursoMarketParityError('MARKET_'+field+'_INVALID');
  return value;
}
function boolean(value,field) {
  if(value!==0 && value!==1)throw new TursoMarketParityError('MARKET_'+field+'_INVALID');
  return Boolean(value);
}
function decodeSchedule(value) {
  if(value == null)return {};
  let data;
  try { data=JSON.parse(value); } catch { throw new TursoMarketParityError('MARKET_SCHEDULE_INVALID'); }
  if(!data || typeof data!=='object' || Array.isArray(data))
    throw new TursoMarketParityError('MARKET_SCHEDULE_INVALID');
  return data;
}
export function projectTursoMarket(row) {
  if(!row || typeof row!=='object')throw new TursoMarketParityError('MARKET_ROW_MISSING');
  const id=requireText(row.id,'ID');
  const s=decodeSchedule(row.schedule_json);
  const lat=Number(row.latitude),lng=Number(row.longitude);
  if(row.latitude==null || row.longitude==null || !Number.isFinite(lat) ||
     !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
    throw new TursoMarketParityError('MARKET_COORDINATES_INVALID:'+id);
  const d=row.day_of_week;
  if(!Number.isSafeInteger(d)||d<0||d>6)throw new TursoMarketParityError('MARKET_DAY_INVALID:'+id);
  const pickup={};
  for(const key of ['pickupDays','preorderCutoff','parkingNotes','recurrence']){
    const value=optionalText(s[key],key.toUpperCase());
    if(value!==undefined)pickup[key]=value;
  }
  return {
    id, name:requireText(row.name,'NAME'), address:requireText(row.address,'ADDRESS'),
    city:requireText(row.city,'CITY'),state:requireText(row.state,'STATE'),
    zip:requireText(row.zip,'ZIP'),lat,lng,
    hours:requireText(row.hours,'HOURS'), dayOfWeek:d,
    description:row.description==null?'':optionalText(row.description,'DESCRIPTION'),
    mapsUrl:row.maps_url==null?'':optionalText(row.maps_url,'MAPS_URL'),
    ...pickup, isActive:boolean(row.active,'ACTIVE'),
    featured:boolean(row.featured,'FEATURED'),
    createdAt:requireText(row.created_at,'CREATED_AT'),
    updatedAt:requireText(row.updated_at,'UPDATED_AT'),
  };
}
export async function getTursoActiveMarkets(db) {
  // This is intentionally not a generic query builder. A market which fails
  // projection must fail the entire feed, not be silently dropped.
  const rows=await db.all(
    'SELECT id,name,address,city,state,zip,latitude,longitude,hours,day_of_week,'+
    'description,maps_url,featured,active,schedule_json,created_at,updated_at '+
    'FROM markets WHERE active=1 ORDER BY name ASC,id ASC'
  );
  if(!Array.isArray(rows))throw new TursoMarketParityError('MARKET_RESULT_INVALID');
  return rows.map(projectTursoMarket);
}

/** SQL-backed market editing. Caller must authorize the administrator first. */
const fullColumns=['id','name','address','city','state','zip','latitude','longitude',
  'hours','day_of_week','description','maps_url','featured','active',
  'schedule_json','created_at','updated_at'];
const publicFields=new Set(['name','address','city','state','zip','lat','lng',
  'hours','dayOfWeek','description','mapsUrl','pickupDays','preorderCutoff',
  'parkingNotes','recurrence','isActive','featured']);
const scheduleFields=['pickupDays','preorderCutoff','parkingNotes','recurrence'];
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function changes(value) {
  if(!Number.isSafeInteger(value?.changes) || value.changes<0)
    throw new TursoMarketParityError('MARKET_WRITE_CONFIRMATION_MISSING');
  return value.changes;
}
function patchGuard(data) {
  if(!data || typeof data!=='object' || Array.isArray(data))
    throw new TursoMarketParityError('MARKET_PATCH_INVALID');
  for(const key of Object.keys(data))
    if(!publicFields.has(key))throw new TursoMarketParityError('MARKET_FIELD_NOT_EDITABLE:'+key);
}
function encodeSchedule(existing,updates) {
  const schedule={...existing};
  for(const key of scheduleFields) {
    if(own(updates,key)) {
      if(typeof updates[key]!=='string' || updates[key].length>500)
        throw new TursoMarketParityError('MARKET_SCHEDULE_FIELD_INVALID:'+key);
      schedule[key]=updates[key];
    }
  }
  return Object.keys(schedule).length?JSON.stringify(schedule):null;
}
function buildRow(data,id,createdAt,updatedAt,schedule=null) {
  const row={
    id,name:data.name,address:data.address,city:data.city,state:data.state,
    zip:data.zip,latitude:data.lat,longitude:data.lng,hours:data.hours,
    day_of_week:data.dayOfWeek,description:data.description,maps_url:data.mapsUrl||'',
    featured:data.featured===true?1:0,active:data.isActive===false?0:1,
    schedule_json:encodeSchedule(schedule||{},data),
    created_at:createdAt,updated_at:updatedAt,
  };
  projectTursoMarket(row);
  return row;
}
const tableColumns=fullColumns.join(',');
export async function getTursoAllMarkets(db) {
  const rows=await db.all('SELECT '+tableColumns+' FROM markets ORDER BY name ASC,id ASC');
  if(!Array.isArray(rows))throw new TursoMarketParityError('MARKET_RESULT_INVALID');
  return rows.map(projectTursoMarket);
}
export async function getTursoMarketById(db,id) {
  if(typeof id!=='string' || !id || id.length>200)
    throw new TursoMarketParityError('MARKET_ID_INVALID');
  const row=await db.get('SELECT '+tableColumns+' FROM markets WHERE id=?',id);
  return row?projectTursoMarket(row):null;
}
export async function createTursoMarket(db,data) {
  patchGuard(data);
  const {randomBytes}=await import('node:crypto');
  const id=randomBytes(12).toString('hex'),at=new Date().toISOString();
  const row=buildRow({isActive:true,featured:false,...data},id,at,at);
  const sql='INSERT INTO markets ('+tableColumns+') VALUES ('+
    fullColumns.map(()=>'?').join(',')+')';
  if(changes(await db.run(sql,...fullColumns.map(k=>row[k])))!==1)
    throw new TursoMarketParityError('MARKET_CREATE_NOT_CONFIRMED');
  return projectTursoMarket(row);
}
export async function updateTursoMarket(db,id,patch) {
  patchGuard(patch);
  const previous=await db.get('SELECT '+tableColumns+' FROM markets WHERE id=?',id);
  if(!previous)return null;
  const before=projectTursoMarket(previous),all={...before,...patch};
  const oldStamp=Date.parse(previous.updated_at);
  if(!Number.isFinite(oldStamp))throw new TursoMarketParityError('MARKET_TIMESTAMP_INVALID');
  const stamp=new Date(Math.max(Date.now(),oldStamp+1)).toISOString();
  const row=buildRow(all,id,previous.created_at,stamp,decodeSchedule(previous.schedule_json));
  const cols=fullColumns.filter(k=>k!=='id' && k!=='created_at');
  const written=changes(await db.run('UPDATE markets SET '+
    cols.map(k=>k+'=?').join(',')+' WHERE id=? AND updated_at=?',
    ...cols.map(k=>row[k]),id,previous.updated_at));
  if(written!==1)throw new TursoMarketParityError('MARKET_CONCURRENT_MODIFICATION');
  return projectTursoMarket(row);
}
export async function archiveTursoMarket(db,id) {
  // DELETE would alter historical order/menu foreign keys. Archive instead.
  if(typeof id!=='string' || !id || id.length>200)
    throw new TursoMarketParityError('MARKET_ID_INVALID');
  const previous=await getTursoMarketById(db,id);
  if(!previous)return false;
  if(!previous.isActive)return true;
  const updated=await updateTursoMarket(db,id,{isActive:false});
  return updated?.isActive===false;
}
