import { readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
const extensions = new Set(['.js','.jsx','.ts','.tsx']); const files=[];
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const full=join(directory,entry.name);if(entry.isDirectory())await walk(full);else if(extensions.has(extname(entry.name)))files.push(full)}}
for(const root of ['app','lib'])await walk(root);
const readOps=['findOne','find','aggregate','countDocuments','estimatedDocumentCount','distinct'];
const writeOps=['insertOne','insertMany','updateOne','updateMany','replaceOne','findOneAndUpdate','deleteOne','deleteMany','bulkWrite','createIndex'];
const paths=[];
for(const file of files){const lines=(await readFile(file,'utf8')).split(/\r?\n/);for(let i=0;i<lines.length;i++){if(!lines[i].includes('.collection('))continue;let end=Math.min(lines.length,i+100);for(let j=i+1;j<end;j++){if(lines[j].includes('.collection(')){end=j;break}}const window=lines.slice(i,end).join(' ');const literal=window.match(/\.collection\(\s*['"]([^'"]+)['"]\s*\)/);const detected=[...writeOps,...readOps].find((op)=>new RegExp(`\\.${op}\\s*\\(`).test(window));const operation=detected??'COLLECTION_HANDLE';const mode=writeOps.includes(operation)?'WRITE':readOps.includes(operation)?'READ':'DYNAMIC';paths.push({file:relative(process.cwd(),file).replaceAll('\\','/'),line:i+1,collection:literal?.[1]??'DYNAMIC',operation,mode,status:'ACTIVE_RUNTIME'})}}
const summary={calls:paths.length,reads:paths.filter(x=>x.mode==='READ').length,writes:paths.filter(x=>x.mode==='WRITE').length,dynamic:paths.filter(x=>x.collection==='DYNAMIC'||x.mode==='DYNAMIC').length,unknownOperations:paths.filter(x=>x.mode==='UNKNOWN').length};
const rank=(key)=>Object.entries(paths.reduce((counts,path)=>{const value=path[key];counts[value]=(counts[value]??0)+1;return counts},{})).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([name,calls])=>({name,calls}));
const burndown={generatedAt:new Date().toISOString(),baseline:{reads:350,writes:308,dynamic:150,unknown:30},current:{reads:summary.reads,writes:summary.writes,dynamic:summary.dynamic,unknown:summary.unknownOperations},topFiles:rank('file'),topCollections:rank('collection'),status:'IN_PROGRESS'};
await writeFile('migration-artifacts/runtime-mongo-paths.json',JSON.stringify({summary,paths},null,2)+'\n');
await writeFile('migration-artifacts/runtime-conversion-burndown.json',JSON.stringify(burndown,null,2)+'\n');console.log(JSON.stringify({summary,unknown:paths.filter((path)=>path.mode==='UNKNOWN')}));
