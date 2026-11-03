import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID, createHmac } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, context, diagnosis, record, explanation } from './explanation-test-helpers.mjs';
import { options } from './recommendation-test-helpers.mjs';
const analysisProof=load('lib/reinforcements/analysis-proof.ts'),recProof=load('lib/reinforcements/recommendation-proof.ts'),genProof=load('lib/reinforcements/explanation-proof.ts');

test('HU020 PostgreSQL generation contract, concurrency, pending approval and ownership',async t=>{
  const db=new PGlite({extensions:{pgcrypto}}),previous=process.env.REINFORCEMENT_REQUEST_SECRET;
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;create schema extensions;
      create extension pgcrypto with schema extensions;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,role text,is_active boolean);
      create table public.documents(id uuid primary key,owner_id uuid,storage_path text,size_bytes bigint);
      grant select on public.documents to authenticated;
      alter table public.documents enable row level security;
      create policy "Fixture document ownership" on public.documents for select to authenticated using(owner_id=auth.uid());
      create table public.projects(id uuid primary key,owner_id uuid,document_id uuid references public.documents(id),status text);
      create table public.project_deletions(document_ids uuid[]);
      create function private.can_manage_own_documents() returns boolean language sql stable security definer set search_path='' as $$
        select exists(select 1 from public.profiles where id=auth.uid() and is_active and role in ('owner','admin'))$$;
      create function private.document_is_available(p_document_id uuid) returns boolean language sql stable security definer set search_path='' as $$
        select not exists(select 1 from public.project_deletions where p_document_id=any(document_ids))$$;
      grant usage on schema auth,private to authenticated;
      insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}','owner',true),('${other}','owner',true);
      insert into public.documents values('${documentId}','${owner}','${owner}/${documentId}.pdf',100);
      insert into public.projects values('${projectId}','${owner}','${documentId}','pending');`);
    const migrationDir=new URL('../../supabase/migrations/',import.meta.url);
    const names=['20261012040000_create_reinforcements.sql','20261026211919_create_reinforcement_requests.sql','20261026215447_track_reinforcement_request_states.sql',
      '20261026224216_contextual_request_analysis.sql','20261026230234_reinforcement_recommendations.sql','20261027201023_fix_recommendation_conflict_codes.sql',
      '20261027205032_fix_request_conflict_codes.sql','20261027223449_fix_analysis_conflict_codes.sql',
      readdirSync(migrationDir).find(n=>n.endsWith('_generate_explanation_drafts.sql'))];
    for(const name of names)await db.exec(readFileSync(new URL(name,migrationDir),'utf8'));
    const secret=(await db.query('select secret from private.reinforcement_request_secrets')).rows[0].secret;process.env.REINFORCEMENT_REQUEST_SECRET=secret;
    async function asUser(id=owner,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);}
    async function signed(name,signer,input,mutate=x=>x){const args=mutate(signer(input));return(await db.query(`select public.${name}($1,$2) result`,[args.p_payload,args.p_signature])).rows[0].result;}
    async function fresh(choose=true){await asUser();const r=await signed('create_reinforcement_request',proof.signRequestProof,{userId:owner,projectId,
      content:{...content,text:record.selected_text},idempotencyKey:randomUUID(),pageCount:2,storagePath:`${owner}/${documentId}.pdf`,sizeBytes:100});
      const requestId=r.request.id,analysisAttemptId=randomUUID(),attemptId=randomUUID(),base={userId:owner,requestId,documentId};
      await signed('change_reinforcement_analysis',analysisProof.signAnalysisProof,{...base,attemptId:analysisAttemptId,action:'start'});
      await signed('change_reinforcement_analysis',analysisProof.signAnalysisProof,{...base,attemptId:analysisAttemptId,action:'finish',status:'ready',context,diagnosis,model:'test-model',errorCode:null});
      await signed('change_reinforcement_recommendations',recProof.signRecommendationProof,{...base,analysisAttemptId,attemptId,action:'start'});
      await signed('change_reinforcement_recommendations',recProof.signRecommendationProof,{...base,analysisAttemptId,attemptId,action:'finish',status:'ready',options,model:'test-model',emptyReason:null,errorCode:null});
      if(choose)await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,0)',[requestId,documentId,attemptId,'explanation']);
      return {...base,analysisAttemptId,attemptId:randomUUID(),choiceVersion:choose?1:0,expectedVersion:0,recAttemptId:attemptId};
    }
    const call=(input,action,extra={},mutate)=>signed('change_reinforcement_explanation',genProof.signExplanationProof,{...input,action,...extra},mutate);
    const configure=(input,level='intermediate')=>call(input,'configure',{level});
    const start=input=>call(input,'start');
    const finish=(input,extra={})=>call(input,'finish',{status:'ready',content:explanation,model:'test-model',errorCode:null,...extra});
    const row=async id=>(await db.query('select * from public.reinforcement_requests where id=$1',[id])).rows[0];
    let first;
    await t.test('verified signatures, expiry, operation, explicit choice and saved level are mandatory',async()=>{
      const noChoice=await fresh(false);await assert.rejects(configure(noChoice),e=>e.code==='PT409');first=await fresh();
      await assert.rejects(start(first),e=>e.code==='PT409');
      await assert.rejects(call(first,'configure',{level:'brief'},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      for(const change of [{operation:'reinforcement-recommendations'},{expiresAt:1},{userId:other}])await assert.rejects(call(first,'configure',{level:'brief'},p=>{
        const payload=JSON.stringify({...JSON.parse(p.p_payload),...change});return {p_payload:payload,p_signature:createHmac('sha256',secret).update(payload).digest('hex')};}),e=>e.code==='42501');
      await assert.rejects(configure(first,'unsupported'),e=>e.code==='23514');
    });
    await t.test('levels persist before provider work, stale tabs conflict, and all three descriptions map to saved levels',async()=>{
      for(const [index,level] of ['brief','intermediate','detailed'].entries()){
        const result=await configure({...first,expectedVersion:index},level);assert.equal(result.generation.detail_level,level);assert.equal(result.generation.status,'draft');assert.equal(result.generation.version,index+1);
      }
      await assert.rejects(configure(first),e=>e.code==='PT409');first.expectedVersion=3;
      await configure(first);first.expectedVersion=4;
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_generation_runs')).rows[0].n,0);
      assert.equal((await row(first.requestId)).stage,'choosing');
    });
    await t.test('claims serialize duplicates, lock choice and detail, reject obsolete finishes, and record real generating/review events',async()=>{
      assert.equal((await start(first)).disposition,'started');assert.equal((await start({...first,attemptId:randomUUID()})).disposition,'busy');
      assert.equal((await row(first.requestId)).stage,'generating');await assert.rejects(configure(first),e=>e.code==='PT409');
      await assert.rejects(db.query('select public.choose_reinforcement_option($1,$2,$3,$4,1)',[first.requestId,documentId,first.recAttemptId,'example']),e=>e.code==='PT409');
      await assert.rejects(finish({...first,attemptId:randomUUID()}),e=>e.code==='PT409');
      for(const change of [{content:{...explanation,sourceQuote:'Un texto que nunca estuvo en el PDF.'}},{content:{...explanation,topicReference:'Otro tema'}},{model:null}])
        await assert.rejects(finish(first,change),e=>e.code==='23514');
      const saved=await finish(first);assert.equal(saved.generation.status,'ready');assert.equal(saved.generation.approval_status,'pending');
      assert.equal(saved.generation.content.text,explanation.text);assert.equal((await start(first)).disposition,'cached');assert.equal((await finish(first)).disposition,'cached');
      const result=await row(first.requestId);assert.equal(result.status,'generated');assert.equal(result.stage,'review');assert.equal(result.approved_at,null);assert.equal(result.selected_text,record.selected_text);
      const events=(await db.query('select stage from public.reinforcement_request_events where request_id=$1 order by occurred_at',[first.requestId])).rows.map(x=>x.stage);
      assert.deepEqual(events,['queued','analyzing','choosing','generating','review']);
      assert.equal((await db.query('select count(*)::int n from public.reinforcements')).rows[0].n,0);
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_generation_runs where request_id=$1',[first.requestId])).rows[0].n,1);
    });
    await t.test('RLS isolates owners, admins and inactive sessions; direct mutations cannot approve or publish the draft',async()=>{
      await assert.rejects(db.exec("update public.reinforcement_generations set approval_status='approved'"),e=>e.code==='42501');
      await assert.rejects(db.exec('delete from public.reinforcement_generation_runs'),e=>e.code==='42501');
      await assert.rejects(db.exec("update public.reinforcement_requests set status='approved',stage='approved'"),e=>e.code==='42501');
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_generations')).rows.length,0);await assert.rejects(start({...first,userId:other}),e=>e.code==='42501');
      await db.exec(`reset role;update public.profiles set role='admin' where id='${other}'`);await asUser(other);assert.equal((await db.query('select * from public.reinforcement_generation_runs')).rows.length,0);
      await db.exec(`reset role;update public.profiles set is_active=false where id='${owner}'`);await asUser();await assert.rejects(start(first),e=>e.code==='42501');assert.equal((await db.query('select * from public.reinforcement_generations')).rows.length,0);
      await db.exec(`reset role;update public.profiles set is_active=true where id='${owner}'`);await asUser('','anon');await assert.rejects(db.query('select * from public.reinforcement_generations'),e=>e.code==='42501');await asUser();
    });
    await t.test('an error can retry; a stale lease or document cannot overwrite a replacement attempt',async()=>{
      const input=await fresh();await configure(input);input.expectedVersion=1;await start(input);
      await finish(input,{status:'error',content:null,model:null,errorCode:'timeout'});assert.equal((await row(input.requestId)).status,'error');
      const retry={...input,attemptId:randomUUID()};await start(retry);await assert.rejects(finish(input),e=>e.code==='PT409');
      await db.exec('reset role');await db.query("update public.reinforcement_generations set lease_expires_at=now()-interval '1 second' where request_id=$1",[input.requestId]);await asUser();
      await assert.rejects(finish(retry),e=>e.code==='PT409');const reclaimed={...input,attemptId:randomUUID()};assert.equal((await start(reclaimed)).generation.attempts,3);
      await assert.rejects(finish({...reclaimed,documentId:other}),e=>e.code==='PT409');
      await db.exec('reset role');await db.query('update public.projects set document_id=null where id=$1',[projectId]);await asUser();await assert.rejects(finish(reclaimed),e=>e.code==='PT409');
      await db.exec('reset role');await db.query('update public.projects set document_id=$1 where id=$2',[documentId,projectId]);await asUser();await finish(reclaimed);
    });
    await t.test('a changed recommendation version forces a fresh saved detail before generation',async()=>{
      const input=await fresh();await configure(input);input.expectedVersion=1;
      await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,1)',[input.requestId,documentId,input.recAttemptId,'example']);
      await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,2)',[input.requestId,documentId,input.recAttemptId,'explanation']);
      await assert.rejects(start(input),e=>e.code==='PT409');await assert.rejects(start({...input,choiceVersion:3}),e=>e.code==='PT409');
      await configure({...input,choiceVersion:3});input.choiceVersion=3;input.expectedVersion=2;await start(input);await finish(input);
    });
    await t.test('generation concurrency and rolling rate limits bound real claims, not cache hits',async()=>{
      const a=await fresh(),b=await fresh(),c=await fresh();for(const input of [a,b,c]){await configure(input);input.expectedVersion=1;}
      await start(a);await start(b);await assert.rejects(start(c),e=>e.code==='P0001');
      await finish(a);await finish(b);
      await db.exec('reset role');await db.query(`insert into public.reinforcement_generation_runs(attempt_id,request_id)
        select gen_random_uuid(),$1 from generate_series(1,10)`,[c.requestId]);await asUser();await assert.rejects(start(c),e=>e.code==='P0001');
      const acl=(await db.query("select prosecdef,proconfig from pg_proc where oid='public.change_reinforcement_explanation(text,text)'::regprocedure")).rows[0];
      assert.equal(acl.prosecdef,false);assert.deepEqual(acl.proconfig,['search_path=""']);
    });
  }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
