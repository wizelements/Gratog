/**
 * Catalog identity parity gate. A cached Square item is not allowed to change
 * the unified storefront's product identity or price without verification.
 * Read-only: never performs any writes to Square, MongoDB or Turso.
 */
const normalize = value=>String(value??'').trim().replace(/\s+/g,' ');
const code = item=>normalize(item?.squareId || item?.id);
const amount = value=>{
  if(value===undefined||value===null)return null;
  const n=typeof value==='bigint'?Number(value):Number(value);
  return Number.isSafeInteger(n)&&n>=0?n:null;
};
export function auditCatalogAuthority(unifiedProducts,squareCache){
 if(!Array.isArray(unifiedProducts)||!Array.isArray(squareCache))throw Error('CATALOG_SNAPSHOTS_REQUIRED');
 const canonical=new Map(),cached=new Map(),collisions=[];
 for(const [label,rows,map] of [['unified',unifiedProducts,canonical],['squareCache',squareCache,cached]]){
  for(const p of rows){
   const id=code(p);
   if(!id){collisions.push({source:label,problem:'MISSING_ID'});continue}
   if(map.has(id)){collisions.push({source:label,problem:'DUPLICATE_ID',idSuffix:id.slice(-8)});continue}
   map.set(id,p);
  }
 }
 const extra=[],missing=[],nameConflicts=[],priceConflicts=[];
 for(const [id,p] of cached){
  const primary=canonical.get(id);
  if(!primary){extra.push({idSuffix:id.slice(-8),name:normalize(p.name)});continue}
  if(normalize(p.name).toLocaleLowerCase('en-US')!==normalize(primary.name).toLocaleLowerCase('en-US')){
   nameConflicts.push({idSuffix:id.slice(-8),canonical:normalize(primary.name),squareCache:normalize(p.name)});
  }
  // Prices are not compared when the cache omits a server-authoritative price.
  // Missing price evidence does not create evidence of a mismatch.
  const pPrice=amount(primary.priceCents);
  const cachedPrice=amount(p.priceCents);
  if(pPrice!==null&&cachedPrice!==null&&pPrice!==cachedPrice)
   priceConflicts.push({idSuffix:id.slice(-8),canonicalCents:pPrice,cacheCents:cachedPrice});
 }
 for(const [id,p] of canonical)if(!cached.has(id)) missing.push({idSuffix:id.slice(-8),name:normalize(p.name)});
 return {
  source:'read_only_snapshots',unifiedCount:unifiedProducts.length,cacheCount:squareCache.length,
  sharedIds:[...canonical.keys()].filter(id=>cached.has(id)).length,
  squareOnly:extra,unifiedOnly:missing,identityConflicts:nameConflicts,
  priceConflicts,duplicateOrInvalidIds:collisions,
  releaseSafe:collisions.length===0&&nameConflicts.length===0&&priceConflicts.length===0&&missing.length===0,
  providerReadbackCertified:false,
 };
}
