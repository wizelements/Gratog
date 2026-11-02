#!/usr/bin/env node
/**
 * Conservative Turso migration routing inventory.
 * Read-only source inspection; it is NOT a production cutover authority.
 * Tracks import chains from every app entry point to direct Mongo references.
 * It deliberately over-reports possible paths instead of silently passing.
 */
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, relative, dirname, extname, join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceExts=['.ts','.tsx','.js','.jsx','.mjs','.cjs'];
const roots=['app','lib','components','pages','src','jobs'];
const files=new Map();
const relativePath=p=>relative(root,p).split(sep).join('/');
function walk(directory){
  if(!existsSync(directory))return;
  for(const d of readdirSync(directory,{withFileTypes:true})){
    if(['node_modules','.next','.git','test-results','__tests__'].includes(d.name))continue;
    const p=join(directory,d.name);
    if(d.isDirectory())walk(p);
    else if(sourceExts.includes(extname(d.name)))files.set(relativePath(p),readFileSync(p,'utf8'));
  }
}
for(const dir of roots)walk(join(root,dir));
for(const name of ['middleware.ts','middleware.js','proxy.ts','proxy.js']) {
  if(existsSync(join(root,name)))files.set(name,readFileSync(join(root,name),'utf8'));
}
const mongoPattern=/\bMongoClient\b|\bmongoose\b|\bfrom\s*['"]mongodb['"]|\brequire\s*\(\s*['"]mongodb['"]|\.\s*collection\s*\(|\bgetMongoDB\b|\bconnectToMongoDB\b|\bgetMongoClient\b/i;
const tursoPattern=/@libsql\/client|turso-preview|turso-commerce|turso-order-|turso-payment-|turso-events|turso-notification-|createClient\(/i;
const importPattern=/\bfrom\s*['"]([^'"]+)['"]|\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]/g;
function resolveLocal(from,spec){
  if(!(spec.startsWith('.')||spec.startsWith('@/')))return null;
  const base=spec.startsWith('@/')?join(root,spec.slice(2)):resolve(dirname(join(root,from)),spec);
  const candidates=[base,...sourceExts.map(x=>base+x),...sourceExts.map(x=>join(base,'index'+x))];
  return candidates.map(relativePath).find(x=>files.has(x))||null;
}
const nodes=new Map();
for(const [file,source] of files){
  const imported=new Set(), unresolved=new Set();
  for(const m of source.matchAll(importPattern)){
    const spec=m[1]||m[2]||m[3];
    const path=resolveLocal(file,spec);
    if(path)imported.add(path);
    else if(spec.startsWith('@/')||spec.startsWith('.'))unresolved.add(spec);
  }
  nodes.set(file,{
    imports:[...imported].sort(),
    unresolved:[...unresolved].sort(),
    directMongo:mongoPattern.test(source),
    directTurso:tursoPattern.test(source),
  });
}
function kind(file){
  if(/^app\/api\/.*\/route\.[^.]+$/.test(file)||/^pages\/api\//.test(file)||/^app\/route\./.test(file))return 'API_ROUTE';
  if(/^(app|pages)\/.*\/page\.[^.]+$/.test(file)||/^app\/page\./.test(file)||/^pages\/.*\.(tsx|jsx|ts|js)$/.test(file))return 'PAGE';
  if(/^app\/.*\/(layout|template|default)\.[^.]+$/.test(file)||/^app\/(layout|template|default)\.[^.]+$/.test(file))return 'SERVER_COMPONENT_CANDIDATE';
  if(/^(middleware|proxy)\./.test(file))return 'MIDDLEWARE';
  return null;
}
const entries=[...nodes.keys()].filter(p=>kind(p)).sort();
const reportEntries=entries.map(entry=>{
  const visited=new Set(), queue=[entry], mongoPaths=new Set(), tursoPaths=new Set(), unresolved=new Set();
  while(queue.length){
    const p=queue.pop();if(visited.has(p))continue;
    visited.add(p);
    const node=nodes.get(p);if(!node)continue;
    if(node.directMongo)mongoPaths.add(p);
    if(node.directTurso)tursoPaths.add(p);
    for(const spec of node.unresolved)unresolved.add(p+' -> '+spec);
    for(const next of node.imports)if(!visited.has(next))queue.push(next);
  }
  return {
    path:entry, kind:kind(entry),
    classification:mongoPaths.size?'MONGO_DEPENDENCY':tursoPaths.size?'TURSO_REACHABLE_UNCERTIFIED':'NO_STATIC_DATABASE_PROOF',
    mongoDependencies:[...mongoPaths].sort(), tursoDependencies:[...tursoPaths].sort(),
    unresolvedImports:[...unresolved].sort(), reachableFiles:visited.size,
  };
});
let cronRoutes=[];
const vercelPath=join(root,'vercel.json');
if(existsSync(vercelPath)){
  try{cronRoutes=(JSON.parse(readFileSync(vercelPath,'utf8')).crons||[]).map(c=>({
    path:c.path,schedule:c.schedule,
    sourceRoute:reportEntries.find(e=>e.kind==='API_ROUTE' &&
      e.path.replace(/^app\//,'/').replace(/\/route\.[^.]+$/,'')===c.path)?.path||null,
  }));}catch{cronRoutes=[{error:'VERCEL_CRON_METADATA_UNREADABLE'}];}
}
const counts={
  scannedSourceFiles:files.size,
  apiRoutes:reportEntries.filter(e=>e.kind==='API_ROUTE').length,
  pages:reportEntries.filter(e=>e.kind==='PAGE').length,
  serverComponentCandidates:reportEntries.filter(e=>e.kind==='SERVER_COMPONENT_CANDIDATE').length,
  middleware:reportEntries.filter(e=>e.kind==='MIDDLEWARE').length,
  mongoDependentEntries:reportEntries.filter(e=>e.classification==='MONGO_DEPENDENCY').length,
  tursoReachableUncertified:reportEntries.filter(e=>e.classification==='TURSO_REACHABLE_UNCERTIFIED').length,
  noStaticDatabaseProof:reportEntries.filter(e=>e.classification==='NO_STATIC_DATABASE_PROOF').length,
  unresolvedLocalImports:reportEntries.reduce((n,e)=>n+e.unresolvedImports.length,0),
  cronJobs:cronRoutes.length,
};
const report={
  schemaVersion:1,repoCommit:process.env.GITHUB_SHA||null,counts,
  releaseStatus:'NOT_CERTIFIED',productionCutoverAuthorized:false,
  limitations:[
    'Static source-based audit only; dynamic imports, reflection, runtime conditional branches, external services, remote processes and scripts invoked outside Next.js may escape this report.',
    'Mongo dependency means an import path can reach a Mongo operation, not necessarily that it executes on every request. No static database proof is NOT proof of Turso routing.',
    'Turso reachable is NOT proof of complete Turso-only routing, authorization, correct transaction semantics or deployed behavior.',
    'Cron metadata may omit out-of-band schedulers. All cron, webhook and operational jobs require independent behavioral tests.',
  ],
  cronRoutes,entries:reportEntries,
};
const outFlag=process.argv.indexOf('--out');
if(outFlag!==-1){
  const target=process.argv[outFlag+1];if(!target)throw Error('MISSING_OUTPUT_PATH');
  writeFileSync(resolve(target),JSON.stringify(report,null,2)+'\n',{mode:0o600});
}
console.log(JSON.stringify(process.argv.includes('--json')?report:{
  counts,
  highestRisk:reportEntries.filter(e=>e.classification==='MONGO_DEPENDENCY')
    .sort((a,b)=>b.mongoDependencies.length-a.mongoDependencies.length)
    .slice(0,24).map(e=>({path:e.path,kind:e.kind,mongoModules:e.mongoDependencies.length})),
  cronRoutes,
  releaseStatus:report.releaseStatus,
},null,2));
if(process.argv.includes('--strict') &&
  (counts.mongoDependentEntries||counts.tursoReachableUncertified||
   counts.noStaticDatabaseProof||counts.unresolvedLocalImports))process.exitCode=2;
