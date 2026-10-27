import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { proof, owner, other, projectId, documentId, content, idempotencyKey } from './reinforcement-test-helpers.mjs';

// Real PostgreSQL engine in memory. Minimal fixture recreates external Supabase
// contracts; the migration and all PL/pgSQL/RLS under test are loaded verbatim.
test('HU016 migration, PostgreSQL constraints, RPC authentication and RLS', async t => {
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
    await t.test('the forward migration changes only two conflict codes and preserves function metadata, ACL and RLS', async () => {
      const functions = async () => (await db.query(`select n.nspname schema,p.proname name,p.prosrc source,to_jsonb(p)-'prosrc' metadata
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in ('public','private','auth') order by p.oid`)).rows;
      const security = async () => ({ tables: (await db.query(`select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text
        from pg_class c where c.relnamespace in ('public'::regnamespace,'private'::regnamespace) and c.relkind='r' order by c.oid`)).rows,
        policies: (await db.query("select * from pg_policies where schemaname in ('public','private') order by schemaname,tablename,policyname")).rows });
      const before = await functions(), accessBefore = await security();
      const migrations = readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter(name => name.endsWith('_fix_request_conflict_codes.sql'));
      assert.equal(migrations.length, 1, 'Load the single HU016 forward migration independently of its reconciled remote timestamp');
      await db.exec(readFileSync(new URL('../../supabase/migrations/' + migrations[0], import.meta.url), 'utf8'));
      let replacements = 0;
      const expected = before.map(fn => {
        if (fn.schema !== 'private' || fn.name !== 'create_verified_reinforcement_request') return fn;
        replacements = (fn.source.match(/errcode = '40001'/g) ?? []).length;
        assert.equal(fn.metadata.prosecdef, true); assert.deepEqual(fn.metadata.proconfig, ['search_path=""']);
        return { ...fn, source: fn.source.replaceAll("errcode = '40001'", "errcode = 'PT409'") };
      });
      assert.equal(replacements, 2); assert.deepEqual(await functions(), expected); assert.deepEqual(await security(), accessBefore);
    });
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
    let id;
    await t.test('owner creates a complete pending request and retries return the same ID and date', async () => {
      await asUser(); const first = await call(); id = first.request.id;
      assert.equal(first.created, true); assert.equal(first.request.status, 'pending');
      const second = await call(); assert.equal(second.created, false); assert.deepEqual(second.request, first.request);
      const rows = (await db.query('select * from public.reinforcement_requests')).rows; assert.equal(rows.length, 1);
      assert.equal(rows[0].owner_id, owner); assert.equal(rows[0].need, content.need); assert.equal(rows[0].selected_text, content.text);
      assert.equal(rows[0].verified_page_count, 2);
    });
    await t.test('same key with changed content conflicts without inserting', async () => {
      await assert.rejects(call({ ...base, content: { ...content, text: 'Texto diferente' } }), e => e.code === '23505');
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_requests')).rows[0].n, 1);
    });
    await t.test('another owner cannot read or write another project; private secrets and direct inserts are forbidden', async () => {
      await asUser(other); assert.equal((await db.query('select * from public.reinforcement_requests')).rows.length, 0);
      await assert.rejects(call(), e => e.code === '42501');
      await assert.rejects(call({ ...base, userId: other, idempotencyKey: randomUUID() }), e => e.code === '42501');
      await assert.rejects(db.query('select * from private.reinforcement_request_secrets'), e => e.code === '42501');
      await assert.rejects(db.exec('insert into public.reinforcement_requests default values'), e => e.code === '42501');
    });
    await t.test('forged, altered and expired PDF proofs fail even when RPC is called directly', async () => {
      await asUser();
      await assert.rejects(call(base, p => ({ ...p, p_signature: '0'.repeat(64) })), e => e.code === '42501');
      await assert.rejects(call(base, p => ({ ...p, p_payload: p.p_payload.replace('"pageCount":2', '"pageCount":999') })), e => e.code === '42501');
      await assert.rejects(call(base, p => {
        const data = JSON.parse(p.p_payload); data.expiresAt = 1; const payload = JSON.stringify(data);
        return { p_payload: payload, p_signature: createHmac('sha256', secret).update(payload).digest('hex') };
      }), e => e.code === '42501');
    });
    await t.test('constraints reject empty text, incoherent selection and page beyond the verified count', async () => {
      for (const changes of [{ text: '' }, { pageNumber: 3 }, { fragment: { kind: 'area', documentId, pageNumber: 2 } }]) {
        // A signed malformed fixture verifies DB constraints independently of Zod.
        const args = proof.signRequestProof(base); const payload = JSON.parse(args.p_payload);
        payload.idempotencyKey = randomUUID(); payload.content = { ...payload.content, ...changes };
        const raw = JSON.stringify(payload), signature = createHmac('sha256', secret).update(raw).digest('hex');
        await assert.rejects(db.query('select public.create_reinforcement_request($1,$2)', [raw, signature]), e => e.code === '23514');
      }
    });
    await t.test('inactive and viewer accounts are refused even with a previously valid session/proof', async () => {
      for (const update of ["is_active=false", "is_active=true,role='viewer'"]) {
        await db.exec(`reset role; update public.profiles set ${update} where id='${owner}'`); await asUser();
        await assert.rejects(call(), e => e.code === '42501'); assert.equal((await db.query('select * from public.reinforcement_requests')).rows.length, 0);
      }
      await db.exec(`reset role; update public.profiles set is_active=true,role='owner' where id='${owner}'`); await asUser();
    });
    await t.test('a proof retained before PDF replacement fails with PT409 without insertion while a committed receipt remains idempotent', async () => {
      const retained = proof.signRequestProof({ ...base, idempotencyKey: randomUUID() });
      const before = (await db.query('select * from public.reinforcement_requests order by id')).rows;
      const replacement = randomUUID(); await db.exec(`reset role;
        insert into public.documents values('${replacement}','${owner}','new.pdf',100);
        update public.projects set document_id='${replacement}' where id='${projectId}';`); await asUser();
      await assert.rejects(db.query('select public.create_reinforcement_request($1,$2)', [retained.p_payload, retained.p_signature]), e => e.code === 'PT409');
      assert.deepEqual((await db.query('select * from public.reinforcement_requests order by id')).rows, before);
      assert.equal((await call()).request.id, id);
      await db.exec(`reset role; update public.projects set document_id='${documentId}' where id='${projectId}'`); await asUser();
    });
    await t.test('a retained proof rejects changed PDF storage metadata with PT409 without inserting requests', async () => {
      for (const [column, value] of [['storage_path', 'replacement.pdf'], ['size_bytes', 101]]) {
        const retained = proof.signRequestProof({ ...base, idempotencyKey: randomUUID() });
        const before = (await db.query('select * from public.reinforcement_requests order by id')).rows;
        await db.exec('reset role'); await db.query(`update public.documents set ${column}=$1 where id=$2`, [value, documentId]); await asUser();
        await assert.rejects(db.query('select public.create_reinforcement_request($1,$2)', [retained.p_payload, retained.p_signature]), e => e.code === 'PT409');
        assert.deepEqual((await db.query('select * from public.reinforcement_requests order by id')).rows, before);
        await db.exec('reset role'); await db.query('update public.documents set storage_path=$1,size_bytes=100 where id=$2', [base.storagePath, documentId]); await asUser();
      }
    });
    await t.test('pending deletion blocks reads and retries; project deletion cascades private requests', async () => {
      await db.exec(`reset role; insert into public.project_deletions values(array['${documentId}'::uuid])`); await asUser();
      assert.equal((await db.query('select * from public.reinforcement_requests')).rows.length, 0);
      await assert.rejects(call(), e => e.code === '42501');
      await db.exec(`reset role; delete from public.projects where id='${projectId}'`);
      assert.equal((await db.query('select count(*)::int n from public.reinforcement_requests')).rows[0].n, 0);
    });
    await t.test('anonymous users have no execute access to the public RPC', async () => {
      await asUser('', 'anon'); await assert.rejects(call(), e => e.code === '42501');
    });
  } finally { await db.close(); }
});
