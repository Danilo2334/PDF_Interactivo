import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { load, owner, other, projectId, documentId } from './reinforcement-test-helpers.mjs';
const proof=load('lib/publications/proof.ts'), attemptProof=load('lib/readers/attempt-proof.ts');
async function fixture(){
 const db=new PGlite({extensions:{pgcrypto}}), previous=process.env.REINFORCEMENT_REQUEST_SECRET;
 const requestId=randomUUID(),sourceId=randomUUID(),quizId=randomUUID(),readerId=randomUUID();
 process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);
 create function private.can_manage_own_documents() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and is_active and role='owner')$$;
 create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
 grant usage on schema auth,private to authenticated;
 create table private.reinforcement_request_secrets(singleton boolean,secret text);insert into private.reinforcement_request_secrets values(true,repeat('a',64));
 create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,name text,status text);
 create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,original_name text,size_bytes bigint);
 create table public.reinforcement_requests(id uuid primary key,project_id uuid,document_id uuid,owner_id uuid,selection jsonb);
 create table public.reinforcement_review_heads(request_id uuid,approved_version_id uuid,current_version integer,decision text);
 create table public.reinforcement_review_versions(id uuid primary key,request_id uuid,title text);
 create table public.reinforcements(id uuid primary key,document_id uuid,page_number integer,title text,content jsonb,approved_version_id uuid,source_request_id uuid);
 create table public.reinforcement_cards(reinforcement_id uuid,approved_version_id uuid,initial_expanded boolean);
 create table public.reinforcement_media(id uuid,reinforcement_id uuid,approved_version_id uuid,status text,created_at timestamptz,title text);
 create table public.reinforcement_quiz_heads(request_id uuid,choice text,target_source_version_id uuid,approved_version_id uuid,current_version integer,decision text);
 create table public.reinforcement_quiz_versions(id uuid primary key,request_id uuid,version integer,source_version_id uuid,source jsonb,content jsonb);
 insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner');
 insert into public.documents values('${documentId}','${owner}','uploaded','${owner}/source.pdf','QA.pdf',1580);
 insert into public.projects values('${projectId}','${owner}','${documentId}','Isolated visibility QA','pending');
 insert into public.reinforcement_requests values('${requestId}','${projectId}','${documentId}','${owner}',null);
 insert into public.reinforcement_review_versions values('${sourceId}','${requestId}','Approved energy');
 insert into public.reinforcement_review_heads values('${requestId}','${sourceId}',1,'approved');
 insert into public.reinforcements values('${randomUUID()}','${documentId}',1,'Energy','{"text":"Approved energy remains constant."}','${sourceId}','${requestId}');
 insert into public.reinforcement_quiz_heads values('${requestId}','generate','${sourceId}','${quizId}',1,'approved');
 insert into public.reinforcement_quiz_versions values('${quizId}','${requestId}',1,'${sourceId}','{"documentId":"${documentId}"}','{"title":"Energy quiz","allowRetries":false,"questions":[{"prompt":"What remains constant?","options":["Total energy","No energy"],"correctIndex":0,"explanation":"The approved source conserves energy."}]}');`);
 const dir=new URL('../../supabase/migrations/',import.meta.url),files=readdirSync(dir);
 for(const suffix of ['_immutable_experience_publications.sql','_reader_identification_setting.sql','_quiz_reader_attempts.sql','_publication_visibility_controls.sql'])await db.exec(readFileSync(new URL(files.find(n=>n.endsWith(suffix)),dir),'utf8'));
 async function asUser(id=owner,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);}
 async function call(action,extra={},mutate=x=>x){const p=mutate(proof.signPublicationProof({action,projectId,documentId,userId:owner,operationId:randomUUID(),...extra}));return(await db.query('select public.change_experience_publication($1,$2) result',[p.p_payload,p.p_signature])).rows[0].result;}
 async function visibility(value,target,extra={}){return call('visibility',{publicationId:value.id,expectedVersion:value.visibilityVersion,visibility:target,confirmed:true,...(target==='public'?{origin:'https://isolated.example'}:{}),...extra});}
 async function attempt(pub,token,{practice=false,action='status'}={}){const p=attemptProof.signQuizAttempt({action,privateTest:practice,publicationId:pub.id,publicationHash:pub.hash,quizVersionId:quizId,readerId:practice?owner:readerId,identified:false,operationId:randomUUID(),answers:[0],...(practice?{userId:owner}:{publicationToken:token,origin:'https://isolated.example'})});return(await db.query(`select public.${practice?'change_quiz_practice':'change_quiz_reader_attempt'}($1,$2) result`,[p.p_payload,p.p_signature])).rows[0].result;}
 await asUser();
 return{db,asUser,call,visibility,attempt,async close(){await db.close();if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;}};
}
test('HU036 persists only confirmed current-owner changes, deduplicates retries and leaves immutable snapshots unchanged',async()=>{
 const f=await fixture();try{
  const first=await f.call('prepare');assert.equal(first.visibility,'private');assert.equal(first.visibilityVersion,0);
  const before=(await f.db.query('select snapshot,snapshot_hash from public.experience_publications where id=$1',[first.id])).rows[0];
  await assert.rejects(f.visibility(first,'unpublished',{confirmed:false}),e=>e.code==='23514');
  await assert.rejects(f.call('visibility',{publicationId:first.id,expectedVersion:0,visibility:'unpublished',confirmed:true},p=>({...p,p_signature:'f'.repeat(64)})),e=>e.code==='42501');
  const op=randomUUID(),withdrawn=await f.visibility(first,'unpublished',{operationId:op});assert.equal(withdrawn.visibilityVersion,1);assert.equal(withdrawn.url,null);
  assert.deepEqual(await f.visibility(first,'unpublished',{operationId:op}),withdrawn);
  await assert.rejects(f.visibility(first,'private'),e=>e.code==='PT409');
  await assert.rejects(f.visibility(withdrawn,'private',{operationId:op}),e=>e.code==='PT409');
  await assert.rejects(f.attempt({id:first.id,hash:before.snapshot_hash},null,{practice:true}),e=>e.code==='PT404');
  await f.asUser(other);assert.equal((await f.db.query('select * from public.publication_visibility_operations')).rows.length,0);await assert.rejects(f.visibility(withdrawn,'private'),e=>e.code==='42501');
  await f.asUser();const restored=await f.visibility(withdrawn,'private');assert.equal(restored.visibilityVersion,2);
  await f.visibility(restored,'private');const management=await f.call('management');assert.equal(management.events.length,2);assert.equal(management.current,null);
  assert.equal(management.events[0].to,'private');assert.equal(management.events[1].to,'unpublished');
  assert.doesNotMatch(JSON.stringify(management),/correctIndex|storagePath|snapshot_hash|token/);
  assert.deepEqual((await f.db.query('select snapshot,snapshot_hash from public.experience_publications where id=$1',[first.id])).rows[0],before);
  await assert.rejects(f.db.query("update public.experience_publications set visibility='public'"),e=>e.code==='42501');
  await f.asUser('','anon');await assert.rejects(f.call('management'),e=>e.code==='42501');await assert.rejects(f.db.query('select * from public.publication_visibility_operations'),e=>e.code==='42501');
 }finally{await f.close();}
});
test('HU036 isolated public/private/withdrawn transitions rotate retired URLs, guard grading, preserve attempts and never reactivate a superseded link',async()=>{
 const f=await fixture();try{
  let pub=await f.call('prepare');pub=await f.visibility(pub,'public');const token1=pub.url.split('/').pop();
  const raw=(await f.db.query('select snapshot_hash from public.experience_publications where id=$1',[pub.id])).rows[0];const attemptPub={id:pub.id,hash:raw.snapshot_hash};
  await f.asUser('','service_role');assert.equal((await f.attempt(attemptPub,token1,{action:'submit'})).feedback.score,1);
  await f.asUser();pub=await f.visibility(pub,'private');assert.equal(pub.url,null);const publishedDate=pub.publishedAt;
  await f.asUser('','service_role');await assert.rejects(f.attempt(attemptPub,token1),e=>e.code==='PT404');
  await f.asUser();pub=await f.visibility(pub,'public');const token2=pub.url.split('/').pop();assert.notEqual(token1,token2);assert.ok(Date.parse(pub.publishedAt)>=Date.parse(publishedDate));
  await f.asUser('','service_role');await assert.rejects(f.attempt(attemptPub,token1),e=>e.code==='PT404');assert.equal((await f.attempt(attemptPub,token2)).attempts,1);
  await f.asUser();const later=await f.call('prepare');let management=await f.call('management');assert.equal(management.latest.id,later.id);assert.equal(management.current.id,pub.id);
  const laterPublic=await f.visibility(later,'public');const withdrawn=await f.visibility(laterPublic,'unpublished');assert.equal(withdrawn.url,null);
  // The old row still carries its historical public state, but the newer retained
  // published_at prevents it from becoming current again after withdrawal.
  await f.asUser('','service_role');await assert.rejects(f.attempt(attemptPub,token2),e=>e.code==='PT404');
  await f.asUser();await assert.rejects(f.visibility(pub,'public'),e=>e.code==='PT409');management=await f.call('management');assert.equal(management.current.visibility,'unpublished');
  assert.equal((await f.db.query('select count(*) from public.quiz_reader_attempts')).rows[0].count,1);
  assert.equal((await f.db.query('select count(*) from public.quiz_practice_attempts')).rows[0].count,0);
 }finally{await f.close();}
});
test('HU036 two competing changes with the same saved visibility version cannot overwrite one another',async()=>{
 const f=await fixture();try{
  const pub=await f.call('prepare');const results=await Promise.allSettled([f.visibility(pub,'public'),f.visibility(pub,'unpublished')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'PT409');
  assert.equal((await f.db.query('select count(*) from public.publication_visibility_operations')).rows[0].count,1);
 }finally{await f.close();}
});
