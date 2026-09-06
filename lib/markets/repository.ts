import { logger } from '@/lib/logger';
import type { AdminMarket,MarketLocation } from './types';
import { createTursoMarket,deleteTursoMarket,getTursoMarketById,listTursoMarkets,seedTursoMarkets,updateTursoMarket } from './turso-repository';
export type CreateMarketData={name:string;address:string;city:string;state:string;zip:string;lat:number;lng:number;hours:string;dayOfWeek:number;description:string;mapsUrl?:string;isActive?:boolean;featured?:boolean};
export interface UpdateMarketData extends Partial<MarketLocation>{isActive?:boolean;featured?:boolean}
async function logged<T>(action:string,fn:()=>Promise<T>){try{return await fn()}catch(error){logger.error('Markets',`Failed to ${action}`,error);throw error}}
export const getAllMarkets=():Promise<AdminMarket[]>=>logged('fetch all markets',()=>listTursoMarkets(false));
export const getActiveMarkets=():Promise<AdminMarket[]>=>logged('fetch active markets',()=>listTursoMarkets(true));
export const getMarketById=(id:string):Promise<AdminMarket|null>=>logged('fetch market by id',()=>getTursoMarketById(id));
export const createMarket=(data:CreateMarketData):Promise<AdminMarket>=>logged('create market',()=>createTursoMarket(data));
export const updateMarket=(id:string,data:UpdateMarketData):Promise<AdminMarket|null>=>logged('update market',()=>updateTursoMarket(id,data));
export const deleteMarket=(id:string):Promise<boolean>=>logged('delete market',()=>deleteTursoMarket(id));
export const toggleMarketStatus=(id:string,isActive:boolean)=>updateMarket(id,{isActive});
const defaults:CreateMarketData[]=[
  {name:'Serenbe Farmers Market',address:'10950 Hutcheson Ferry Rd',city:'Palmetto',state:'GA',zip:'30268',lat:33.4848,lng:-84.686,hours:'09:00-13:00',dayOfWeek:6,description:'Our flagship location featuring the full product line. Look for the gold Taste of Gratitude banners at Booth #12.',mapsUrl:'https://maps.google.com/?q=Serenbe+Farmers+Market',isActive:true,featured:true},
  {name:'DHA Dunwoody Farmers Market',address:'4770 N Peachtree Rd',city:'Dunwoody',state:'GA',zip:'30338',lat:33.9354,lng:-84.2943,hours:'09:00-12:00',dayOfWeek:6,description:'Community market hosted at Brook Run Park in Dunwoody with local wellness vendors and fresh seasonal goods.',mapsUrl:'https://maps.google.com/?q=Brook+Run+Park+4770+N+Peachtree+Rd+Dunwoody+GA+30338',isActive:true,featured:false},
];
export const seedDefaultMarkets=()=>logged('seed markets',()=>seedTursoMarkets(defaults));
// Indexes are source-controlled SQL migrations; runtime DDL is intentionally disabled.
export async function ensureMarketIndexes():Promise<void>{}
