import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(relative, dependencies) {
  const filename = fileURLToPath(new URL(`../${relative}`, import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, { exports, Request, Response, URL, console: { error() {} }, require(name) {
    if (name in dependencies) return dependencies[name];
    if (name === 'zod') return require(name);
    throw Error(`Unexpected dependency: ${name}`);
  } }, { filename });
  return exports;
}
const projectId = '557c6125-d5ca-401b-b105-31a051699371';
const documentId = '73f3c087-a137-4cd3-a1e1-d126599b9c86';
const ownerId = '8f4cf03b-4713-43f1-9b6c-d435457f5afe';
const input = { projectId, documentId, ownerId };
const { deleteOwnedProject } = load('lib/documents/delete-project.ts', {});

function fixture(options = {}) {
  const calls = [];
  const paths = options.paths ?? [`${ownerId}/original.pdf`, `${ownerId}/version2.pdf`];
  const client = {
    async rpc(name, args) {
      calls.push([name, args]);
      if (name === 'begin_project_deletion') return { data: options.snapshot ?? { state: options.state ?? 'pending', storage_paths: paths }, error: options.beginError ?? null };
      if (name === 'finish_project_deletion') {
        if (options.finishThrows) throw Error('Disconnected');
        return { data: options.finished ?? true, error: options.finishError ?? null };
      }
      if (options.failureLogThrows) throw Error('Disconnected');
      return { error: null };
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'pdf-documents');
      return { async remove(paths) {
        calls.push(['remove', paths]); if (options.storageThrows) throw Error('Disconnected');
        return { error: options.storageError ?? null };
      } };
    } },
  };
  return { calls, run: () => deleteOwnedProject(client, input) };
}

test('cleanup never touches files when ownership, permission or the expected version is rejected', async () => {
  for (const [code, status] of [['42501', 404], ['40001', 409], ['PGRST202', 503]]) {
    const f = fixture({ beginError: { code } }); const result = await f.run();
    assert.equal(result.status, status); assert.equal(result.success, false); assert.equal(f.calls.length, 1);
  }
});
test('completed cleanup retries succeed without repeating effects', async () => {
  const f = fixture({ state: 'completed' }); assert.equal((await f.run()).success, true); assert.equal(f.calls.length, 1);
});
test('cleanup snapshots cannot make the server delete a different owner path', async () => {
  for (const snapshot of [{ state: 'pending', storage_paths: ['other-user/private.pdf'] }, { state: 'unknown', storage_paths: [] }]) {
    const f = fixture({ snapshot }); assert.equal((await f.run()).success, false); assert.equal(f.calls.length, 1);
  }
});
test('all version objects are removed before records are finalized', async () => {
  const f = fixture(); const result = await f.run(); assert.equal(result.success, true);
  assert.equal(f.calls[0][0], 'begin_project_deletion'); assert.equal(f.calls[1][0], 'remove');
  assert.equal(f.calls[2][0], 'finish_project_deletion'); assert.equal(f.calls.length, 3);
});
test('large histories are removed in bounded batches without skipping versions', async () => {
  const paths = Array.from({ length: 205 }, (_, i) => `${ownerId}/${i}.pdf`);
  const f = fixture({ paths }); assert.equal((await f.run()).success, true);
  const removed = f.calls.filter(c => c[0] === 'remove');
  assert.deepEqual(removed.map(c => c[1].length), [100, 100, 5]);
  assert.equal(JSON.stringify(removed.flatMap(c => c[1])), JSON.stringify(paths));
  assert.equal(f.calls.at(-1)[0], 'finish_project_deletion');
});
test('storage errors and disconnections remain recoverable and never finalize records', async () => {
  for (const options of [{ storageError: {} }, { storageThrows: true }]) {
    const f = fixture(options); const result = await f.run();
    assert.equal(result.status, 503); assert.equal(result.success, false);
    assert.match(result.message, /pendiente de limpieza/);
    assert.ok(!f.calls.some(c => c[0] === 'finish_project_deletion'));
    assert.equal(f.calls.at(-1)[0], 'record_project_deletion_failure'); assert.equal(f.calls.at(-1)[1].p_stage, 'storage');
  }
});
test('record failures preserve the pending job and a lost failure-log response is still a failure', async () => {
  for (const options of [{ finishError: {} }, { finished: false }, { finishThrows: true, failureLogThrows: true }]) {
    const f = fixture(options); const result = await f.run();
    assert.equal(result.success, false); assert.equal(result.status, 503);
    assert.equal(f.calls.at(-1)[0], 'record_project_deletion_failure'); assert.equal(f.calls.at(-1)[1].p_stage, 'records');
  }
});

const origin = 'http://localhost:3000';
function routeFixture(options = {}) {
  const calls = [], paths = [];
  const route = load('app/api/projects/[projectId]/delete/route.ts', {
    'next/cache': { revalidatePath(path) { paths.push(path); } },
    '@/lib/auth/access': { async checkPermission(p) { calls.push(['permission', p]); return options.access ?? { ok: true, userId: ownerId }; } },
    '@/lib/documents/delete-project': { async deleteOwnedProject(client, input) { calls.push(['cleanup', input]); return options.result ?? { success: true, status: 200, message: 'Deleted' }; } },
    '@/lib/documents/mutation-request': load('lib/documents/mutation-request.ts', {}),
    '@/lib/supabase/server': { async createClient() { calls.push(['client']); return {}; } },
  });
  const run = (body = { confirmed: true, documentId }, requestOrigin = origin) => route.POST(
    new Request(`${origin}/api/projects/${projectId}/delete`, { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ projectId }) },
  );
  return { calls, paths, run };
}
test('delete API requires same-origin requests, an authenticated role and explicit confirmation', async () => {
  const cross = routeFixture(); assert.equal((await cross.run(undefined, 'https://other.example')).status, 403); assert.deepEqual(cross.calls, []);
  for (const status of [401, 403]) {
    const f = routeFixture({ access: { ok: false, status, message: 'Denied' } });
    assert.equal((await f.run()).status, status); assert.equal(f.calls.length, 1);
  }
  for (const body of [{ confirmed: false, documentId }, { confirmed: 'true', documentId }, { confirmed: true, documentId: 'bad' }, {}]) {
    const f = routeFixture(); assert.equal((await f.run(body)).status, 400); assert.equal(f.calls.length, 1);
  }
});
test('delete API uses its session owner, ignores forged ownership and shares the central cleanup', async () => {
  const f = routeFixture(); assert.equal((await f.run({ confirmed: true, documentId, ownerId: 'forged' })).status, 200);
  const input = f.calls.find(c => c[0] === 'cleanup')[1];
  assert.equal(input.ownerId, ownerId); assert.equal(input.projectId, projectId); assert.equal(input.documentId, documentId);
  assert.deepEqual(f.paths, ['/documents', `/projects/${projectId}`]);
});
test('partial cleanup responses are not converted to success and both views are refreshed', async () => {
  const f = routeFixture({ result: { success: false, status: 503, message: 'Pending cleanup' } });
  const response = await f.run(); assert.equal(response.status, 503); assert.equal((await response.json()).message, 'Pending cleanup');
  assert.deepEqual(f.paths, ['/documents', `/projects/${projectId}`]);
});
