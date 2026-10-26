import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHmac } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, record, context, diagnosis, options } from './recommendation-test-helpers.mjs';
const analysisProof=load('lib/reinforcements/analysis-proof.ts');
const recommendationProof=load('lib/reinforcements/recommendation-proof.ts');

test('HU019 PostgreSQL recommendations, ownership, choice concurrency and version integrity',async t=>{
  const db=new PGlite({extensions:{pgcrypto}}),previousSecret=process.env.REINFORCEMENT_REQUEST_SECRET;
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth; create schema private; create schema extensions;
      create extension pgcrypto with schema extensions;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create table auth.users(id uuid primary key);
      create table public.profiles(id uuid primary key, role text, is_active boolean);
      create table public.documents(id uuid primary key, owner_id uuid, storage_path text, size_bytes bigint);
      create table public.projects(id uuid primary key, owner_id uuid, document_id uuid references public.documents(id), status text);
      create table public.project_deletions(document_ids uuid[]);
      create function private.can_manage_own_documents() returns boolean language sql stable security definer set search_path='' as $$
        select exists(select 1 from public.profiles where id=auth.uid() and is_active and role in ('owner','admin')) $$;
      create function private.document_is_available(p_document_id uuid) returns boolean language sql stable security definer set search_path='' as $$
        select not exists(select 1 from public.project_deletions where p_document_id=any(document_ids)) $$;
      grant usage on schema auth, private to authenticated;
      insert into auth.users values ('${owner}'),('${other}');
      insert into public.profiles values ('${owner}','owner',true),('${other}','owner',true);
      insert into public.documents values ('${documentId}','${owner}','${owner}/${documentId}.pdf',100);
      insert into public.projects values ('${projectId}','${owner}','${documentId}','pending');
    `);
    for(const name of ['20261026211919_create_reinforcement_requests.sql','20261026215447_track_reinforcement_request_states.sql','20261026224216_contextual_request_analysis.sql','20261026230234_reinforcement_recommendations.sql'])
      await db.exec(readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'));
    const secret=(await db.query('select secret from private.reinforcement_request_secrets')).rows[0].secret;
    process.env.REINFORCEMENT_REQUEST_SECRET=secret;
    async function asUser(id=owner,role='authenticated'){
      await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);
    }
    async function signed(name,signer,input,mutate=x=>x){const args=mutate(signer(input));return(await db.query(`select public.${name}($1,$2) result`,[args.p_payload,args.p_signature])).rows[0].result;}
    async function fresh(ready=true){
      await asUser();const created=await signed('create_reinforcement_request',proof.signRequestProof,{userId:owner,projectId,
        content:{...content,text:record.selected_text},idempotencyKey:randomUUID(),pageCount:2,storagePath:`${owner}/${documentId}.pdf`,sizeBytes:100});
      const requestId=created.request.id,analysisAttemptId=randomUUID();
      if(ready){const base={userId:owner,documentId,requestId,attemptId:analysisAttemptId};
        await signed('change_reinforcement_analysis',analysisProof.signAnalysisProof,{...base,action:'start'});
        await signed('change_reinforcement_analysis',analysisProof.signAnalysisProof,{...base,action:'finish',status:'ready',context,diagnosis,model:'test-model',errorCode:null});
      }
      return {requestId,analysisAttemptId,attemptId:randomUUID()};
    }
    const call=(input,mutate)=>signed('change_reinforcement_recommendations',recommendationProof.signRecommendationProof,{userId:owner,documentId,...input},mutate);
    const start=input=>call({...input,action:'start'});
    const finish=(input,extra={})=>call({...input,action:'finish',status:'ready',options,model:'test-model',emptyReason:null,errorCode:null,...extra});
    const fail=input=>finish(input,{status:'error',options:[],model:null,errorCode:'timeout'});
    const choose=async(input,type='example',version=0)=>(await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,$5) result',[input.requestId,documentId,input.attemptId,type,version])).rows[0].result;
    const state=async id=>(await db.query('select * from public.reinforcement_requests where id=$1',[id])).rows[0];
    let first;
    await t.test('a sufficient saved diagnosis is mandatory; signed requests reject forgery, expiry and another operation',async()=>{
      const pending=await fresh(false);await assert.rejects(start(pending),e=>e.code==='40001');
      first=await fresh();
      await assert.rejects(call({...first,action:'start'},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      for(const change of [{expiresAt:1},{operation:'contextual-analysis'},{userId:other}])
        await assert.rejects(call({...first,action:'start'},p=>{const payload=JSON.stringify({...JSON.parse(p.p_payload),...change});return {p_payload:payload,p_signature:createHmac('sha256',secret).update(payload).digest('hex')}}),e=>e.code==='42501');
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_recommendations')).rows[0].n,0);
    });
    await t.test('duplicate claims do not invoke another run and invalid option sets roll back',async()=>{
      assert.equal((await start(first)).disposition,'started');assert.equal((await start({...first,attemptId:randomUUID()})).disposition,'busy');
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_recommendation_runs')).rows[0].n,1);
      await assert.rejects(finish(first,{options:[options[0],options[0]]}),e=>e.code==='23514');
      await assert.rejects(finish(first,{options:[{...options[0],type:'video'}]}),e=>e.code==='23514');
      const saved=await finish(first);assert.equal(saved.recommendations.status,'ready');assert.equal(saved.recommendations.options[0].type,'example');
      assert.equal((await start(first)).disposition,'cached');assert.equal((await fail(first)).recommendations.status,'ready');
    });
    await t.test('owners cannot forge options or update choices directly; another owner/admin sees no private result',async()=>{
      await assert.rejects(db.exec("update public.reinforcement_recommendations set options='[]'"),e=>e.code==='42501');
      await assert.rejects(db.exec("update public.reinforcement_requests set recommended_type='image'"),e=>e.code==='42501');
      await assert.rejects(db.exec('delete from public.reinforcement_recommendation_runs'),e=>e.code==='42501');
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_recommendations')).rows.length,0);await assert.rejects(choose(first),e=>e.code==='42501');
      await db.exec(`reset role;update public.profiles set role='admin' where id='${other}'`);await asUser(other);
      assert.equal((await db.query('select * from public.reinforcement_recommendation_runs')).rows.length,0);
      await db.exec(`reset role;update public.profiles set is_active=false where id='${owner}'`);await asUser();
      await assert.rejects(choose(first),e=>e.code==='42501');assert.equal((await db.query('select * from public.reinforcement_recommendations')).rows.length,0);
      await db.exec(`reset role;update public.profiles set is_active=true where id='${owner}'`);await asUser('','anon');
      await assert.rejects(choose(first),e=>e.code==='42501');await assert.rejects(db.query('select * from public.reinforcement_recommendations'),e=>e.code==='42501');await asUser();
    });
    await t.test('choice stores exactly the server reason and version, supports retry, and rejects stale tabs or unavailable types',async()=>{
      await assert.rejects(choose(first,'image'),e=>e.code==='23514');
      await assert.rejects(choose({...first,attemptId:randomUUID()}),e=>e.code==='40001');
      const saved=await choose(first);assert.equal(saved.choice.type,'example');assert.equal(saved.choice.justification,options[0].justification);assert.equal(saved.choiceVersion,1);
      const retry=await choose(first);assert.equal(retry.choiceVersion,1);assert.equal(retry.choice.selectedAt,saved.choice.selectedAt);
      await assert.rejects(choose(first,'explanation',0),e=>e.code==='40001');
      const changed=await choose(first,'explanation',1);assert.equal(changed.choiceVersion,2);
      const row=await state(first.requestId);assert.equal(row.recommended_type,'explanation');assert.equal(row.recommendation_reason,options[1].justification);
      assert.equal(row.recommendation_selected_by,owner);assert.equal(row.status,'pending');assert.equal(row.stage,'choosing');assert.equal(row.approved_at,null);
      assert.equal(row.selected_text,record.selected_text);assert.equal(row.document_id,documentId);
    });
    await t.test('after generation starts a different choice is blocked, while the same completed choice remains idempotent',async()=>{
      await db.exec('reset role');await db.query("update public.reinforcement_requests set status='processing',stage='generating' where id=$1",[first.requestId]);
      await asUser();await assert.rejects(choose(first,'example',2),e=>e.code==='40001');assert.equal((await choose(first,'explanation',1)).choiceVersion,2);
      await assert.rejects(start(first),e=>e.code==='40001');
    });
    await t.test('expired attempts can be reclaimed but late results cannot overwrite their replacement; empty result has no selectable fallback',async()=>{
      const input=await fresh();await start(input);await db.exec('reset role');
      await db.query("update public.reinforcement_recommendations set lease_expires_at=now()-interval '1 second' where request_id=$1",[input.requestId]);await asUser();
      await assert.rejects(finish(input),e=>e.code==='40001');const retry={...input,attemptId:randomUUID()};assert.equal((await start(retry)).recommendations.attempts,2);
      await assert.rejects(finish(input),e=>e.code==='40001');
      const empty=await finish(retry,{status:'empty',options:[],emptyReason:'No hay opciones pertinentes para la dificultad actual.'});assert.equal(empty.recommendations.status,'empty');
      assert.equal((await start(retry)).disposition,'cached');await assert.rejects(choose(retry),e=>e.code==='40001');
    });
    await t.test('a transient failure can retry without losing the original analysis or inventing a generated reinforcement',async()=>{
      const input=await fresh();await start(input);await fail(input);
      assert.equal((await state(input.requestId)).stage,'choosing');
      const retry={...input,attemptId:randomUUID()};await start(retry);assert.equal((await finish(retry)).recommendations.status,'ready');
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_recommendation_runs where request_id=$1',[input.requestId])).rows[0].n,2);
    });
    await t.test('replacement, deletion and a changed analysis invalidate a claimed result before persistence',async()=>{
      const input=await fresh();await start(input);await db.exec('reset role');await db.query('update public.projects set document_id=null where id=$1',[projectId]);await asUser();
      await assert.rejects(finish(input),e=>e.code==='40001');await db.exec('reset role');await db.query('update public.projects set document_id=$1 where id=$2',[documentId,projectId]);
      await db.query('insert into public.project_deletions values($1)',[[documentId]]);await asUser();await assert.rejects(finish(input),e=>e.code==='42501');
      assert.equal((await db.query('select * from public.reinforcement_recommendations')).rows.length,0);
      await db.exec('reset role;delete from public.project_deletions');await db.query('update public.reinforcement_analyses set attempt_id=$1 where request_id=$2',[randomUUID(),input.requestId]);await asUser();
      await assert.rejects(finish(input),e=>e.code==='40001');await db.exec('reset role');await db.query('update public.reinforcement_analyses set attempt_id=$1 where request_id=$2',[input.analysisAttemptId,input.requestId]);await asUser();await fail(input);
    });
    await t.test('concurrent and recent recommendation runs are bounded per account',async()=>{
      const a=await fresh(),b=await fresh(),c=await fresh();await start(a);await start(b);await assert.rejects(start(c),e=>e.code==='P0001');await fail(a);await fail(b);
      const count=async()=>Number((await db.query('select count(*) n from public.reinforcement_recommendation_runs')).rows[0].n);
      while(await count()<10){const retry={...c,attemptId:randomUUID()};await start(retry);await fail(retry);}
      await assert.rejects(start({...c,attemptId:randomUUID()}),e=>e.code==='P0001');
    });
    await t.test('deleting the owning project removes options and run history without orphan records',async()=>{
      await db.exec('reset role');await db.query('delete from public.projects where id=$1',[projectId]);
      for(const table of ['reinforcement_recommendations','reinforcement_recommendation_runs'])assert.equal((await db.query(`select count(*)::int n from public.${table}`)).rows[0].n,0);
    });
  }finally{if(previousSecret===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previousSecret;await db.close();}
});
