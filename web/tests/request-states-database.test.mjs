import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content, idempotencyKey } from './reinforcement-test-helpers.mjs';

// Isolated PostgreSQL fixtures verify the exact migrations. No production rows,
// simulated AI results or screenshots are created by these tests.
test('HU017 state contract, audit triggers and history RLS in PostgreSQL', async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
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
    await db.exec(readFileSync(new URL('../../supabase/migrations/20261026211919_create_reinforcement_requests.sql', import.meta.url), 'utf8'));
    const secret = (await db.query('select secret from private.reinforcement_request_secrets')).rows[0].secret;
    process.env.REINFORCEMENT_REQUEST_SECRET = secret;
    const base = { userId: owner, projectId, content, idempotencyKey, pageCount: 2, storagePath: `${owner}/${documentId}.pdf`, sizeBytes: 100 };
    async function asUser(id = owner, role = 'authenticated') {
      await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); await db.exec(`set role ${role}`);
    }
    async function call(input = base, transform = x => x) {
      const args = transform(proof.signRequestProof(input));
      return (await db.query('select public.create_reinforcement_request($1,$2) as result', [args.p_payload, args.p_signature])).rows[0].result;
    }
    await asUser(); const first = await call(), id = first.request.id;
    await db.exec('reset role');
    await db.exec(readFileSync(new URL('../../supabase/migrations/20261026215447_track_reinforcement_request_states.sql', import.meta.url), 'utf8'));
    const history = async () => (await db.query('select * from public.reinforcement_request_events where request_id=$1 order by occurred_at,id', [id])).rows;
    const state = async () => (await db.query('select * from public.reinforcement_requests where id=$1', [id])).rows[0];
    async function transition(status, stage, error = null) {
      await db.query('update public.reinforcement_requests set status=$1,stage=$2,error_message=$3 where id=$4', [status, stage, error, id]);
    }
    await t.test('existing rows receive an honest migration baseline; new submissions receive one owner creation event', async () => {
      const baseline = await history(); assert.equal(baseline.length, 1);
      assert.equal(baseline[0].event_kind, 'baseline'); assert.equal(baseline[0].actor_kind, 'migration'); assert.equal(baseline[0].actor_id, null);
      await asUser(); const fresh = await call({ ...base, idempotencyKey: randomUUID() });
      const events = (await db.query('select * from public.reinforcement_request_events where request_id=$1', [fresh.request.id])).rows;
      assert.equal(events.length, 1); assert.equal(events[0].actor_id, owner); assert.equal(events[0].event_kind, 'created');
      await db.exec('reset role');
    });
    await t.test('authenticated owners cannot change a status, approve a request or rewrite history directly', async () => {
      await asUser();
      await assert.rejects(transition('processing', 'analyzing'), e => e.code === '42501');
      await assert.rejects(db.query('delete from public.reinforcement_request_events where request_id=$1', [id]), e => e.code === '42501');
      await assert.rejects(db.exec('insert into public.reinforcement_request_events default values'), e => e.code === '42501');
      await db.exec('reset role');
    });
    await t.test('valid processing, choice, failure, retry and generation transitions atomically record old/new stage and system actor', async () => {
      const before = (await state()).updated_at;
      for (const args of [['processing','analyzing'], ['pending','choosing'], ['processing','generating'], ['error','failed','Servicio no disponible'], ['processing','generating'], ['generated','review']]) await transition(...args);
      const events = await history(); assert.equal(events.length, 7);
      assert.equal(events[1].previous_status, 'pending'); assert.equal(events[1].previous_stage, 'queued');
      assert.equal(events[1].status, 'processing'); assert.equal(events[1].stage, 'analyzing');
      assert.ok(events.slice(1).every(e => e.actor_kind === 'system' && e.actor_id === null));
      assert.ok((await state()).updated_at > before); assert.equal((await state()).status, 'generated');
      const count = events.length; await asUser(); const retried = await call();
      assert.equal(retried.request.id, id); assert.equal(retried.request.status, 'generated');
      assert.equal((await history()).length, count); await db.exec('reset role');
    });
    await t.test('incoherent stages, missing error messages, invalid transitions and content mutation are rolled back', async () => {
      for (const args of [['pending','queued'], ['generated','analyzing'], ['error','failed']]) await assert.rejects(transition(...args), e => e.code === '23514');
      await assert.rejects(db.query('update public.reinforcement_requests set selected_text=$1 where id=$2', ['Otro texto', id]), e => e.code === '23514');
      assert.equal((await state()).selected_text, content.text); assert.equal((await history()).length, 7);
    });
    await t.test('approval requires an explicit owner transaction; automatic generation never implies approval', async () => {
      const approve = () => db.query("update public.reinforcement_requests set status='approved',stage='approved',approved_by=owner_id,approved_at=now() where id=$1", [id]);
      await assert.rejects(approve(), e => e.code === '42501');
      await db.exec('begin'); await db.query("select set_config('pdf_interactivo.owner_approval',$1,true)", [id]);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other]);
      await assert.rejects(approve(), e => e.code === '42501'); await db.exec('rollback');
      // Contract test only: the future HU024 owner-approval RPC does not exist yet.
      await db.exec('begin'); await db.query("select set_config('pdf_interactivo.owner_approval',$1,true)", [id]);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
      await approve(); await db.exec('commit');
      const last = (await history()).at(-1); assert.equal(last.status, 'approved'); assert.equal(last.actor_kind, 'owner'); assert.equal(last.actor_id, owner);
      assert.equal((await state()).approved_by, owner);
      await assert.rejects(transition('processing','generating'), e => e.code === '23514');
    });
    await t.test('another owner, an inactive account and an anonymous caller cannot read private history', async () => {
      await asUser(other); assert.equal((await history()).length, 0);
      await db.exec(`reset role; update public.profiles set is_active=false where id='${owner}'`); await asUser();
      assert.equal((await history()).length, 0);
      await db.exec(`reset role; update public.profiles set is_active=true where id='${owner}'`); await asUser();
      assert.equal((await history()).length, 8);
      await asUser('', 'anon'); await assert.rejects(history(), e => e.code === '42501'); await db.exec('reset role');
    });
    await t.test('pending deletion hides the journal and project removal cascades requests and events together', async () => {
      await db.exec(`insert into public.project_deletions values(array['${documentId}'::uuid])`); await asUser();
      assert.equal((await history()).length, 0);
      await db.exec(`reset role; delete from public.projects where id='${projectId}'`);
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_request_events')).rows[0].n, 0);
    });
  } finally { await db.close(); }
});
