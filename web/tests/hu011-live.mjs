// Opt-in integration checks against localhost + disposable Supabase fixtures.
// Credentials are supplied outside the repository; sessions stay in memory.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const [accountsFile, fixtureFile, mode = 'authorize'] = process.argv.slice(2);
if (!accountsFile || !fixtureFile || !['authorize', 'begin', 'finish', 'access', 'access-cleanup'].includes(mode)) {
  throw Error('Usage: node tests/hu011-live.mjs ACCOUNTS_FILE FIXTURE_FILE authorize|begin|finish|access|access-cleanup');
}
const accounts = JSON.parse(await readFile(accountsFile, 'utf8')).users;
const fixture = JSON.parse(await readFile(fixtureFile, 'utf8'));
assert.equal(accounts.length, 2);
assert.ok(accounts.every(u => /^hu011-[12]-[0-9a-f-]+@example\.invalid$/.test(u.email)));
assert.equal(accounts[0].id, fixture.ownerId);
const base = 'http://localhost:3000';
const projectPath = `/projects/${fixture.projectId}`;
const checks = [];
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }

const environment = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/)
  .map(line => /^([A-Z_]+)\s*=\s*["']?([^"'\r\n]*)["']?$/.exec(line))
  .filter(Boolean).map(match => [match[1], match[2]]));

async function session(account) {
  const cookies = new Map();
  async function request(path, init = {}) {
    const headers = new Headers(init.headers);
    if (cookies.size) headers.set('Cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (init.method && init.method !== 'GET') headers.set('Origin', base);
    const response = await fetch(base + path, { ...init, headers, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0], split = pair.indexOf('=');
      const name = pair.slice(0, split), value = pair.slice(split + 1);
      if (/max-age=0/i.test(cookie)) cookies.delete(name); else cookies.set(name, value);
    }
    return response;
  }
  await request('/login');
  async function action(path, exportedName, args) {
    const manifest = JSON.parse(await readFile(new URL('../.next/dev/server/server-reference-manifest.json', import.meta.url), 'utf8'));
    const id = Object.keys(manifest.node).find(id => manifest.node[id].exportedName === exportedName);
    assert.ok(id, `Compiled action unavailable: ${exportedName}`);
    const response = await request(path, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) });
    assert.equal(response.status, 200, `Server Action ${exportedName} failed`);
    const body = await response.text();
    return { success: body.includes('"success":true'), refused: body.includes('"success":false') };
  }
  assert.equal((await action('/login', 'loginAction', [{ email: account.email, password: account.password }])).success, true, 'Synthetic login failed');
  const dashboard = await request('/dashboard'); assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Bienvenido a tus proyectos/);
  const client = createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedIn = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  assert.equal(signedIn.error, null); assert.equal(signedIn.data.user?.id, account.id);
  return { request, action, client };
}
const owner = await session(accounts[0]);
pass('real application login + authenticated owner session');
const { data: project, error: projectError } = await owner.client.from('projects').select('id, owner_id, name, document_id').eq('id', fixture.projectId).maybeSingle();
assert.equal(projectError, null);
const { data: job, error: jobError } = await owner.client.from('project_deletions').select('*').eq('project_id', fixture.projectId).maybeSingle();
assert.equal(jobError, null);
if (project) {
  assert.equal(project.owner_id, accounts[0].id);
  assert.equal(project.document_id, fixture.documentId);
  assert.ok(['SCRUM-173-original', 'HU011 prueba conjunta'].includes(project.name));
} else {
  assert.ok(job, 'Disposable project or cleanup job must exist');
  assert.equal(job.owner_id, accounts[0].id);
  assert.equal(job.document_id, fixture.documentId);
  assert.deepEqual([...job.document_ids].sort(), [fixture.oldDocumentId, fixture.documentId].sort());
}

