import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, context, diagnosis, record, summary } from './summary-test-helpers.mjs';
import { options as baseOptions } from './recommendation-test-helpers.mjs';
const options=[...baseOptions,{...baseOptions[0],type:'summary'}];
const analysisProof=load('lib/reinforcements/analysis-proof.ts'),recProof=load('lib/reinforcements/recommendation-proof.ts'),genProof=load('lib/reinforcements/summary-proof.ts');

test('HU023 summary grounding, length, editing and explicit approval',async t=>{
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
      readdirSync(migrationDir).find(n=>n.endsWith('_generate_explanation_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_example_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_visual_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_summary_drafts.sql'))];
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
      if(choose)await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,0)',[requestId,documentId,attemptId,'summary']);
      return {...base,analysisAttemptId,attemptId:randomUUID(),choiceVersion:choose?1:0,expectedVersion:0,recAttemptId:attemptId};
    }

    const call=(input,action,extra={},mutate)=>signed('change_reinforcement_summary',genProof.signSummaryProof,{...input,action,...extra},mutate);
    const configure=(input,mode='compact')=>call(input,'configure',{mode});
    const start=input=>call(input,'start');
    const finish=(input,extra={})=>call(input,'finish',{status:'ready',content:summary,model:'test-model',errorCode:null,...extra});
    const review=async(input,action,version,extra={},operationId=randomUUID())=>(await db.query('select public.review_reinforcement_summary($1,$2,$3,$4,$5,$6,$7,$8) result',
      [input.requestId,documentId,version,action,extra.title??null,extra.text??null,extra.concepts??null,operationId])).rows[0].result;
    const getHead=async input=>(await db.query('select * from public.reinforcement_review_heads where request_id=$1',[input.requestId])).rows[0];
    const published=async input=>(await db.query('select * from public.reinforcements where source_request_id=$1',[input.requestId])).rows;
    let first,approved;
    await t.test('current Summary choice, explicit length, proof and owner are mandatory',async()=>{
      const missing=await fresh(false);await assert.rejects(configure(missing),e=>e.code==='PT409');
      first=await fresh();await assert.rejects(start(first),e=>e.code==='PT409');await assert.rejects(configure(first,'long'),e=>e.code==='23514');
      await assert.rejects(call(first,'configure',{mode:'compact'},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      await configure(first);await assert.rejects(configure(first),e=>e.code==='PT409');first.expectedVersion=1;
    });
    await t.test('generation validates citation, topic, character cap and every concept, and filters duplicates and empty concepts',async()=>{
      await start(first);assert.equal((await start(first)).disposition,'busy');
      for(const invalid of [{...summary,text:'a'.repeat(351)},{...summary,sourceQuote:'No está en la selección.'},{...summary,consistentWithSource:false},
       {...summary,concepts:[{name:'temperatura',sourceQuote:context.selectedText}]},{...summary,concepts:[]}])await assert.rejects(finish(first,{content:invalid}),e=>e.code==='23514');
      await finish(first,{content:{...summary,concepts:[...summary.concepts,{name:'ENERGIA',sourceQuote:context.selectedText},{name:'',sourceQuote:''}]}});
      assert.equal((await start(first)).disposition,'cached');assert.equal((await finish(first)).disposition,'cached');
      const v=(await db.query('select summary_content from public.reinforcement_review_versions where request_id=$1',[first.requestId])).rows[0].summary_content;
      assert.equal(v.concepts.length,2);assert.equal((await getHead(first)).decision,'pending');assert.equal((await published(first)).length,0);
    });
    await t.test('owner can correct, add and remove grounded concepts atomically, preserving an unpublished immutable version and idempotent receipt',async()=>{
      const input={title:'Resumen revisado',text:summary.text,concepts:[{name:'Energía',sourceQuote:context.selectedText},{name:'se conserva',sourceQuote:context.selectedText}]},operationId=randomUUID();
      const edited=await review(first,'edit',1,input,operationId);assert.equal(edited.current_version,2);assert.equal(edited.decision,'pending');
      assert.deepEqual(await review(first,'edit',1,input,operationId),edited);assert.equal((await published(first)).length,0);
      const versions=(await db.query('select version,summary_content from public.reinforcement_review_versions where request_id=$1 order by version',[first.requestId])).rows;
      assert.equal(versions.length,2);assert.equal(versions[0].summary_content.concepts[1].name,'sistema aislado');assert.equal(versions[1].summary_content.concepts[1].name,'se conserva');
    });
    await t.test('obsolete tabs, unsupported concepts and generic-format review cannot bypass the summary contract',async()=>{
      await assert.rejects(review(first,'approve',1),e=>e.code==='PT409');
      for(const concepts of [[],[{name:'temperatura',sourceQuote:context.selectedText}]])await assert.rejects(review(first,'edit',2,{title:summary.title,text:summary.text,concepts}),e=>e.code==='23514');
      await assert.rejects(db.query('select public.review_reinforcement_draft($1,$2,2,$3,null,null,$4)',[first.requestId,documentId,'approve',randomUUID()]),e=>e.code==='PT409');
    });
    await t.test('explicit approval publishes the edited summary, later edits stay pending and discard preserves the prior publication',async()=>{
      const head=await review(first,'approve',2);approved=(await published(first))[0];assert.equal(approved.content.type,'summary');assert.equal(approved.approved_version_id,head.approved_version_id);assert.equal(head.approved_by,owner);
      await review(first,'edit',2,{title:'Nueva revisión pendiente',text:summary.text,concepts:summary.concepts});assert.equal((await getHead(first)).decision,'pending');assert.deepEqual((await published(first))[0],approved);
      await review(first,'discard',3);assert.deepEqual((await published(first))[0],approved);await assert.rejects(review(first,'approve',3),e=>e.code==='PT409');
    });
    await t.test('brief mode allows a longer bounded summary, but discard without approval never publishes',async()=>{
      const next=await fresh();await configure(next,'brief');next.expectedVersion=1;await start(next);await finish(next,{content:{...summary,text:'a'.repeat(500)}});
      await review(next,'discard',1);assert.equal((await published(next)).length,0);await assert.rejects(review(next,'approve',1),e=>e.code==='PT409');
    });
    await t.test('foreign, inactive and anonymous users cannot read drafts or change review/publication directly',async()=>{
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_summaries')).rows.length,0);await assert.rejects(review(first,'approve',3),e=>e.code==='42501');
      await db.exec('reset role');await db.query('update public.profiles set is_active=false where id=$1',[owner]);await asUser();assert.equal((await db.query('select * from public.reinforcement_review_versions')).rows.length,0);await assert.rejects(start(first),e=>e.code==='42501');
      await db.exec('reset role');await db.query('update public.profiles set is_active=true where id=$1',[owner]);await asUser();await assert.rejects(db.exec("update public.reinforcement_review_versions set summary_content='{}'"),e=>e.code==='42501');await assert.rejects(db.exec("delete from public.reinforcements"),e=>e.code==='42501');
      await asUser('','anon');await assert.rejects(db.exec('select * from public.reinforcement_summaries'),e=>e.code==='42501');await asUser();
    });
    await t.test('failed attempts and obsolete finishes cannot produce a false receipt; replaced sources reject work and project cleanup cascades',async()=>{
      const next=await fresh();await configure(next);next.expectedVersion=1;await start(next);await finish(next,{status:'error',content:null,model:null,errorCode:'timeout'});const obsolete={...next};next.attemptId=randomUUID();await start(next);await assert.rejects(finish(obsolete),e=>e.code==='PT409');
      await db.exec('reset role');await db.query('update public.projects set document_id=null where id=$1',[projectId]);await asUser();await assert.rejects(finish(next),e=>e.code==='PT409');
      await db.exec('reset role');await db.query('delete from public.projects where id=$1',[projectId]);for(const table of ['reinforcement_summaries','reinforcement_review_versions','reinforcements'])assert.equal((await db.query('select count(*)::int n from public.'+table)).rows[0].n,0);
    });
  }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
