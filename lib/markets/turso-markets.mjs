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
