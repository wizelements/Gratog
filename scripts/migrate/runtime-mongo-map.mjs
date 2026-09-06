import { readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
const extensions = new Set(['.js','.jsx','.ts','.tsx']); const files=[];
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const full=join(directory,entry.name);if(entry.isDirectory())await walk(full);else if(extensions.has(extname(entry.name)))files.push(full)}}
for(const root of ['app','lib'])await walk(root);
const readOps=['findOne','find','aggregate','countDocuments','estimatedDocumentCount','distinct'];
const writeOps=['insertOne','insertMany','updateOne','updateMany','replaceOne','findOneAndUpdate','deleteOne','deleteMany','bulkWrite','createIndex'];
const paths=[];
for(const file of files){const lines=(await readFile(file,'utf8')).split(/\r?\n/);for(let i=0;i<lines.length;i++){if(!lines[i].includes('.collection('))continue;const window=lines.slice(i,i+6).join(' ');const literal=window.match(/\.collection\(\s*['"]([^'"]+)['"]\s*\)/);const operation=[...writeOps,...readOps].find((op)=>new RegExp(`\\.${op}\\s*\\(`).test(window))??'UNKNOWN';paths.push({file:relative(process.cwd(),file).replaceAll('\\','/'),line:i+1,collection:literal?.[1]??'DYNAMIC',operation,mode:writeOps.includes(operation)?'WRITE':readOps.includes(operation)?'READ':'UNKNOWN',status:'ACTIVE_RUNTIME'})}}
const summary={calls:paths.length,reads:paths.filter(x=>x.mode==='READ').length,writes:paths.filter(x=>x.mode==='WRITE').length,dynamic:paths.filter(x=>x.collection==='DYNAMIC').length,unknownOperations:paths.filter(x=>x.mode==='UNKNOWN').length};
await writeFile('migration-artifacts/runtime-mongo-paths.json',JSON.stringify({summary,paths},null,2)+'\n');console.log(JSON.stringify(summary));
