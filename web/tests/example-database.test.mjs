import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID, createHmac } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, context, diagnosis, record, example } from './example-test-helpers.mjs';
import { options } from './recommendation-test-helpers.mjs';
const analysisProof=load('lib/reinforcements/analysis-proof.ts'),recProof=load('lib/reinforcements/recommendation-proof.ts'),genProof=load('lib/reinforcements/example-proof.ts');

test('HU021 PostgreSQL generation and shared owner review',async t=>{
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
      readdirSync(migrationDir).find(n=>n.endsWith('_generate_explanation_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_example_drafts.sql')),
      readdirSync(migrationDir).find(n=>n.endsWith('_generate_visual_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_summary_drafts.sql'))];
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
      if(choose)await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,0)',[requestId,documentId,attemptId,'example']);
      return {...base,analysisAttemptId,attemptId:randomUUID(),choiceVersion:choose?1:0,expectedVersion:0,recAttemptId:attemptId};
    }
    const call=(input,action,extra={},mutate)=>signed('change_reinforcement_example',genProof.signExampleProof,{...input,action,...extra},mutate);
    const configure=(input,mode='practical')=>call(input,'configure',{mode});
    const start=input=>call(input,'start');
    const finish=(input,extra={})=>call(input,'finish',{status:'ready',content:example,model:'test-model',errorCode:null,...extra});
    const row=async id=>(await db.query('select * from public.reinforcement_requests where id=$1',[id])).rows[0];
    const review=async(input,action,version,extra={},operationId=randomUUID())=>(await db.query('select public.review_reinforcement_draft($1,$2,$3,$4,$5,$6,$7) result',
      [input.requestId,documentId,version,action,extra.title??null,extra.text??null,operationId])).rows[0].result;
    let first;
    await t.test('signed generation requires a saved modality and a current chosen example; forged proofs and stale settings fail',async()=>{
      const absent=await fresh(false);await assert.rejects(configure(absent),e=>e.code==='PT409');first=await fresh();await assert.rejects(start(first),e=>e.code==='PT409');
      await assert.rejects(call(first,'configure',{mode:'analogy'},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      for(const change of [{operation:'reinforcement-explanation'},{expiresAt:1},{userId:other}])await assert.rejects(call(first,'configure',{mode:'practical'},p=>{
        const payload=JSON.stringify({...JSON.parse(p.p_payload),...change});return {p_payload:payload,p_signature:createHmac('sha256',secret).update(payload).digest('hex')};}),e=>e.code==='42501');
      await assert.rejects(configure(first,'unsupported'),e=>e.code==='23514');await configure(first,'analogy');await assert.rejects(configure(first),e=>e.code==='PT409');
      first.expectedVersion=1;await configure(first);first.expectedVersion=2;
    });
    await t.test('generation initializes one private pending version, never publishes, and duplicate claims/finishes remain cached',async()=>{
      assert.equal((await start(first)).disposition,'started');assert.equal((await start({...first,attemptId:randomUUID()})).disposition,'busy');
      await assert.rejects(finish(first,{content:{...example,consistentWithSource:false}}),e=>e.code==='23514');
      await assert.rejects(finish(first,{content:{...example,sourceQuote:'Una cita inventada distinta.'}}),e=>e.code==='23514');
      await finish(first);assert.equal((await start(first)).disposition,'cached');assert.equal((await finish(first)).disposition,'cached');
      const head=(await db.query('select * from public.reinforcement_review_heads where request_id=$1',[first.requestId])).rows[0];
      assert.equal(head.current_version,1);assert.equal(head.decision,'pending');assert.equal(head.approved_by,null);
      assert.equal((await db.query('select count(*)::int n from public.reinforcements')).rows[0].n,0);
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_review_versions where request_id=$1',[first.requestId])).rows[0].n,1);
    });
    await t.test('edits append pending versions; stale tabs, changed idempotency payloads and direct writes cannot overwrite them',async()=>{
      const operation=randomUUID(),edited={title:'Versión revisada por el propietario',text:example.text+' El total de energía no cambia en el caso ideal.'};
      const head=await review(first,'edit',1,edited,operation);assert.equal(head.current_version,2);assert.equal(head.decision,'pending');
      assert.deepEqual(await review(first,'edit',1,edited,operation),head);
      await assert.rejects(review(first,'edit',1,{...edited,text:edited.text+' Distinto.'},operation),e=>e.code==='PT409');
      await assert.rejects(review(first,'approve',1),e=>e.code==='PT409');
      await assert.rejects(review(first,'edit',2,{title:'   ',text:'   '}),e=>e.code==='23514');
      await assert.rejects(db.exec("update public.reinforcement_review_versions set text='alterado'"),e=>e.code==='42501');
      assert.equal((await db.query('select text from public.reinforcement_review_versions where request_id=$1 and version=1',[first.requestId])).rows[0].text,example.text);
    });
    await t.test('explicit approval publishes exactly the current version with owner/date and coherent real history',async()=>{
      const head=await review(first,'approve',2);assert.equal(head.decision,'approved');assert.equal(head.approved_by,owner);assert.ok(head.approved_at);
      const approved=await row(first.requestId);assert.equal(approved.status,'approved');assert.equal(approved.approved_by,owner);
      const published=(await db.query('select * from public.reinforcements where source_request_id=$1',[first.requestId])).rows[0];
      assert.equal(published.approved_version_id,head.approved_version_id);assert.match(published.content.text,/El total/);assert.equal(published.content.generatedByAI,true);
      assert.equal(published.content.approvedBy,owner);assert.equal(published.document_id,documentId);assert.equal(published.page_number,1);
      assert.deepEqual(await review(first,'approve',2),head);
      const last=(await db.query('select actor_kind,actor_id,status from public.reinforcement_request_events where request_id=$1 order by occurred_at desc limit 1',[first.requestId])).rows[0];
      assert.equal(last.actor_kind,'owner');assert.equal(last.actor_id,owner);assert.equal(last.status,'approved');
    });
    await t.test('editing an approved result keeps its published version intact and makes the new version pending until approved',async()=>{
      const before=(await db.query('select * from public.reinforcements where source_request_id=$1',[first.requestId])).rows[0];
      const edit=await review(first,'edit',2,{title:'Nueva versión pendiente',text:example.text+' Esta edición todavía debe revisarse de nuevo.'});
      assert.equal(edit.current_version,3);assert.equal(edit.decision,'pending');assert.equal(edit.approved_version_id,before.approved_version_id);
      assert.equal((await row(first.requestId)).status,'generated');assert.equal((await row(first.requestId)).approved_at,null);
      assert.deepEqual((await db.query('select * from public.reinforcements where source_request_id=$1',[first.requestId])).rows[0],before);
      await assert.rejects(review(first,'approve',2),e=>e.code==='PT409');
      const discarded=await review(first,'discard',3);assert.equal(discarded.decision,'discarded');assert.equal((await row(first.requestId)).status,'approved');
      assert.deepEqual((await db.query('select * from public.reinforcements where source_request_id=$1',[first.requestId])).rows[0],before);
    });
    await t.test('discarding a never-approved draft records a human decision without publishing or changing the PDF/request selection',async()=>{
      const input=await fresh();await configure(input,'analogy');input.expectedVersion=1;await start(input);await finish(input);
      const before=await row(input.requestId);const result=await review(input,'discard',1);assert.equal(result.decision,'discarded');
      const after=await row(input.requestId);assert.equal(after.stage,'discarded');assert.equal(after.selected_text,before.selected_text);assert.equal(after.document_id,before.document_id);
      await assert.rejects(review(input,'approve',1),e=>e.code==='PT409');assert.equal((await db.query('select * from public.reinforcements where source_request_id=$1',[input.requestId])).rows.length,0);
    });
    await t.test('foreign, inactive and anonymous accounts cannot read/review/publish, and direct publication writes are forbidden',async()=>{
      await assert.rejects(db.query("insert into public.reinforcements(document_id,page_number,title,content) values($1,1,'Forjado','{}')",[documentId]),e=>e.code==='42501');
      await assert.rejects(db.exec('delete from public.reinforcement_review_events'),e=>e.code==='42501');
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_review_versions')).rows.length,0);await assert.rejects(review(first,'approve',3),e=>e.code==='42501');
      await db.exec(`reset role;update public.profiles set is_active=false where id='${owner}'`);await asUser();await assert.rejects(review(first,'approve',3),e=>e.code==='42501');
      assert.equal((await db.query('select * from public.reinforcement_review_heads')).rows.length,0);
      await db.exec(`reset role;update public.profiles set is_active=true where id='${owner}'`);await asUser('','anon');await assert.rejects(db.query('select * from public.reinforcement_examples'),e=>e.code==='42501');await asUser();
    });
    await t.test('timeout retries and expired leases reject late results, and document replacement invalidates review',async()=>{
      const input=await fresh();await configure(input);input.expectedVersion=1;await start(input);await finish(input,{status:'error',content:null,model:null,errorCode:'timeout'});
      const retry={...input,attemptId:randomUUID()};await start(retry);await assert.rejects(finish(input),e=>e.code==='PT409');
      await db.exec('reset role');await db.query("update public.reinforcement_examples set lease_expires_at=now()-interval '1 second' where request_id=$1",[input.requestId]);await asUser();
      await assert.rejects(finish(retry),e=>e.code==='PT409');const latest={...input,attemptId:randomUUID()};await start(latest);await finish(latest);
      await db.exec('reset role');await db.query('update public.projects set document_id=null where id=$1',[projectId]);await asUser();await assert.rejects(review(latest,'approve',1),e=>e.code==='PT409');
    });
    await t.test('project deletion still cascades approved publications and private review history together',async()=>{
      await db.exec('reset role');await db.query('delete from public.projects where id=$1',[projectId]);
      for(const table of ['reinforcement_requests','reinforcement_examples','reinforcement_review_heads','reinforcement_review_versions','reinforcement_review_events','reinforcements'])
        assert.equal((await db.query(`select count(*)::int count from public.${table}`)).rows[0].count,0);
    });
  }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
