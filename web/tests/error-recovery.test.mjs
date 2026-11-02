import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {createHmac,randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {PDFDocument} from 'pdf-lib';
import {load,owner,other} from './reinforcement-test-helpers.mjs';

test('HU045 origin checks use the actual target Host, reject forwarded-host spoofing and retain exact scheme/port',()=>{
 const {isSameOriginMutation}=load('lib/documents/mutation-request.ts');
 const req=(origin,host='127.0.0.1:3001')=>new Request('http://localhost:3001/api/documents/upload',{headers:{origin,host,'x-forwarded-host':'attacker.example'}});
 assert.equal(isSameOriginMutation(req('http://127.0.0.1:3001')),true);
 for(const origin of ['http://attacker.example','https://127.0.0.1:3001','http://127.0.0.1:3002','null'])assert.equal(isSameOriginMutation(req(origin)),false);
 assert.equal(isSameOriginMutation(req('http://localhost:3001','evil.example/path')),false);
});

test('HU045 browser recovery reuses the operation after reload, separates accounts and files, and stores no filename or bytes',async()=>{
 const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 const mod=load('lib/documents/upload-operation.ts',{}, {TextEncoder});
 const file=new File(['%PDF-QA_PRIVATE_CONTENT'],'QA-private-file.pdf',{type:'application/pdf'});
 const original=await mod.chooseUploadOperation(file,owner,storage);
 assert.equal(await mod.chooseUploadOperation(file,owner,storage),original);
 assert.notEqual(await mod.chooseUploadOperation(file,other,storage),original);
 assert.doesNotMatch(JSON.stringify([...entries]),/QA_PRIVATE|QA-private-file|%PDF/);
 assert.notEqual(await mod.chooseUploadOperation(new File(['changed'],'QA-private-file.pdf'),owner,storage),original);
 mod.clearUploadOperation(owner,storage);assert.notEqual(await mod.chooseUploadOperation(file,owner,storage),original);
 assert.match(await mod.chooseUploadOperation(file,owner,{getItem(){throw Error()},setItem(){throw Error()}}),/^[a-f0-9-]{36}$/);
});

test('HU045 upload API validates permissions and real PDF bytes, resumes identical transfer, returns saved receipt and preserves ambiguous bytes',async()=>{
 const pdf=await PDFDocument.create();pdf.addPage([200,200]);const bytes=await pdf.save();
 const file=new File([bytes],'QA-recovery.pdf',{type:'application/pdf'}),operation=randomUUID(),records=[];
 const diagnostics=load('lib/diagnostics/operation.ts',{}, {console:{error:s=>records.push(JSON.parse(s))}});
 let access={ok:true,userId:owner},events=[],receipt=null,uploadError=null,storedBytes=bytes,rpcError=null;
 const db={storage:{from(){return{async upload(){events.push('upload');return{error:uploadError}},async download(){events.push('download');return{data:new Blob([storedBytes])}}}}},async rpc(name,args){events.push(args.action);return{data:receipt??{state:'pending'},error:rpcError}}};
 const route=load('app/api/documents/upload/route.ts',{'pdf-lib':{PDFDocument},'@/lib/auth/access':{checkPermission:async()=>access},
  '@/lib/documents/mutation-request':load('lib/documents/mutation-request.ts'),'@/lib/documents/upload-proof':{uploadFingerprint:()=> 'b'.repeat(64),signUploadProof:v=>v},
  '@/lib/diagnostics/operation':diagnostics,'@/lib/supabase/server':{createClient:async()=>db},'@/lib/validations/pdf-file':load('lib/validations/pdf-file.ts')});
 const run=(selected=file,origin='https://qa.example')=>{const form=new FormData();form.set('operationId',operation);form.set('file',selected);return route.POST(new Request('https://qa.example/api/documents/upload',{method:'POST',headers:{origin},body:form}))};
 assert.equal((await run(file,'https://other.example')).status,403);assert.deepEqual(events,[]);
 access={ok:false,status:401,message:'Inicia sesión'};assert.equal((await run()).status,401);assert.deepEqual(events,[]);access={ok:true,userId:owner};
 assert.equal((await run(new File(['%PDF-invalid'],'corrupt.pdf',{type:'application/pdf'}))).status,422);assert.deepEqual(events,[]);
 receipt={state:'completed',project:{id:operation,name:'Confirmado',status:'pending'},document:{id:operation,name:file.name,size:file.size,pageCount:1}};
 assert.equal((await run()).status,200);assert.deepEqual(events,['prepare']);events=[];receipt=null;uploadError={message:'QA_PRIVATE_UPSTREAM'};
 assert.equal((await run()).status,503);assert.deepEqual(events,['prepare','upload','download','commit']);events=[];
 storedBytes=new Uint8Array([1,2,3]);assert.equal((await run()).status,409);assert.deepEqual(events,['prepare','upload','download']);events=[];
 storedBytes=bytes;uploadError=null;rpcError={code:'08006',message:'QA_PRIVATE_UPSTREAM'};assert.equal((await run()).status,503);assert.deepEqual(events,['prepare']);
 assert.doesNotMatch(JSON.stringify(records),/QA_PRIVATE|QA-recovery|corrupt\.pdf/);
});

test('HU045 diagnostic reference traces expected, business and unexpected failures without private inputs or upstream errors',async()=>{
 const records=[],secret='QA_PRIVATE_TOKEN_AND_TEXT';
 const {withOperationDiagnostics}=load('lib/diagnostics/operation.ts',{}, {console:{error:s=>records.push(JSON.parse(s))}});
 for(const [status,body] of [[422,{code:'INVALID_PDF',message:'Selecciona otro PDF.'}],[200,{generation:{status:'error',error_code:'timeout',content:secret}}]]){
  const response=await withOperationDiagnostics('pdf.upload',async()=>Response.json(body,{status}))(new Request('https://qa.example/?token='+secret,{headers:{authorization:secret}}));
  const value=await response.json(),record=records.at(-1);
  assert.equal(response.status,status);assert.equal(value.reference,record.reference);assert.equal(response.headers.get('x-operation-reference'),record.reference);
  assert.equal(record.code,status===200?'timeout':'INVALID_PDF');assert.ok(!Number.isNaN(Date.parse(record.date)));
 }
 const failed=await withOperationDiagnostics('reinforcement.regeneration',async()=>{throw Error(secret)})(new Request('https://qa.example/'));
 assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),new RegExp(secret));
 assert.doesNotMatch(JSON.stringify(records),/QA_PRIVATE|authorization|content|stack|https/);
 assert.deepEqual(Object.keys(records[0]).sort(),['code','date','elapsedMs','event','operation','reference','status']);
 const ok=await withOperationDiagnostics('pdf.upload',async()=>Response.json({ok:true}))(new Request('https://qa.example/'));
 assert.deepEqual(await ok.json(),{ok:true});assert.equal(records.length,3);
});

