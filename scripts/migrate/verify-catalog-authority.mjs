#!/usr/bin/env node
/**
 * Read-only Mongo product identity check. No Square or database writes.
 * Requires MONGODB_URI in environment and a separately verified source DB.
 * Does not claim to prove current Square catalog truth without API readback.
 */
import {MongoClient} from 'mongodb';
import {auditCatalogAuthority} from '../../lib/catalog/square-catalog-authority-audit.mjs';
if(!process.env.MONGODB_URI||process.env.CATALOG_AUDIT_SOURCE!=='taste_of_gratitude')
 throw Error('READ_ONLY_CATALOG_SOURCE_UNVERIFIED');
const c=new MongoClient(process.env.MONGODB_URI,{
 readPreference:'secondaryPreferred',maxPoolSize:1,serverSelectionTimeoutMS:12000});
try{
 await c.connect();
 const db=c.db('taste_of_gratitude');
 const projection={_id:0,id:1,squareId:1,name:1,priceCents:1};
 const [products,cache]=await Promise.all([
  db.collection('unified_products').find({},{projection}).toArray(),
  db.collection('square_catalog_items').find({},{projection}).toArray()
 ]);
 const result=auditCatalogAuthority(products,cache);
 console.log(JSON.stringify({audit:'read-only-catalog',...result}));
 if(!result.releaseSafe)process.exitCode=1;
}catch(e){console.log(JSON.stringify({audit:'read-only-catalog',pass:false,errorClass:e.name||'UNKNOWN'}));process.exitCode=1}
finally{await c.close()}
