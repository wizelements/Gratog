import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {transformDocument} from '../../scripts/migrate/transformers.mjs';
import {insertStatement} from '../../scripts/migrate/upsert-policy.mjs';

export function nativeSqlite(){
  const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');
  for(const f of readdirSync('db/migrations').filter(f=>f.endsWith('.sql')).sort())
    raw.exec(readFileSync('db/migrations/'+f,'utf8'));
  let inject=()=>{};
  const db={get:async(q,...a)=>raw.prepare(q).get(...a),all:async(q,...a)=>raw.prepare(q).all(...a),
    run:async(q,...a)=>{inject(q,a);return raw.prepare(q).run(...a)},
    transactionAsync:fn=>{
      const operation=async()=>{raw.exec('BEGIN IMMEDIATE');try{const r=await fn(db);raw.exec('COMMIT');return r}
        catch(e){raw.exec('ROLLBACK');throw e}};
      operation.immediate=operation;return operation;
    }};
  return {raw,db,inject:fn=>{inject=fn},close:()=>raw.close(),
    importDoc:(collection,doc,context={})=>{
      raw.exec('BEGIN IMMEDIATE');try{
        for(const statement of transformDocument(collection,doc,context).statements){
          const {sql,args}=insertStatement(statement.table,statement.row);raw.prepare(sql).run(...args);
        }raw.exec('COMMIT');
      }catch(e){raw.exec('ROLLBACK');throw e}
    }};
}
