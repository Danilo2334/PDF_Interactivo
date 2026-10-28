import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const proof=load('lib/publications/proof.ts'),schemas=load('lib/validations/publication.ts');

test('HU032 publication requires an explicitly verified HTTPS origin, never the request host or localhost',()=>{
 const original={origin:process.env.PUBLICATION_ORIGIN,verified:process.env.PUBLICATION_HTTPS_VERIFIED};
 try{
  process.env.PUBLICATION_HTTPS_VERIFIED='true';
  for(const origin of ['http://localhost:3000','https://localhost','https://127.0.0.1','https://app.localhost','https://app.invalid','https://example.com','https://user:pass@app.vercel.app','https://app.vercel.app:8443','https://app.vercel.app/path','https://app.vercel.app?x=1']){process.env.PUBLICATION_ORIGIN=origin;assert.equal(proof.publicationOrigin(),null,origin);}
  process.env.PUBLICATION_ORIGIN='https://pdf-interactivo.vercel.app';assert.equal(proof.publicationOrigin(),'https://pdf-interactivo.vercel.app');
  process.env.PUBLICATION_HTTPS_VERIFIED='false';assert.equal(proof.publicationOrigin(),null);
  assert.equal(schemas.publicationInputSchema.safeParse({action:'publish',documentId,operationId:randomUUID(),confirmed:false}).success,false);
 }finally{for(const[key,value]of[['PUBLICATION_ORIGIN',original.origin],['PUBLICATION_HTTPS_VERIFIED',original.verified]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

test('HU032 real PostgreSQL snapshot filters approvals atomically, remains fixed, enforces owner/proof/idempotency and publishes only explicitly',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),previous=process.env.REINFORCEMENT_REQUEST_SECRET;
 const requestId=randomUUID(),reinforcementId=randomUUID(),versionId=randomUUID(),quizId=randomUUID(),pendingQuizId=randomUUID();
 try{
  // Isolated database fixtures only. No production state or AI output is fabricated.
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);
   create function private.can_manage_own_documents() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and is_active and role='owner')$$;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   grant usage on schema auth,private to authenticated;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);
   insert into private.reinforcement_request_secrets values(true,repeat('a',64));
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,name text,status text);
   create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,original_name text,size_bytes bigint);
   create table public.reinforcement_requests(id uuid primary key,project_id uuid,document_id uuid,owner_id uuid,selection jsonb);
   create table public.reinforcement_review_heads(request_id uuid,approved_version_id uuid,current_version integer,decision text);
   create table public.reinforcement_review_versions(id uuid primary key,request_id uuid,title text);
   create table public.reinforcements(id uuid primary key,document_id uuid,page_number integer,title text,content jsonb,approved_version_id uuid,source_request_id uuid);
   create table public.reinforcement_cards(reinforcement_id uuid,approved_version_id uuid,initial_expanded boolean);
   create table public.reinforcement_media(id uuid,reinforcement_id uuid,approved_version_id uuid,status text,created_at timestamptz,title text);
   create table public.reinforcement_quiz_heads(request_id uuid,choice text,target_source_version_id uuid,approved_version_id uuid,current_version integer,decision text);
   create table public.reinforcement_quiz_versions(id uuid,request_id uuid,version integer,source_version_id uuid,source jsonb,content jsonb);
   insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner');
   insert into public.documents values('${documentId}','${owner}','uploaded','private/source.pdf','Original.pdf',1580);
   insert into public.projects values('${projectId}','${owner}','${documentId}','Publication fixture','pending');
   insert into public.reinforcement_requests values('${requestId}','${projectId}','${documentId}','${owner}',null);
   insert into public.reinforcement_review_versions values('${versionId}','${requestId}','Approved');
   insert into public.reinforcement_review_heads values('${requestId}','${versionId}',2,'pending');
   insert into public.reinforcements values('${reinforcementId}','${documentId}',1,'Approved','{"text":"Fixed approved content"}','${versionId}','${requestId}');
   insert into public.reinforcement_cards values('${reinforcementId}','${versionId}',true);
   insert into public.reinforcement_media values('${randomUUID()}','${reinforcementId}','${versionId}','approved',now(),'Approved resource'),('${randomUUID()}','${reinforcementId}','${versionId}','removed',now(),'Removed resource'),('${randomUUID()}','${reinforcementId}','${versionId}','uploading',now(),'Pending resource');
   insert into public.reinforcement_quiz_heads values('${requestId}','generate','${versionId}','${quizId}',2,'pending');
   insert into public.reinforcement_quiz_versions values('${quizId}','${requestId}',1,'${versionId}','{"documentId":"${documentId}"}','{"title":"Approved quiz","questions":[{"correctIndex":1,"explanation":"PRIVATE_KEY"}]}'),('${pendingQuizId}','${requestId}',2,'${versionId}','{"documentId":"${documentId}"}','{"title":"Pending quiz"}');`);
  const dir=new URL('../../supabase/migrations/',import.meta.url),file=readdirSync(dir).find(n=>n.endsWith('_immutable_experience_publications.sql'));
  await db.exec(readFileSync(new URL(file,dir),'utf8'));process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
  async function asUser(id=owner,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);}
  async function call(action,operationId,extra={},mutate=x=>x){const signed=mutate(proof.signPublicationProof({action,operationId,projectId,documentId,userId:owner,...extra}));return(await db.query('select public.change_experience_publication($1,$2) result',[signed.p_payload,signed.p_signature])).rows[0].result;}
  const operation=randomUUID();await asUser();const receipt=await call('prepare',operation);
  assert.deepEqual(receipt.counts,{reinforcements:1,media:1,quizzes:1});assert.equal(receipt.url,null);assert.equal(receipt.publishedAt,null);
  assert.doesNotMatch(JSON.stringify(receipt),/PRIVATE_KEY|correctIndex|storagePath/);assert.deepEqual(await call('prepare',operation),receipt);
  const first=(await db.query('select snapshot,snapshot_hash from public.experience_publications')).rows[0];assert.equal(first.snapshot.items[0].quiz.id,quizId);assert.equal(first.snapshot.items[0].initialExpanded,true);
  await assert.rejects(db.query('update public.experience_publications set snapshot=\'{}\''),e=>e.code==='42501');
  await assert.rejects(call('prepare',randomUUID(),{},x=>({...x,p_signature:'f'.repeat(64)})),e=>e.code==='42501');
  await assert.rejects(call('prepare',randomUUID(),{operation:'reinforcement-quiz'},x=>({...x,p_payload:x.p_payload+' '})),e=>e.code==='42501');
  await asUser(other);assert.equal((await db.query('select * from public.experience_publications')).rows.length,0);await assert.rejects(call('prepare',randomUUID()),e=>e.code==='42501');
  await asUser('', 'anon');await assert.rejects(call('status',randomUUID()),e=>e.code==='42501');await assert.rejects(db.query('select * from public.experience_publications'),e=>e.code==='42501');
  await asUser();await assert.rejects(call('publish',operation,{origin:'http://localhost',confirmed:true}),e=>e.code==='23514');
  // HTTPS value is only an isolated contract fixture, not an observed deployment.
  const published=await call('publish',operation,{origin:'https://isolated.example',confirmed:true});assert.match(published.url,/^https:\/\/isolated\.example\/read\/[a-f0-9]{48}$/);assert.ok(published.publishedAt);
  assert.deepEqual(await call('publish',operation,{origin:'https://isolated.example',confirmed:true}),published);
  await db.exec('reset role');await db.exec(`update public.reinforcements set title='Changed after snapshot';update public.reinforcement_quiz_heads set choice='omit';update public.reinforcement_media set status='removed';`);
  await asUser();assert.deepEqual((await db.query('select snapshot,snapshot_hash from public.experience_publications where id=$1',[operation])).rows[0],first);
  const second=await call('prepare',randomUUID());assert.equal(second.version,2);assert.deepEqual(second.counts,{reinforcements:1,media:0,quizzes:0});
  const oldPrepared=randomUUID();await call('prepare',oldPrepared);await call('prepare',randomUUID());await assert.rejects(call('publish',oldPrepared,{origin:'https://isolated.example',confirmed:true}),e=>e.code==='PT409');
  await db.exec('reset role');await db.exec(`update public.projects set document_id='${randomUUID()}'`);await asUser();await assert.rejects(call('prepare',randomUUID()),e=>e.code==='PT409');
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
