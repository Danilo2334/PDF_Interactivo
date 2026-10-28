import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, context, diagnosis, record, visual } from './visual-test-helpers.mjs';
import { options as baseOptions } from './recommendation-test-helpers.mjs';
const options=[...baseOptions,{...baseOptions[0],type:'image'}];
const analysisProof=load('lib/reinforcements/analysis-proof.ts'),recProof=load('lib/reinforcements/recommendation-proof.ts'),genProof=load('lib/reinforcements/visual-proof.ts');

test('HU022 visual generation, regeneration and shared owner review',async t=>{
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
      if(choose)await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,0)',[requestId,documentId,attemptId,'image']);
      return {...base,analysisAttemptId,attemptId:randomUUID(),choiceVersion:choose?1:0,expectedVersion:0,recAttemptId:attemptId};
    }

    const call=(input,action,extra={},mutate)=>signed('change_reinforcement_visual',genProof.signVisualProof,{...input,action,...extra},mutate);
    const configure=(input,mode='diagram')=>call(input,'configure',{mode});
    const start=input=>call(input,'start');
    const finish=(input,extra={})=>call(input,'finish',{status:'ready',content:visual,model:'test-model',errorCode:null,...extra});
    const review=async(input,action,version,extra={},operationId=randomUUID())=>(await db.query('select public.review_reinforcement_draft($1,$2,$3,$4,$5,$6,$7) result',
      [input.requestId,documentId,version,action,extra.title??null,extra.text??null,operationId])).rows[0].result;
    const getHead=async input=>(await db.query('select * from public.reinforcement_review_heads where request_id=$1',[input.requestId])).rows[0];
    const published=async input=>(await db.query('select * from public.reinforcements where source_request_id=$1',[input.requestId])).rows;
    let first,approved;
    await t.test('visual choice, explicit mode and server-built brief are required; stale/forged/foreign proofs fail',async()=>{
      const absent=await fresh(false);await assert.rejects(configure(absent),e=>e.code==='PT409');
      first=await fresh();await assert.rejects(start(first),e=>e.code==='PT409');
      await assert.rejects(call(first,'configure',{mode:'image'},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      await assert.rejects(configure(first,'unsupported'),e=>e.code==='23514');
      const saved=await configure(first);assert.equal(saved.generation.mode,'diagram');assert.ok(saved.generation.visual_brief.includes(diagnosis.topic));
      await assert.rejects(configure(first,'image'),e=>e.code==='PT409');first.expectedVersion=1;
      await assert.rejects(call(first,'regenerate',{reviewVersion:1}),e=>e.code==='PT409');
    });
    await t.test('generation validates real node references and literal attribution, creates a private pending preview and caches duplicates',async()=>{
      await start(first);assert.equal((await start(first)).disposition,'busy');
      for(const invalid of [{...visual,sourceQuote:'No está en la selección.'},{...visual,consistentWithSource:false},
        {...visual,scene:{...visual.scene,edges:[{from:'n1',to:'n6',label:'Falso'}]}},
        {...visual,scene:{...visual.scene,kind:'image'}}])await assert.rejects(finish(first,{content:invalid}),e=>e.code==='23514');
      await finish(first);assert.equal((await start(first)).disposition,'cached');assert.equal((await finish(first)).disposition,'cached');
      assert.equal((await getHead(first)).decision,'pending');assert.equal((await published(first)).length,0);
      assert.deepEqual((await db.query('select visual_content from public.reinforcement_review_versions where request_id=$1',[first.requestId])).rows[0].visual_content,visual);
    });
    await t.test('editing title/accessible description preserves the visual; approval publishes only that explicitly reviewed version',async()=>{
      await review(first,'edit',1,{title:'Diagrama revisado',text:visual.text+' Aprobación de prueba del propietario.'});
      await assert.rejects(review(first,'approve',1),e=>e.code==='PT409');
      const head=await review(first,'approve',2);assert.equal(head.approved_by,owner);approved=(await published(first))[0];
      assert.equal(approved.content.type,'visual');assert.deepEqual(approved.content.visual,visual);assert.equal(approved.approved_version_id,head.approved_version_id);
    });
    await t.test('regeneration is version-checked and single-claim, preserves approved publication, appends a pending AI version and audits it',async()=>{
      await assert.rejects(call(first,'regenerate',{reviewVersion:1}),e=>e.code==='PT409');
      first.attemptId=randomUUID();const extra={reviewVersion:2,instructions:'Aclarar la dirección de la transformación.'};
      const started=await call(first,'regenerate',extra);assert.equal(started.generation.instructions,extra.instructions);
      assert.equal((await call({...first,attemptId:randomUUID()},'regenerate',extra)).disposition,'busy');
      assert.deepEqual((await published(first))[0],approved);
      await finish(first,{content:{...visual,title:'Nuevo diagrama pendiente'}});
      const head=await getHead(first);assert.equal(head.current_version,3);assert.equal(head.decision,'pending');assert.equal(head.approved_version_id,approved.approved_version_id);
      assert.deepEqual((await published(first))[0],approved);
      assert.equal((await db.query("select count(*)::int n from public.reinforcement_review_events where request_id=$1 and action='regenerate'",[first.requestId])).rows[0].n,1);
      await assert.rejects(review(first,'approve',2),e=>e.code==='PT409');await review(first,'discard',3);assert.deepEqual((await published(first))[0],approved);
    });
    await t.test('requesting another result after discard creates a new pending version without silently approving or replacing the old result',async()=>{
      first.attemptId=randomUUID();await call(first,'regenerate',{reviewVersion:3,instructions:''});await finish(first,{content:{...visual,title:'Resultado tras descartar'}});
      assert.equal((await getHead(first)).current_version,4);assert.deepEqual((await published(first))[0],approved);
      await review(first,'approve',4);assert.equal((await published(first)).length,1);assert.equal((await published(first))[0].title,'Resultado tras descartar');
    });
    await t.test('image mode has no fabricated arrows; discard without prior approval never publishes',async()=>{
      const input=await fresh();await configure(input,'image');input.expectedVersion=1;await start(input);
      await finish(input,{content:{...visual,scene:{...visual.scene,kind:'image',edges:[]}}});
      await review(input,'discard',1);assert.equal((await published(input)).length,0);
      await assert.rejects(review(input,'approve',1),e=>e.code==='PT409');
    });
    await t.test('foreign/inactive/anonymous users cannot read or mutate visuals, review history or publication directly',async()=>{
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_visuals')).rows.length,0);
      await assert.rejects(review(first,'discard',4),e=>e.code==='42501');await assert.rejects(start(first),e=>e.code==='42501');
      await db.exec(`reset role;update public.profiles set is_active=false where id='${owner}'`);await asUser();assert.equal((await db.query('select * from public.reinforcement_review_versions')).rows.length,0);
      await assert.rejects(review(first,'approve',4),e=>e.code==='42501');
      await db.exec(`reset role;update public.profiles set is_active=true where id='${owner}'`);await asUser();
      await assert.rejects(db.exec("update public.reinforcement_review_versions set visual_content='{}'"),e=>e.code==='42501');
      await asUser('','anon');await assert.rejects(db.exec('select * from public.reinforcement_visuals'),e=>e.code==='42501');await asUser();
    });
    await t.test('late results, replaced documents and failed regeneration cannot overwrite a saved publication; cleanup cascades',async()=>{
      first.attemptId=randomUUID();await call(first,'regenerate',{reviewVersion:4,instructions:''});const obsolete={...first};
      await finish(first,{status:'error',content:null,model:null,errorCode:'timeout'});
      first.attemptId=randomUUID();await call(first,'regenerate',{reviewVersion:4,instructions:''});await assert.rejects(finish(obsolete),e=>e.code==='PT409');
      await db.exec('reset role');await db.query('update public.projects set document_id=null where id=$1',[projectId]);await asUser();await assert.rejects(finish(first),e=>e.code==='PT409');
      await db.exec('reset role');await db.query('delete from public.projects where id=$1',[projectId]);
      for(const table of ['reinforcement_visuals','reinforcement_review_versions','reinforcements'])assert.equal((await db.query(`select count(*)::int n from public.${table}`)).rows[0].n,0);
    });
  }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
