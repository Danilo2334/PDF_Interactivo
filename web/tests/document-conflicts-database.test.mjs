import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../../supabase/migrations/', import.meta.url);
const versionSql = readFileSync(new URL('20261025190000_add_project_document_versions.sql', migrations), 'utf8');
const deletionSql = readFileSync(new URL('20261025200000_add_recoverable_project_deletion.sql', migrations), 'utf8');
const forwardFiles = readdirSync(migrations).filter(name => name.endsWith('_fix_document_conflict_codes.sql'));
assert.equal(forwardFiles.length, 1);
const forward = readFileSync(new URL(forwardFiles[0], migrations), 'utf8');
const normalize = value => value.replaceAll('\r\n', '\n');
const sourceFunction = (sql, name) => normalize(sql.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))[0]);

test('document conflict migration changes only the three deterministic SQLSTATE codes', () => {
  const expected = ['replace_project_pdf', 'begin_project_deletion'].map((name, i) =>
    sourceFunction(i === 0 ? versionSql : deletionSql, name)
      .replace('create function', 'create or replace function').replaceAll("'40001'", "'PT409'"));
  const actual = normalize(forward).match(/create or replace function public\.[\s\S]*?\n\$\$;/g);
  assert.deepEqual(actual, expected);
  assert.equal((forward.match(/'PT409'/g) ?? []).length, 3);
  assert.doesNotMatch(forward, /\b(?:grant|revoke|alter table|create policy|drop|truncate)\b/i);
});

test('document conflicts reject stale operations in PostgreSQL without changing records or privileges', async t => {
  const db = new PGlite();
  const owner = '8f4cf03b-4713-43f1-9b6c-d435457f5afe';
  const other = 'f95f9e48-dc9f-44b8-b6f0-a566f5fe5aa6';
  const project = '557c6125-d5ca-401b-b105-31a051699371';
  const otherProject = 'cd6a4eb3-2b44-4a21-8a38-c64634cc612c';
  const original = '73f3c087-a137-4cd3-a1e1-d126599b9c86';
  const replacement = '2f199784-0d8b-47ee-8e12-96834511726c';
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema private; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function storage.allow_any_operation(text[]) returns boolean language sql stable as $$ select false $$;
      create table auth.users(id uuid primary key);
      create table public.profiles(id uuid primary key,role text,is_active boolean);
      create table public.documents(id uuid primary key,owner_id uuid,original_name text,
        storage_path text,size_bytes bigint,mime_type text,status text);
      create table public.projects(id uuid primary key,owner_id uuid,document_id uuid references public.documents(id),
        status text constraint projects_status_check check(status in ('pending','processing','ready','failed')));
      create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);
      alter table public.documents enable row level security;
      alter table public.projects enable row level security;
      alter table storage.objects enable row level security;
      create policy "owners read documents" on public.documents for select to authenticated using(owner_id=(select auth.uid()));
      create policy "owners read projects" on public.projects for select to authenticated using(owner_id=(select auth.uid()));
      create policy "owners read objects" on storage.objects for select to authenticated using(split_part(name,'/',1)=(select auth.uid())::text);
      grant usage on schema auth,private,storage to authenticated;
      grant select on public.documents,public.projects,storage.objects to authenticated;
      insert into auth.users values('${owner}'),('${other}');
      insert into public.profiles values('${owner}','owner',true),('${other}','owner',true);
      insert into public.documents values('${original}','${owner}','original.pdf','${owner}/${original}.pdf',100,'application/pdf','uploaded');
      insert into public.projects values('${project}','${owner}','${original}','pending');
      insert into storage.objects(bucket_id,name) values('pdf-documents','${owner}/${original}.pdf'),('pdf-documents','${owner}/${replacement}.pdf');
    `);
    await db.exec(versionSql); await db.exec(deletionSql);
    const metadata = async () => ({
      functions: (await db.query(`select proname,proacl::text as acl,prosecdef,proconfig,proowner,provolatile,prosrc
        from pg_proc where oid in ('public.replace_project_pdf(uuid,uuid,uuid,text,text,bigint)'::regprocedure,
          'public.begin_project_deletion(uuid,uuid)'::regprocedure) order by proname`)).rows,
      tables: (await db.query(`select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname in ('public','storage') and c.relkind='r' order by n.nspname,c.relname`)).rows,
      policies: (await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows,
    });
    const before = await metadata(); await db.exec(forward); const after = await metadata();
    assert.deepEqual(after.tables,before.tables); assert.deepEqual(after.policies,before.policies);
    assert.deepEqual(after.functions,before.functions.map(f => ({...f,prosrc:f.prosrc.replaceAll("'40001'","'PT409'")})));
    async function asUser(id=owner,role='authenticated') {
      await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); await db.exec(`set role ${role}`);
    }
    const replace = expected => db.query('select public.replace_project_pdf($1,$2,$3,$4,$5,$6) as id',
      [project,expected,replacement,'replacement.pdf',`${owner}/${replacement}.pdf`,100]);
    const begin = expected => db.query('select public.begin_project_deletion($1,$2)',[project,expected]);
    const snapshot = async () => {
      await db.exec('reset role'); return (await db.query(`select
        (select jsonb_agg(to_jsonb(p) order by p.id) from public.projects p) projects,
        (select jsonb_agg(to_jsonb(d) order by d.id) from public.documents d) documents,
        (select jsonb_agg(to_jsonb(v) order by v.project_id,v.document_id) from public.project_document_versions v) versions,
        (select jsonb_agg(to_jsonb(j) order by j.project_id) from public.project_deletions j) jobs,
        (select jsonb_agg(to_jsonb(o) order by o.id) from storage.objects o) objects`)).rows;
    };
    await t.test('stale replacement and deletion preserve the current file, project and cleanup state',async () => {
      const initial = await snapshot(); await asUser();
      await assert.rejects(replace(replacement), e=>e.code==='PT409');
      await assert.rejects(begin(replacement), e=>e.code==='PT409');
      assert.deepEqual(await snapshot(),initial);
    });
    await t.test('a document linked to another history is rejected before inserting a replacement',async () => {
      await db.exec(`insert into public.projects values('${otherProject}','${owner}','${original}','pending');
        insert into public.project_document_versions(project_id,document_id) values('${otherProject}','${original}');`);
      const initial = await snapshot(); await asUser();
      await assert.rejects(replace(original), e=>e.code==='PT409');
      assert.deepEqual(await snapshot(),initial);
      await db.exec(`delete from public.projects where id='${otherProject}'`);
    });
    await t.test('a valid replacement still succeeds and the old deletion confirmation then conflicts',async () => {
      await asUser(); assert.equal((await replace(original)).rows[0].id,replacement);
      const initial = await snapshot(); await asUser();
      await assert.rejects(begin(original), e=>e.code==='PT409');
      assert.deepEqual(await snapshot(),initial);
    });
    await t.test('foreign and anonymous sessions keep their original denial without modifying data',async () => {
      const initial = await snapshot(); await asUser(other);
      await assert.rejects(begin(replacement),e=>e.code==='42501');
      await assert.rejects(replace(replacement),e=>e.code==='42501');
      assert.equal((await db.query('select * from public.projects')).rows.length,0);
      await asUser('', 'anon'); await assert.rejects(begin(replacement),e=>e.code==='42501');
      assert.deepEqual(await snapshot(),initial);
    });
  } finally { await db.close(); }
});
