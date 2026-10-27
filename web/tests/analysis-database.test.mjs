import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID, createHmac } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content } from './reinforcement-test-helpers.mjs';
import { load, record, context, diagnosis } from './analysis-test-helpers.mjs';
const signer = load('lib/reinforcements/analysis-proof.ts');

test('HU018 signed analysis lifecycle and ownership in isolated PostgreSQL', async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const previousSecret = process.env.REINFORCEMENT_REQUEST_SECRET;
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
    for (const name of ['20261026211919_create_reinforcement_requests.sql', '20261026215447_track_reinforcement_request_states.sql', '20261026224216_contextual_request_analysis.sql'])
      await db.exec(readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'));
    await t.test('the forward migration changes only four conflict codes and preserves function metadata, ACL and RLS', async () => {
      const functions = async () => (await db.query(`select n.nspname schema,p.proname name,replace(p.prosrc,chr(13)||chr(10),chr(10)) source,to_jsonb(p)-'prosrc' metadata
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in ('public','private','auth') order by p.oid`)).rows;
      const security = async () => ({ tables: (await db.query(`select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text
        from pg_class c where c.relnamespace in ('public'::regnamespace,'private'::regnamespace) and c.relkind='r' order by c.oid`)).rows,
        policies: (await db.query("select * from pg_policies where schemaname in ('public','private') order by schemaname,tablename,policyname")).rows });
      const before = await functions(), accessBefore = await security();
      const files = readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter(name => name.endsWith('_fix_analysis_conflict_codes.sql'));
      assert.equal(files.length, 1);
      await db.exec(readFileSync(new URL('../../supabase/migrations/' + files[0], import.meta.url), 'utf8'));
      let replacements = 0;
      const expected = before.map(fn => {
        if (fn.schema !== 'private' || fn.name !== 'change_verified_reinforcement_analysis') return fn;
        replacements = (fn.source.match(/'40001'/g) ?? []).length;
        assert.equal(fn.metadata.prosecdef, true); assert.deepEqual(fn.metadata.proconfig, ['search_path=""']);
        return { ...fn, source: fn.source.replaceAll("'40001'", "'PT409'") };
      });
      assert.equal(replacements, 4); assert.deepEqual(await functions(), expected); assert.deepEqual(await security(), accessBefore);
    });
    const secret = (await db.query('select secret from private.reinforcement_request_secrets')).rows[0].secret;
    process.env.REINFORCEMENT_REQUEST_SECRET = secret;
    async function asUser(id = owner, role = 'authenticated') {
      await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec(`set role ${role}`);
    }
    async function fresh() {
      await asUser();
      const args = proof.signRequestProof({ userId: owner, projectId, content: { ...content, text: record.selected_text }, idempotencyKey: randomUUID(),
        pageCount: 2, storagePath: `${owner}/${documentId}.pdf`, sizeBytes: 100 });
      return (await db.query('select public.create_reinforcement_request($1,$2) result',[args.p_payload,args.p_signature])).rows[0].result.request.id;
    }
    async function call(input, mutate = x => x) {
      const args = mutate(signer.signAnalysisProof({ userId: owner, documentId, ...input }));
      return (await db.query('select public.change_reinforcement_analysis($1,$2) result',[args.p_payload,args.p_signature])).rows[0].result;
    }
    const start = requestId => ({ action: 'start', requestId, attemptId: randomUUID() });
    const finish = input => ({ ...input, action: 'finish', status: 'ready', context, diagnosis, model: 'test-model', errorCode: null });
    const fail = input => ({ ...input, action: 'finish', status: 'error', context, diagnosis: null, model: null, errorCode: 'timeout' });
    const state = async id => (await db.query('select status,stage,selected_text from public.reinforcement_requests where id=$1',[id])).rows[0];
    let first, initial;

    await t.test('forged/expired/domain-replayed proofs fail before rows or states change', async () => {
      first = await fresh(); initial = start(first);
      await assert.rejects(call(initial, p => ({ ...p, p_signature: '0'.repeat(64) })), e => e.code === '42501');
      for (const override of [{ operation: 'create-request' }, { expiresAt: 1 }, { userId: other }])
        await assert.rejects(call(initial, p => { const payload=JSON.stringify({ ...JSON.parse(p.p_payload), ...override });
          return { p_payload: payload, p_signature: createHmac('sha256',secret).update(payload).digest('hex') }; }), e => e.code === '42501');
      assert.equal((await state(first)).status,'pending');
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_analyses')).rows[0].n,0);
    });
    await t.test('one claim drives the analysis state and duplicate clicks return busy without a second attempt', async () => {
      assert.equal((await call(initial)).disposition,'started');
      const duplicate=await call(start(first)); assert.equal(duplicate.disposition,'busy'); assert.equal(duplicate.analysis.attempts,1);
      assert.deepEqual(await state(first),{ status:'processing',stage:'analyzing',selected_text:record.selected_text });
      const events=(await db.query('select * from public.reinforcement_request_events where request_id=$1 order by occurred_at',[first])).rows;
      assert.equal(events.length,2); assert.equal(events.at(-1).stage,'analyzing'); assert.equal(events.at(-1).actor_kind,'system');
    });
    await t.test('another owner/admin, an inactive owner and anonymous access cannot read or write a private analysis', async () => {
      await asUser(other); assert.equal((await db.query('select * from public.reinforcement_analyses')).rows.length,0);
      await assert.rejects(call(start(first)),e=>e.code==='42501');
      await db.exec(`reset role; update public.profiles set role='admin' where id='${other}'`); await asUser(other);
      assert.equal((await db.query('select * from public.reinforcement_analyses')).rows.length,0);
      await db.exec(`reset role; update public.profiles set is_active=false where id='${owner}'`); await asUser();
      assert.equal((await db.query('select * from public.reinforcement_analyses')).rows.length,0);
      await assert.rejects(call(finish(initial)),e=>e.code==='42501');
      await db.exec(`reset role; update public.profiles set is_active=true where id='${owner}'`); await asUser('', 'anon');
      await assert.rejects(db.query('select * from public.reinforcement_analyses'),e=>e.code==='42501');
      await asUser(); await assert.rejects(db.query("update public.reinforcement_analyses set status='ready'"),e=>e.code==='42501');
    });
    await t.test('a grounded finish persists once, keeps the original content and queues the future choice instead of approving', async () => {
      await assert.rejects(call({ ...finish(initial), context: { ...context, selectedText:'Sustitución' } }),e=>e.code==='23514');
      const result=await call(finish(initial)); assert.equal(result.analysis.status,'ready'); assert.equal(result.analysis.diagnosis.topic,diagnosis.topic);
      assert.deepEqual(await state(first),{ status:'pending',stage:'choosing',selected_text:record.selected_text });
      assert.equal((await call(start(first))).disposition,'cached');
      assert.equal((await call({ ...fail(initial),errorCode:'provider_unavailable' })).analysis.status,'ready');
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_request_events where request_id=$1',[first])).rows[0].n,3);
    });
    await t.test('an unrelated generated request cannot exploit null eligibility to restart as an analysis', async () => {
      const id=await fresh(); await db.exec('reset role');
      await db.query("update public.reinforcement_requests set status='processing',stage='generating' where id=$1",[id]);
      await db.query("update public.reinforcement_requests set status='generated',stage='review' where id=$1",[id]);
      await asUser(); await assert.rejects(call(start(id)),e=>e.code==='PT409');
    });
    await t.test('insufficient context records a clear failure without generating output; request content is immutable', async () => {
      const input=start(await fresh()); await call(input);
      const result=await call({ ...finish(input),status:'insufficient',context:{ ...context,enough:false },diagnosis:null,model:null,errorCode:'insufficient_context' });
      assert.equal(result.analysis.status,'insufficient'); assert.equal((await state(input.requestId)).stage,'failed');
      assert.equal((await call(start(input.requestId))).disposition,'cached');
      await db.exec('reset role'); await assert.rejects(db.query("update public.reinforcement_requests set need='alterado' where id=$1",[input.requestId]),e=>e.code==='23514');
      await asUser();
    });
    await t.test('expired claims are reclaimed atomically and an older worker can no longer publish', async () => {
      const input=start(await fresh()); await call(input); await db.exec('reset role');
      await db.query("update public.reinforcement_analyses set lease_expires_at=now()-interval '1 second' where request_id=$1",[input.requestId]);
      await asUser(); await assert.rejects(call(finish(input)),e=>e.code==='PT409');
      const retry=start(input.requestId), result=await call(retry); assert.equal(result.analysis.attempts,2);
      await assert.rejects(call(finish(input)),e=>e.code==='PT409'); await call(fail(retry));
      const recovery=start(input.requestId); await call(recovery); assert.equal((await call(finish(recovery))).analysis.status,'ready');
    });
    await t.test('a document replacement/deletion invalidates work before its diagnosis is persisted', async () => {
      const input=start(await fresh()); await call(input); await db.exec('reset role');
      await db.query('update public.projects set document_id=null where id=$1',[projectId]); await asUser();
      await assert.rejects(call(finish(input)),e=>e.code==='PT409');
      await db.exec('reset role'); await db.query('update public.projects set document_id=$1 where id=$2',[documentId,projectId]);
      await db.query('insert into public.project_deletions values($1)',[[documentId]]); await asUser();
      await assert.rejects(call(finish(input)),e=>e.code==='42501');
      assert.equal((await db.query('select * from public.reinforcement_analyses')).rows.length,0);
      await db.exec('reset role; delete from public.project_deletions'); await asUser(); await call(fail(input));
    });
    await t.test('account-wide claims bound concurrent provider work and recent analysis attempts', async () => {
      const a=start(await fresh()), b=start(await fresh()), c=start(await fresh());
      await call(a); await call(b); await assert.rejects(call(c),e=>e.code==='P0001'); await call(fail(a)); await call(fail(b));
      const recent=async()=>Number((await db.query("select count(*) n from public.reinforcement_request_events where stage='analyzing' and status='processing'")).rows[0].n);
      while(await recent()<10) { const attempt=start(c.requestId); await call(attempt); await call(fail(attempt)); }
      await assert.rejects(call(start(c.requestId)),e=>e.code==='P0001');
    });
    await t.test('project deletion cascades analyses and leaves no orphaned diagnosis', async () => {
      await db.exec('reset role'); await db.query('delete from public.projects where id=$1',[projectId]);
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_analyses')).rows[0].n,0);
    });
  } finally {
    if (previousSecret===undefined) delete process.env.REINFORCEMENT_REQUEST_SECRET; else process.env.REINFORCEMENT_REQUEST_SECRET=previousSecret;
    await db.close();
  }
});
