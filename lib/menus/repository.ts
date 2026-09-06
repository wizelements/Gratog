import { logger } from '@/lib/logger';
import type { AdminMenu } from './types';
import { createTursoMenu,deleteTursoMenu,getTursoMenuById,listTursoMenus,setActiveTursoMenu,updateTursoMenu } from './turso-repository';

export type CreateMenuData={title:string;description?:string;imageUrl:string;thumbnailUrl?:string;canvaUrl?:string;printUrl?:string;marketId?:string;weekStart:Date;weekEnd:Date;isActive?:boolean;isArchived?:boolean;linkedProducts?:string[];seasonalTags?:string[]};
export interface UpdateMenuData {title?:string;description?:string;imageUrl?:string;thumbnailUrl?:string;canvaUrl?:string;printUrl?:string;marketId?:string;weekStart?:Date;weekEnd?:Date;isActive?:boolean;isArchived?:boolean;linkedProducts?:string[];seasonalTags?:string[]}

async function logged<T>(action:string,operation:()=>Promise<T>):Promise<T>{try{return await operation();}catch(error){logger.error('Menus',`Failed to ${action}`,error);throw error;}}
export const getAllMenus=():Promise<AdminMenu[]>=>logged('fetch all menus',()=>listTursoMenus('all'));
export const getActiveMenus=():Promise<AdminMenu[]>=>logged('fetch active menus',()=>listTursoMenus('active'));
export const getPublicMenus=():Promise<AdminMenu[]>=>logged('fetch public menus',()=>listTursoMenus('public'));
export const getActiveMenu=():Promise<AdminMenu|null>=>logged('fetch active menu',async()=>(await listTursoMenus('active'))[0]??null);
export const getMenuById=(id:string):Promise<AdminMenu|null>=>logged('fetch menu by id',()=>getTursoMenuById(id));
export const createMenu=(data:CreateMenuData):Promise<AdminMenu>=>logged('create menu',()=>createTursoMenu(data));
export const updateMenu=(id:string,data:UpdateMenuData):Promise<AdminMenu|null>=>logged('update menu',()=>updateTursoMenu(id,data));
export const deleteMenu=(id:string):Promise<boolean>=>logged('delete menu',()=>deleteTursoMenu(id));
export const setActiveMenu=(id:string):Promise<AdminMenu|null>=>logged('set active menu',()=>setActiveTursoMenu(id));
// Indexes are source-controlled SQL migrations; runtime DDL is intentionally disabled.
export async function ensureMenuIndexes():Promise<void>{}
