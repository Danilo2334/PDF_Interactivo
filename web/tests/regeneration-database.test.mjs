import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, context, diagnosis, record, summary } from './summary-test-helpers.mjs';
import { explanation } from './explanation-test-helpers.mjs';
import { example } from './example-test-helpers.mjs';
import { visual } from './visual-test-helpers.mjs';
import { options as baseOptions } from './recommendation-test-helpers.mjs';
const options=['explanation','example','summary','image'].map(type=>({...baseOptions[0],type}));
const analysisProof=load('lib/reinforcements/analysis-proof.ts'),recProof=load('lib/reinforcements/recommendation-proof.ts');

test('HU024 owner-controlled regeneration preserves approved versions across every supported format',async t=>{
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
      readdirSync(migrationDir).find(n=>n.endsWith('_generate_explanation_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_example_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_visual_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_generate_summary_drafts.sql')),readdirSync(migrationDir).find(n=>n.endsWith('_owner_reinforcement_regeneration.sql'))];
    for(const name of names)await db.exec(readFileSync(new URL(name,migrationDir),'utf8'));
    await db.exec(readFileSync(new URL(readdirSync(migrationDir).find(n=>n.endsWith('_interactive_reinforcement_cards.sql')),migrationDir),'utf8'));
    await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
    await db.exec(readFileSync(new URL(readdirSync(migrationDir).find(n=>n.endsWith('_reinforcement_multimedia.sql')),migrationDir),'utf8'));
    const secret=(await db.query('select secret from private.reinforcement_request_secrets')).rows[0].secret;process.env.REINFORCEMENT_REQUEST_SECRET=secret;
    async function asUser(id=owner,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);}
    async function signed(name,signer,input,mutate=x=>x){const args=mutate(signer(input));return(await db.query(`select public.${name}($1,$2) result`,[args.p_payload,args.p_signature])).rows[0].result;}
    async function fresh(kind='summary'){await asUser();const r=await signed('create_reinforcement_request',proof.signRequestProof,{userId:owner,projectId,
      content:{...content,text:record.selected_text},idempotencyKey:randomUUID(),pageCount:2,storagePath:`${owner}/${documentId}.pdf`,sizeBytes:100});
      const requestId=r.request.id,analysisAttemptId=randomUUID(),attemptId=randomUUID(),base={userId:owner,requestId,documentId};
      await signed('change_reinforcement_analysis',analysisProof.signAnalysisProof,{...base,attemptId:analysisAttemptId,action:'start'});
      await signed('change_reinforcement_analysis',analysisProof.signAnalysisProof,{...base,attemptId:analysisAttemptId,action:'finish',status:'ready',context,diagnosis,model:'test-model',errorCode:null});
      await signed('change_reinforcement_recommendations',recProof.signRecommendationProof,{...base,analysisAttemptId,attemptId,action:'start'});
      await signed('change_reinforcement_recommendations',recProof.signRecommendationProof,{...base,analysisAttemptId,attemptId,action:'finish',status:'ready',options,model:'test-model',emptyReason:null,errorCode:null});
      await db.query('select public.choose_reinforcement_option($1,$2,$3,$4,0)',[requestId,documentId,attemptId,kind]);
      return {...base,analysisAttemptId,attemptId:randomUUID(),choiceVersion:1,expectedVersion:0,recAttemptId:attemptId};
    }


    const regenProof=load('lib/reinforcements/regeneration-proof.ts');
    const samples={explanation,example,summary,image:visual};
    async function generated(kind){const input=await fresh(kind),native=kind==='explanation'?'explanation':kind==='image'?'visual':kind;
      const signer=load('lib/reinforcements/'+native+'-proof.ts')['sign'+native[0].toUpperCase()+native.slice(1)+'Proof'];
      const call=(action,extra={})=>signed('change_reinforcement_'+native,signer,{...input,action,...extra});
      await call('configure',kind==='explanation'?{level:'brief'}:kind==='image'?{mode:'diagram'}:{mode:kind==='example'?'practical':'compact'});
      input.expectedVersion=1;await call('start');await call('finish',{status:'ready',content:samples[kind],model:'isolated-test',errorCode:null});
      if(kind==='explanation')await db.query('select public.prepare_explanation_review($1,$2)',[input.requestId,documentId]);
      return input;
    }
    const head=async input=>(await db.query('select * from public.reinforcement_review_heads where request_id=$1',[input.requestId])).rows[0];
    const pubs=async input=>(await db.query('select * from public.reinforcements where source_request_id=$1',[input.requestId])).rows;
    const review=async(input,action,version,extra={})=>kindReview(input,action,version,extra);
    async function kindReview(input,action,version,extra={}){const summaryKind=input.kind==='summary';return(await db.query('select public.'+(summaryKind?'review_reinforcement_summary($1,$2,$3,$4,$5,$6,$7,$8)':'review_reinforcement_draft($1,$2,$3,$4,$5,$6,$7)')+' result',
      [input.requestId,documentId,version,action,extra.title??null,extra.text??null,...(summaryKind?[extra.concepts??null]:[]),randomUUID()])).rows[0].result;}
    function operation(input,version=1){return {...input,expectedVersion:version,operationId:randomUUID(),attemptId:randomUUID(),instructions:'Aclara la transformación conservando la idea central y su alcance.'};}
    const regenerate=(op,action='start',extra={},mutate)=>signed('change_reinforcement_regeneration',regenProof.signRegenerationProof,{...op,action,...extra},mutate);
    for(const kind of ['explanation','example','summary','image'])await t.test(kind+': independent versions, exact replay, approval, rejection, stale and denied writes',async()=>{
      const input=await generated(kind);input.kind=kind;
      assert.equal((await pubs(input)).length,0);
      const approved=await review(input,'approve',1);assert.equal(approved.approved_by,owner);assert.ok(approved.approved_at);
      const original=(await pubs(input))[0],oldVersion=(await db.query('select * from public.reinforcement_review_versions where request_id=$1 and version=1',[input.requestId])).rows[0];
      const op=operation(input),claim=await regenerate(op);assert.equal(claim.disposition,'started');assert.equal(claim.previous.text,samples[kind].text);
      assert.equal((await regenerate(op)).disposition,'busy');assert.equal((await regenerate({...op,operationId:randomUUID()})).disposition,'busy');
      await assert.rejects(review(input,'discard',1),e=>e.code==='PT409');
      await assert.rejects(review(input,'edit',1,{title:'Un título diferente',text:samples[kind].text,concepts:summary.concepts}),e=>e.code==='PT409');
      await assert.rejects(regenerate({...op,instructions:'Otro ajuste distinto'}),e=>e.code==='PT409');
      await assert.rejects(regenerate(op,'finish',{status:'ready',content:{...samples[kind],sourceQuote:'Una cita que no existe en el PDF.'},model:'isolated-test'}),e=>e.code==='23514');
      assert.deepEqual((await pubs(input))[0],original);
      const next={...samples[kind],title:'Nueva versión para revisión humana'};
      const finished=await regenerate(op,'finish',{status:'ready',content:next,model:'isolated-test'});assert.equal(finished.job.result_version,2);
      assert.equal((await regenerate(op)).disposition,'cached');assert.equal((await head(input)).decision,'pending');
      assert.deepEqual((await pubs(input))[0],original);assert.deepEqual((await db.query('select * from public.reinforcement_review_versions where id=$1',[oldVersion.id])).rows[0],oldVersion);
      await assert.rejects(review(input,'approve',1),e=>e.code==='PT409');
      await review(input,'discard',2);assert.deepEqual((await pubs(input))[0],original);assert.equal((await head(input)).approved_version_id,oldVersion.id);
      await assert.rejects(review(input,'approve',2),e=>e.code==='PT409');
      const third=operation(input,2);await regenerate(third);await regenerate(third,'finish',{status:'ready',content:{...samples[kind],title:'Tercera versión revisable'},model:'isolated-test'});
      await review(input,'approve',3);assert.notEqual((await pubs(input))[0].approved_version_id,oldVersion.id);
      assert.equal((await pubs(input))[0].content.approvedBy,owner);
      const fail=operation(input,3),before=(await pubs(input))[0];await regenerate(fail);await regenerate(fail,'finish',{status:'error',errorCode:'timeout'});
      assert.deepEqual((await pubs(input))[0],before);assert.equal((await head(input)).current_version,3);
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_regenerations where request_id=$1',[input.requestId])).rows.length,0);
      await assert.rejects(regenerate({...fail,userId:other}),e=>e.code==='42501');await asUser();
      await assert.rejects(regenerate(operation(input,3),'start',{},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      await assert.rejects(db.query('update public.reinforcement_regenerations set instructions=$1 where request_id=$2',['forged',input.requestId]),e=>e.code==='42501');
      await assert.rejects(db.query('update public.reinforcements set title=$1 where source_request_id=$2',['forged',input.requestId]),e=>e.code==='42501');
      await db.exec('reset role');await db.exec("update public.reinforcement_regenerations set started_at=started_at-interval '10 minutes'");await asUser();
    });
    await t.test('expired worker cannot finish after a new operation, and explanations initialize without changing older data',async()=>{
      const input=await generated('explanation');input.kind='explanation';const old=operation(input);await regenerate(old);
      await db.exec('reset role');await db.query("update public.reinforcement_regenerations set lease_expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[old.operationId]);await asUser();
      const current=operation(input);await regenerate(current);await assert.rejects(regenerate(old,'finish',{status:'ready',content:explanation,model:'isolated-test'}),e=>e.code==='PT409');
      await regenerate(current,'finish',{status:'error',errorCode:'provider_unavailable'});assert.equal((await pubs(input)).length,0);assert.equal((await head(input)).current_version,1);
    });
    await t.test('HU026 card presentation retains approved content and source, serializes writes and enforces ownership',async()=>{
      const input=await generated('example');input.kind='example';await review(input,'approve',1);
      const published=(await pubs(input))[0],operation=randomUUID();
      const save=(version,expanded,op=operation,approved=published.approved_version_id)=>db.query('select public.save_reinforcement_card($1,$2,$3,$4,$5,$6,$7) result',
        [input.requestId,documentId,published.id,approved,version,expanded,op]).then(r=>r.rows[0].result);
      const saved=await save(0,false);assert.equal(saved.version,1);assert.equal(saved.initial_expanded,false);
      assert.deepEqual(await save(0,false),saved);await assert.rejects(save(0,true),e=>e.code==='PT409');
      await assert.rejects(save(0,true,randomUUID()),e=>e.code==='PT409');
      const updated=await save(1,true,randomUUID());assert.equal(updated.version,2);assert.equal(updated.initial_expanded,true);
      await review(input,'edit',1,{title:'Un borrador posterior',text:example.text});await review(input,'discard',2);
      assert.equal((await save(2,false,randomUUID())).version,3);assert.deepEqual((await pubs(input))[0],published);
      await assert.rejects(save(3,false,randomUUID(),randomUUID()),e=>e.code==='PT409');
      await assert.rejects(db.query('update public.reinforcement_cards set initial_expanded=true'),e=>e.code==='42501');
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_cards')).rows.length,0);
      await assert.rejects(save(3,true,randomUUID()),e=>e.code==='42501');
      await asUser(owner,'anon');await assert.rejects(save(3,true,randomUUID()),e=>e.code==='42501');await asUser();
      await db.exec('reset role');await db.query('update public.profiles set is_active=false where id=$1',[owner]);await asUser();
      await assert.rejects(save(3,true,randomUUID()),e=>e.code==='42501');
      await db.exec('reset role');await db.query('update public.profiles set is_active=true where id=$1',[owner]);
      await db.query("update public.projects set status='deleting' where id=$1",[projectId]);await asUser();
      await assert.rejects(save(3,true,randomUUID()),e=>['PT409','40001'].includes(e.code));
      await db.exec('reset role');await db.query("update public.projects set status='pending' where id=$1",[projectId]);await asUser();
      const pendingInput=await generated('example');
      await assert.rejects(db.query('select public.save_reinforcement_card($1,$2,$3,$4,0,false,$5)',[pendingInput.requestId,documentId,published.id,published.approved_version_id,randomUUID()]),e=>e.code==='42501');
    });
    await t.test('HU027 signed media lifecycle keeps private files staged until approval and revokes removed resources',async()=>{
      const input=await generated('example');input.kind='example';await review(input,'approve',1);const published=(await pubs(input))[0];
      const signer=load('lib/reinforcements/media-proof.ts').signMediaProof,assetId=randomUUID();
      const metadata={...input,userId:owner,reinforcementId:published.id,approvedVersionId:published.approved_version_id,assetId,kind:'image',title:'Diagrama de prueba aislada',
        fileName:'energy.png',mime:'image/png',size:120,storagePath:`${owner}/${assetId}.png`,url:null,fileHash:'a'.repeat(64),inputHash:'b'.repeat(64)};
      const change=(action,values={},mutate)=>signed('change_reinforcement_media',signer,{...metadata,action,...values},mutate);
      assert.equal((await change('prepare')).status,'uploading');assert.equal((await change('prepare')).id,assetId);
      await assert.rejects(change('approve'),e=>e.code==='PT409');
      await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['reinforcement-media',`${owner}/unprepared.png`]),e=>e.code==='42501');
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['reinforcement-media',metadata.storagePath]);
      const approved=await change('approve');assert.equal(approved.status,'approved');assert.ok(approved.approved_at);assert.deepEqual(await change('approve'),approved);
      await assert.rejects(change('prepare',{inputHash:'c'.repeat(64)}),e=>e.code==='PT409');
      await assert.rejects(change('prepare',{approvedVersionId:randomUUID()}),e=>e.code==='PT409');
      await assert.rejects(change('prepare',{},p=>({...p,p_signature:'0'.repeat(64)})),e=>e.code==='42501');
      await assert.rejects(db.query("update public.reinforcement_media set title='forged'"),e=>e.code==='42501');
      await asUser(other);assert.equal((await db.query('select * from public.reinforcement_media')).rows.length,0);
      assert.equal((await db.query("select * from storage.objects where bucket_id='reinforcement-media'")).rows.length,0);
      await assert.rejects(change('remove',{userId:other}),e=>e.code==='42501');await asUser();
      assert.equal((await change('remove')).status,'removed');assert.equal((await change('remove')).id,assetId);
      assert.equal((await db.query('select * from storage.objects where name=$1',[metadata.storagePath])).rows.length,0);
      await assert.rejects(change('prepare'),e=>e.code==='PT409');assert.deepEqual((await pubs(input))[0],published);
      const linkId=randomUUID();const link={assetId:linkId,kind:'link',fileName:null,mime:null,size:0,storagePath:null,url:'https://es.wikipedia.org/wiki/Energ%C3%ADa',fileHash:null,inputHash:'d'.repeat(64)};
      await change('prepare',link);assert.equal((await change('approve',link)).status,'approved');
      for(const url of ['http://es.wikipedia.org/wiki/Energia','https://es.wikipedia.org.evil.invalid/wiki/Energia','https://localhost/private','https://es.wikipedia.org/wiki/Energia?redirect=evil'])
        await assert.rejects(change('prepare',{...link,assetId:randomUUID(),url}),e=>e.code==='23514');
      await assert.rejects(change('prepare',{...link,assetId:randomUUID(),kind:'image',mime:'image/svg+xml',size:100,storagePath:`${owner}/fake.svg`,fileName:'fake.svg',fileHash:'a'.repeat(64),url:null}),e=>e.code==='23514');
    });
  }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;await db.close();}
});