if (mode === 'authorize') {
  assert.ok(project && !job, 'Run authorization checks before starting deletion');
  await owner.request('/documents');
  const invalid = await owner.action('/documents', 'renameDocumentAction', [{ projectId: fixture.projectId, name: '   ' }]);
  assert.equal(invalid.refused, true);
  const valid = await owner.action('/documents', 'renameDocumentAction', [{ projectId: fixture.projectId, name: ' HU011 prueba conjunta ' }]);
  assert.equal(valid.success, true);
  const renamed = await owner.client.from('projects').select('name').eq('id', fixture.projectId).single();
  assert.equal(renamed.data?.name, 'HU011 prueba conjunta');
  pass('valid + invalid rename through real Server Actions');

  const other = await session(accounts[1]); await other.request('/documents');
  assert.equal((await other.action('/documents', 'renameDocumentAction', [{ projectId: fixture.projectId, name: 'Intruso' }])).refused, true);
  assert.equal((await other.request(`/api${projectPath}/pdf`)).status, 404);
  const foreignReplace = new FormData(); foreignReplace.set('documentId', fixture.documentId); foreignReplace.set('confirmed', 'true');
  foreignReplace.set('file', new File([await readFile(new URL('./SCRUM-173-reemplazo.pdf', `file:///${fixture.fixtureDirectory.replaceAll('\\', '/')}/`))], 'other.pdf', { type: 'application/pdf' }));
  assert.equal((await other.request(`/api${projectPath}/replace`, { method: 'POST', body: foreignReplace })).status, 404);
  assert.equal((await other.request(`/api${projectPath}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: fixture.documentId, confirmed: true }) })).status, 404);
  assert.equal((await owner.client.from('projects').select('name').eq('id', fixture.projectId).single()).data?.name, 'HU011 prueba conjunta');
  pass('second account cannot rename, replace, delete or download the first account document');

  const absent = await fetch(`${base}/api${projectPath}/pdf`); assert.equal(absent.status, 401);
  pass('unauthenticated download rejected');
  const stale = new FormData(); stale.set('documentId', fixture.oldDocumentId); stale.set('confirmed', 'true');
  stale.set('file', new File(['%PDF-invalid'], 'stale.pdf', { type: 'application/pdf' }));
  assert.equal((await owner.request(`/api${projectPath}/replace`, { method: 'POST', body: stale })).status, 409);
  pass('stale replacement refused before upload');
  assert.equal((await owner.request(`/api${projectPath}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: fixture.documentId, confirmed: false }) })).status, 400);
  assert.equal((await owner.client.from('project_deletions').select('project_id').eq('project_id', fixture.projectId)).data.length, 0);
  pass('unconfirmed deletion leaves no cleanup job or side effects');
  assert.equal((await owner.action('/documents', 'renameDocumentAction', [{ projectId: fixture.projectId, name: 'SCRUM-173-original' }])).success, true);
}
if (mode === 'begin') {
  const begin = await owner.client.rpc('begin_project_deletion', { p_project_id: fixture.projectId, p_expected_document_id: fixture.documentId });
  assert.equal(begin.error, null); assert.equal(begin.data.state, 'pending'); assert.equal(begin.data.storage_paths.length, 2);
  const finish = await owner.client.rpc('finish_project_deletion', { p_project_id: fixture.projectId });
  assert.equal(finish.error?.code, '55006', 'Cleanup must not finish while objects exist');
  assert.equal((await owner.client.rpc('record_project_deletion_failure', { p_project_id: fixture.projectId, p_stage: 'records' })).error, null);
  pass('real partial cleanup refuses completion while original + replacement objects still exist');
  assert.equal((await owner.request(`/api${projectPath}/pdf`)).status, 404);
  assert.equal((await owner.client.from('projects').select('id').eq('id', fixture.projectId)).data.length, 0);
  assert.equal((await owner.client.from('reinforcements').select('id').eq('document_id', fixture.oldDocumentId)).data.length, 0);
  for (const id of [fixture.oldDocumentId, fixture.documentId]) {
    const download = await owner.client.storage.from('pdf-documents').download(`${fixture.ownerId}/${id}.pdf`);
    assert.ok(download.error); assert.equal(download.data, null);
  }
  const pending = await owner.request('/documents'); assert.match(await pending.text(), /Eliminación pendiente de limpieza/);
  pass('pending cleanup blocks project/PDF/reinforcement/Storage reads and exposes a retry in the list');
}
if (mode === 'finish') {
  const body = JSON.stringify({ documentId: fixture.documentId, confirmed: true });
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body };
  const first = await owner.request(`/api${projectPath}/delete`, options);
  const firstBody = await first.json(); assert.equal(first.status, 200, firstBody.message);
  const repeated = await owner.request(`/api${projectPath}/delete`, options); assert.equal(repeated.status, 200);
  pass('confirmed application API retry completes cleanup and repeated requests are idempotent');
  assert.equal((await owner.request(`/api${projectPath}/pdf`)).status, 404);
  const completed = await owner.client.from('project_deletions').select('state').eq('project_id', fixture.projectId).single();
  assert.equal(completed.data?.state, 'completed');
  assert.equal((await owner.client.from('documents').select('id').in('id', [fixture.oldDocumentId, fixture.documentId])).data.length, 0);
  assert.equal((await owner.client.from('reinforcements').select('id').eq('document_id', fixture.oldDocumentId)).data.length, 0);
  for (const id of [fixture.oldDocumentId, fixture.documentId]) assert.ok((await owner.client.storage.from('pdf-documents').download(`${fixture.ownerId}/${id}.pdf`)).error);
  const listing = await owner.request('/documents'); const html = await listing.text();
  assert.ok(!html.includes('Eliminación pendiente de limpieza')); assert.match(html, /Aún no tienes documentos/);
  pass('final list and direct routes expose neither deleted version nor linked reinforcement');
}
if (mode === 'access') {
  const form = new FormData();
  form.set('file', new File([await readFile(join(fixture.fixtureDirectory, 'SCRUM-173-reemplazo.pdf'))], 'SCRUM-80-acceso-privado.pdf', { type: 'application/pdf' }));
  const response = await owner.request('/api/documents/upload', { method: 'POST', body: form });
  assert.equal(response.status, 200); const created = await response.json();
  const accessFixture = { projectId: created.project.id, documentId: created.document.id, ownerId: fixture.ownerId };
  const record = await owner.client.from('projects').select('name, owner_id').eq('id', accessFixture.projectId).single();
  assert.equal(record.data?.name, 'SCRUM-80-acceso-privado'); assert.equal(record.data?.owner_id, fixture.ownerId);
  await writeFile(join(fixture.fixtureDirectory, 'test-access-fixture.json'), JSON.stringify(accessFixture));
  const other = await session(accounts[1]);
  assert.equal((await other.request(`/api/projects/${accessFixture.projectId}/pdf`)).status, 404);
  pass('a second existing private project is visible to its owner and its PDF is denied to the other owner');
  console.log(`Synthetic access project: ${accessFixture.projectId}`);
}
if (mode === 'access-cleanup') {
  const accessFixture = JSON.parse(await readFile(join(fixture.fixtureDirectory, 'test-access-fixture.json'), 'utf8'));
  assert.equal(accessFixture.ownerId, accounts[0].id);
  const record = await owner.client.from('projects').select('name, owner_id, document_id').eq('id', accessFixture.projectId).single();
  assert.equal(record.data?.name, 'SCRUM-80-acceso-privado'); assert.equal(record.data?.owner_id, fixture.ownerId);
  assert.equal(record.data?.document_id, accessFixture.documentId);
  const response = await owner.request(`/api/projects/${accessFixture.projectId}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: accessFixture.documentId, confirmed: true }) });
  const body = await response.json(); assert.equal(response.status, 200, body.message);
  assert.equal((await owner.client.from('projects').select('id').eq('id', accessFixture.projectId)).data.length, 0);
  pass('the additional access-control fixture is fully deleted through the confirmed application API');
}
console.log(`${checks.length} live checks passed (${mode}); no credentials or session tokens written to output.`);
