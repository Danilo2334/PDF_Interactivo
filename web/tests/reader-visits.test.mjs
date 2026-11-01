import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const visits=load('lib/readers/visit-session.ts'),schemas=load('lib/validations/reader-visits.ts');
test('HU037 signed session is private, document-scoped, bounded and stable after a lost initial response',()=>{
 const previous=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  const op=randomUUID(),now=Date.now(),request=new Request('https://qa.example/api/read/x/visits');
  const first=visits.visitSession(request,op,now),retry=visits.visitSession(request,op,now+1000);
  assert.equal(first.nonce,retry.nonce);assert.doesNotMatch(first.cookie,new RegExp(op));
  const response=new Response();visits.attachVisitSession(response,first.cookie);const header=response.headers.get('set-cookie');
  assert.match(header,/HttpOnly; Secure; SameSite=Lax/);assert.match(header,/Path=\/api\/read; Max-Age=43200/);
  const req=new Request(request,{headers:{Cookie:header.split(';')[0]}});
  assert.equal(visits.visitSession(req,randomUUID(),now+1000).nonce,first.nonce);assert.equal(visits.visitSession(req,undefined,now+1000).cookie,null);
  assert.notEqual(visits.documentVisitor(documentId,first.nonce),visits.documentVisitor(other,first.nonce));
  assert.notEqual(visits.visitSession(req,randomUUID(),now+43200001).nonce,first.nonce);
  assert.notEqual(visits.visitSession(new Request(request,{headers:{Cookie:header.split(';')[0]+'x'}}),randomUUID(),now).nonce,first.nonce);
  const signed=visits.signReaderOpen({operationId:op});assert.equal(signed.p_signature,createHmac('sha256','a'.repeat(64)).update(signed.p_payload).digest('hex'));
  assert.equal(JSON.parse(signed.p_payload).operation,'reader-open');
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;}
});
test('HU037 API rejects foreign origin, private/owner openings, stale context and unauthorized totals',async()=>{
 const previous=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  let access={ok:false,status:401,message:'Login'},privateTest=false,identified=true,required=false,reader=true,denied=false,project={owner_id:owner,document_id:documentId,status:'pending'},error=null;
  const calls=[];class ReaderUnavailable extends Error{constructor(){super('Unavailable');this.status=404;}}
  const db={from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return{data:project,error:null};}}),rpc:async(name,proof)=>{calls.push({name,proof});return{data:name==='record_reader_open'?{recorded:true,visitId:randomUUID(),occurredAt:new Date().toISOString()}:{total:3,lastVisitedAt:null,windowMinutes:30},error};}};
  const api=load('lib/readers/visit-service.ts',{
   '@/lib/auth/access':{getCurrentAccess:async()=>access,checkPermission:async()=>access},'@/lib/supabase/server':{createClient:async()=>db},
   '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='https://qa.example'},
   '@/lib/reinforcements/request-service':{readSmallJson:async r=>({body:await r.json()}),reply:(body,status=200)=>Response.json(body,{status})},
   '@/lib/readers/repository':{ReaderUnavailable,serverClient:()=>db,loadReader:async()=>{if(denied)throw new ReaderUnavailable();return{id:randomUUID(),documentId,ownerId:owner,privateTest,accessVersion:1,hash:'b'.repeat(64),snapshot:{requireIdentification:required},db};}},
   '@/lib/readers/session':{getReaderSession:()=>reader?{identified}:null},'@/lib/publications/proof':{publicationOrigin:()=> 'https://qa.example'},
   '@/lib/readers/visit-session':visits,'@/lib/validations/reader-visits':schemas,
  });
  const post=(input={operationId:randomUUID()},origin='https://qa.example')=>api.postReaderOpen(new Request('https://qa.example/api/read/token/visits',{method:'POST',headers:{Origin:origin},body:JSON.stringify(input)}),'token');
  const total=()=>api.getVisitTotals(new Request('https://qa.example/api/projects/'+projectId+'/visits?documentId='+documentId),projectId);
  assert.equal((await post(undefined,'https://foreign.example')).status,403);assert.equal((await post({operationId:randomUUID(),occurredAt:'forged'})).status,400);
  privateTest=true;assert.equal((await(await post()).json()).recorded,false);assert.equal(calls.length,0);privateTest=false;
  access={ok:true,userId:owner,role:'owner'};assert.equal((await(await post()).json()).recorded,false);assert.equal(calls.length,0);
  access={ok:false,status:401,message:'Login'};reader=false;assert.equal((await post()).status,428);reader=true;required=true;identified=false;assert.equal((await post()).status,428);required=false;
  const result=await post();assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/pdf_visit_session=/);assert.equal(calls.length,1);
  const p=JSON.parse(calls[0].proof.p_payload);assert.match(p.visitorHash,/^[a-f0-9]{64}$/);assert.equal(p.accessVersion,1);assert.doesNotMatch(JSON.stringify(p),/email|userAgent|ipAddress|nonce/);
  denied=true;assert.equal((await post()).status,404);denied=false;error={code:'PT404'};assert.equal((await post()).status,404);error=null;
  assert.equal((await total()).status,401);access={ok:false,status:403,message:'Permission'};assert.equal((await total()).status,403);
  access={ok:true,userId:other,role:'owner'};assert.equal((await total()).status,404);access={ok:true,userId:owner,role:'owner'};assert.equal((await(await total()).json()).total,3);
  access={ok:true,userId:other,role:'admin'};assert.equal((await total()).status,200);project={...project,document_id:other};assert.equal((await total()).status,409);
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;}
});
test('HU037 PostgreSQL serializes deduplication, preserves idempotence, checks publication and isolates aggregates with RLS',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),previous=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 const pub=randomUUID(),op=randomUUID(),visitor='c'.repeat(64),admin=randomUUID(),viewer=randomUUID();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,private to authenticated,service_role;
   create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);grant select on public.profiles to authenticated;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);insert into private.reinforcement_request_secrets values(true,repeat('a',64));
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,status text);
   create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,size_bytes bigint);
   create table public.experience_publications(id uuid primary key,project_id uuid,document_id uuid,owner_id uuid,version integer,snapshot jsonb,snapshot_hash text,token text,published_at timestamptz,origin text,visibility text,visibility_version integer);
   insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner'),('${admin}',true,'admin'),('${viewer}',true,'viewer');
   insert into public.projects values('${projectId}','${owner}','${documentId}','pending');insert into public.documents values('${documentId}','${owner}','uploaded','original.pdf',100);`);
  await db.query('insert into public.experience_publications values($1,$2,$3,$4,1,$5,$6,$7,now(),$8,$9,1)',[pub,projectId,documentId,owner,JSON.stringify({document:{storagePath:'original.pdf',sizeBytes:100},requireIdentification:false}),'b'.repeat(64),'d'.repeat(48),'https://qa.example','public']);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261101061105_reader_open_visits.sql',import.meta.url),'utf8'));
  async function role(user='',name='service_role'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role '+name);}
  async function open(extra={},mutate=x=>x){const p=mutate(visits.signReaderOpen({operationId:randomUUID(),publicationId:pub,publicationHash:'b'.repeat(64),publicationToken:'d'.repeat(48),accessVersion:1,origin:'https://qa.example',visitorHash:visitor,identified:false,...extra}));return(await db.query('select public.record_reader_open($1,$2) result',[p.p_payload,p.p_signature])).rows[0].result;}
  async function total(){return(await db.query('select public.get_document_visit_totals($1,$2) result',[projectId,documentId])).rows[0].result;}
  await role();const first=await open({operationId:op});assert.equal(first.recorded,true);assert.equal(first.visitId,op);
  const repeated=await open();assert.equal(repeated.recorded,false);assert.equal(repeated.visitId,op);assert.equal((await open({operationId:op})).occurredAt,first.occurredAt);
  assert.equal((await open({visitorHash:'e'.repeat(64)})).recorded,true);
  await assert.rejects(open({},p=>({...p,p_signature:'f'.repeat(64)})),e=>e.code==='42501');
  for(const extra of [{accessVersion:0},{publicationHash:'f'.repeat(64)},{publicationToken:'e'.repeat(48)},{origin:'https://wrong.example'}])await assert.rejects(open(extra),e=>e.code==='PT404');
  await assert.rejects(db.query('insert into public.reader_open_visits(id) values(gen_random_uuid())'),e=>e.code==='42501');
  await role(owner,'authenticated');assert.equal((await total()).total,2);assert.equal((await db.query('select * from public.reader_open_visits')).rows.length,2);await assert.rejects(open(),e=>e.code==='42501');
  await role(other,'authenticated');assert.equal((await total()).total,0);await role(viewer,'authenticated');assert.equal((await total()).total,0);await role(admin,'authenticated');assert.equal((await total()).total,2);
  await db.exec('reset role');await db.query('update public.profiles set is_active=false where id=$1',[owner]);await role(owner,'authenticated');assert.equal((await total()).total,0);
  await db.exec('reset role');await db.query('update public.profiles set is_active=true where id=$1',[owner]);
  // Time manipulation is confined to this isolated database fixture, never the QA evidence.
  await db.query("update public.reader_open_visits set occurred_at=clock_timestamp()-interval '31 minutes' where id=$1",[op]);await role();assert.equal((await open()).recorded,true);
  await db.exec('reset role');await db.query("update public.experience_publications set visibility='private'");await role();await assert.rejects(open(),e=>e.code==='PT404');
  await db.exec('reset role');await db.query("update public.experience_publications set visibility='public',snapshot=jsonb_set(snapshot,'{requireIdentification}','true')");await role();await assert.rejects(open(),e=>e.code==='42501');assert.equal((await open({identified:true})).recorded,false);
  await role('','anon');await assert.rejects(total(),e=>e.code==='42501');await assert.rejects(db.query('select * from public.reader_open_visits'),e=>e.code==='42501');
  await role(owner,'authenticated');for(const sql of ['update public.reader_open_visits set source=source','delete from public.reader_open_visits'])await assert.rejects(db.query(sql),e=>e.code==='42501');
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
