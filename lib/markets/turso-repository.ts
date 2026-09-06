import { getTursoConnection } from '@/lib/db/turso';
import type { AdminMarket } from './types';
function map(r:any):AdminMarket{return{id:String(r.id),name:r.name,address:r.address??'',city:r.city??'',state:r.state??'',zip:r.zip??'',lat:Number(r.latitude??0),lng:Number(r.longitude??0),hours:r.hours??'',dayOfWeek:Number(r.day_of_week??0),description:r.description??'',mapsUrl:r.maps_url??'',isActive:Boolean(r.active),featured:Boolean(r.featured),createdAt:r.created_at??new Date(0).toISOString(),updatedAt:r.updated_at??new Date(0).toISOString()}}
const select='SELECT id,name,address,city,state,zip,latitude,longitude,hours,day_of_week,description,maps_url,active,featured,created_at,updated_at FROM markets';
export async function listTursoMarkets(activeOnly=false){return(await getTursoConnection().all(`${select}${activeOnly?' WHERE active = 1':''} ORDER BY name`)).map(map)}
export async function getTursoMarketById(id:string){const value=await getTursoConnection().get(`${select} WHERE id = ? LIMIT 1`,id);return value?map(value):null}