test('HU045 PostgreSQL atomically commits an upload once, rejects changed proofs, recovers receipt and never resurrects deletion',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),secret='a'.repeat(64),operation=randomUUID(),next=randomUUID();
 const files=readdirSync(new URL('../../supabase/migrations/',import.meta.url)).filter(n=>n.endsWith('_idempotent_pdf_uploads.sql'));
 assert.equal(files.length,1);
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;create schema storage;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${other}');
   create table public.profiles(id uuid primary key,role text,is_active boolean);insert into public.profiles values('${owner}','owner',true),('${other}','owner',true);
   create function private.can_manage_own_documents() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and is_active)$$;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);insert into private.reinforcement_request_secrets values(true,'${secret}');
   create table public.documents(id uuid primary key,owner_id uuid,original_name text,storage_path text unique,size_bytes bigint,mime_type text,status text);
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid references public.documents(id),name text,status text);
   create table storage.objects(bucket_id text,name text,metadata jsonb);
   grant usage on schema private,auth to authenticated;`);
  await db.exec(readFileSync(new URL('../../supabase/migrations/'+files[0],import.meta.url),'utf8'));
  async function asUser(id=owner,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role)}
  function proof(action,key=operation,extra={}){const p=JSON.stringify({purpose:'pdf-upload',userId:owner,operationId:key,action,fingerprint:'b'.repeat(64),originalName:'QA-recuperación.pdf',sizeBytes:100,pageCount:2,expiresAt:Math.floor(Date.now()/1000)+300,...extra});return[p,createHmac('sha256',secret).update(p).digest('hex')]}
  const call=async(...args)=>(await db.query('select public.recover_document_upload($1,$2) as value',proof(...args))).rows[0].value;
  await asUser();assert.equal((await call('prepare')).state,'pending');
  await assert.rejects(()=>call('commit'),e=>e.code==='PT409');
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.documents')).rows[0].n,0);
  await db.query('insert into storage.objects values($1,$2,$3)', ['pdf-documents',`${owner}/${operation}.pdf`,JSON.stringify({size:100})]);
  await asUser();const first=await call('commit');assert.equal(first.state,'completed');assert.equal(first.project.id,operation);
  assert.deepEqual(await call('commit'),first);assert.deepEqual(await call('prepare'),first);
  await assert.rejects(()=>call('prepare',operation,{fingerprint:'c'.repeat(64)}),e=>e.code==='PT409');
  await assert.rejects(()=>call('prepare',operation,{purpose:'other'}),e=>e.code==='42501');
  await assert.rejects(()=>call('prepare',operation,{expiresAt:1}),e=>e.code==='42501');
  await assert.rejects(()=>db.query('select public.recover_document_upload($1,$2)',[proof('prepare')[0],'0'.repeat(64)]),e=>e.code==='42501');
  await asUser(other);await assert.rejects(()=>call('prepare'),e=>e.code==='42501');
  await assert.rejects(()=>db.query('select * from private.pdf_upload_operations'),e=>e.code==='42501');
  await asUser('', 'anon');await assert.rejects(()=>call('prepare'),e=>e.code==='42501');
  await db.exec('reset role');await db.query("update public.projects set name='Nombre confirmado' where id=$1",[operation]);
  await asUser();assert.equal((await call('prepare')).project.name,'Nombre confirmado');
  // Force the second INSERT to fail: the document INSERT must roll back too.
  await db.exec('reset role');await db.query("insert into public.projects values($1,$2,null,'conflicto','pending')",[next,owner]);
  await db.query('insert into storage.objects values($1,$2,$3)',['pdf-documents',`${owner}/${next}.pdf`,JSON.stringify({size:100})]);
  await asUser();await call('prepare',next);await assert.rejects(()=>call('commit',next),e=>e.code==='23505');
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.documents where id=$1',[next])).rows[0].n,0);
  await db.query('delete from public.projects where id=$1',[next]);await asUser();assert.equal((await call('commit',next)).state,'completed');
  await db.exec('reset role');await db.query('delete from public.projects where id=$1',[operation]);await db.query('delete from public.documents where id=$1',[operation]);
  assert.equal((await db.query('select fingerprint from private.pdf_upload_operations where operation_id=$1',[operation])).rows[0].fingerprint,null);
  await asUser();assert.equal((await call('prepare')).state,'gone');assert.equal((await call('commit')).state,'gone');
 }finally{await db.close()}
});
