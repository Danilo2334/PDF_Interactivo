import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const proof=load('lib/readers/attempt-proof.ts');
test('HU030 PostgreSQL grades immutable approved snapshots once, separates exercises, enforces retry/role/reader/version and returns only that reader result',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),previous=process.env.REINFORCEMENT_REQUEST_SECRET;
 const publicationId=randomUUID(),quizId=randomUUID(),sourceId=randomUUID(),requestId=randomUUID(),readerId=randomUUID(),secondReader=randomUUID();
 const quiz={title:'Approved quiz',allowRetries:false,questions:[{prompt:'Conservation?',options:['Conserved','Disappears'],correctIndex:0,explanation:'The total energy is conserved.'},{prompt:'Condition?',options:['Friction','No friction'],correctIndex:1,explanation:'The ideal pendulum has no friction.'}]};
 const snapshot={requireIdentification:false,document:{id:documentId,storagePath:owner+'/original.pdf',sizeBytes:100},items:[{requestId,sourceVersionId:sourceId,quiz:{id:quizId,content:quiz}}]};
 try{
  process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);
   create function private.can_manage_own_documents() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and is_active and role='owner')$$;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   grant usage on schema auth,private to authenticated;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);insert into private.reinforcement_request_secrets values(true,repeat('a',64));
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,status text);
   create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,size_bytes bigint);
   create table public.experience_publications(id uuid primary key,project_id uuid,document_id uuid,owner_id uuid,version integer,snapshot jsonb,snapshot_hash text,token text,published_at timestamptz,origin text);
   create table public.reinforcement_quiz_versions(id uuid primary key,source_version_id uuid,request_id uuid);
   insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner');
   insert into public.projects values('${projectId}','${owner}','${documentId}','pending');insert into public.documents values('${documentId}','${owner}','uploaded','${owner}/original.pdf',100);
   insert into public.reinforcement_quiz_versions values('${quizId}','${sourceId}','${requestId}');`);
  await db.query('insert into public.experience_publications values($1,$2,$3,$4,1,$5,$6,null,null,null)',[publicationId,projectId,documentId,owner,JSON.stringify(snapshot),'b'.repeat(64)]);
  const dir=new URL('../../supabase/migrations/',import.meta.url);await db.exec(readFileSync(new URL(readdirSync(dir).find(n=>n.endsWith('_quiz_reader_attempts.sql')),dir),'utf8'));
  async function asUser(user=owner,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec(`set role ${role}`);}
  async function call(action='submit',extra={},practice=true,mutate=x=>x){const args=mutate(proof.signQuizAttempt({action,privateTest:practice,userId:owner,readerId:practice?owner:readerId,identified:false,publicationId,publicationHash:'b'.repeat(64),quizVersionId:quizId,operationId:randomUUID(),answers:[0,1],publicationToken:'c'.repeat(48),origin:'https://isolated.example',...extra}));return(await db.query(`select public.${practice?'change_quiz_practice':'change_quiz_reader_attempt'}($1,$2) result`,[args.p_payload,args.p_signature])).rows[0].result;}
  await asUser();assert.deepEqual(await call('status'),{latest:null,attempts:0,allowRetries:false});
  const op=randomUUID(),first=await call('submit',{operationId:op,answers:[0,0]});assert.equal(first.number,1);assert.equal(first.feedback.score,1);assert.equal(first.feedback.total,2);assert.deepEqual(first.feedback.questions.map(q=>q.correct),[true,false]);assert.equal(first.privateTest,true);
  assert.deepEqual(await call('submit',{operationId:op,answers:[0,0]}),first);assert.deepEqual((await call('status')).latest,first);
  await assert.rejects(call('submit',{operationId:op,answers:[1,1]}),e=>e.code==='PT409');await assert.rejects(call(),e=>e.code==='PT409');
  for(const answers of [[],[0],[2,0],[-1,0],[0.5,1],[0,1,0]])await assert.rejects(call('submit',{answers}),e=>e.code==='23514');
  await assert.rejects(call('submit',{},true,x=>({...x,p_signature:'f'.repeat(64)})),e=>e.code==='42501');
  for(const sql of ["update public.quiz_practice_attempts set score=2","delete from public.quiz_practice_attempts","insert into public.quiz_practice_attempts(id) values(gen_random_uuid())"])await assert.rejects(db.query(sql),e=>e.code==='42501');
  assert.equal((await db.query('select count(*) from public.quiz_reader_attempts')).rows[0].count,0);
  await asUser(other);assert.equal((await db.query('select * from public.quiz_practice_attempts')).rows.length,0);await assert.rejects(call(),e=>e.code==='42501');
  await asUser('','anon');await assert.rejects(call(),e=>e.code==='42501');await assert.rejects(db.query('select * from public.quiz_reader_attempts'),e=>e.code==='42501');
  await asUser();await assert.rejects(call('submit',{},false),e=>e.code==='42501');
  await asUser('','service_role');await assert.rejects(call('submit',{},false),e=>e.code==='PT404');
  // Isolated publication fixture only, never evidence of a deployed/public project.
  await db.exec('reset role');await db.query('update public.experience_publications set token=$1,published_at=now(),origin=$2',[ 'c'.repeat(48),'https://isolated.example']);
  await asUser('','service_role');const live=await call('submit',{},false);assert.equal(live.feedback.score,2);assert.equal(live.privateTest,false);
  assert.equal((await call('status',{},false)).attempts,1);assert.equal((await call('status',{readerId:secondReader},false)).latest,null);
  await assert.rejects(call('submit',{},false),e=>e.code==='PT409');
  await db.exec('reset role');snapshot.items[0].quiz.content.allowRetries=true;await db.query('update public.experience_publications set snapshot=$1',[JSON.stringify(snapshot)]);
  await asUser('','service_role');const retried=await call('submit',{answers:[1,0]},false);assert.equal(retried.number,2);assert.equal(retried.feedback.score,0);assert.equal((await db.query('select count(*) from public.quiz_reader_attempts')).rows[0].count,2);
  await db.exec('reset role');snapshot.requireIdentification=true;await db.query('update public.experience_publications set snapshot=$1',[JSON.stringify(snapshot)]);
  await asUser('','service_role');await assert.rejects(call('submit',{readerId:secondReader},false),e=>e.code==='42501');assert.equal((await call('submit',{readerId:secondReader,identified:true},false)).number,1);
  await db.exec('reset role');await db.query('update public.experience_publications set published_at=null');await asUser('','service_role');await assert.rejects(call('status',{identified:true},false),e=>e.code==='PT404');
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
