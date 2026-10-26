import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { File } from 'node:buffer';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { PDFDocument } from 'pdf-lib';
import { validation as requestValidation, submission as requestSubmission } from './reinforcement-test-helpers.mjs';

const require = createRequire(import.meta.url);
function load(relative, dependencies) {
  const filename = fileURLToPath(new URL(`../${relative}`, import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, Request, Response, File, FormData, URL, TextDecoder, structuredClone,
    crypto: { randomUUID: () => newId }, console: { error() {} },
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (['zod', 'react/jsx-runtime'].includes(name)) return require(name);
      throw Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  return exports;
}

const projectId = '557c6125-d5ca-401b-b105-31a051699371';
const oldId = '73f3c087-a137-4cd3-a1e1-d126599b9c86';
const newId = '2f199784-0d8b-47ee-8e12-96834511726c';
const ownerId = '8f4cf03b-4713-43f1-9b6c-d435457f5afe';
const url = `http://localhost:3000/api/projects/${projectId}/replace`;
const mutation = load('lib/documents/mutation-request.ts', {});
const validation = load('lib/validations/pdf-file.ts', {});
const difficultyValidation = load('lib/validations/difficulty.ts', {});
const doc = await PDFDocument.create(); doc.addPage([200, 200]);
const validPdf = new File([await doc.save()], 'version-2.pdf', { type: 'application/pdf' });

function fixture(options = {}) {
  const events = [], paths = [], permissions = [], filters = [];
  const client = {
    from(table) {
      assert.equal(table, 'projects'); events.push('project');
      return { select() { return this; }, eq(key, value) { filters.push([key, value]); return this; },
        async maybeSingle() { return { data: options.project === undefined ? { document_id: oldId, status: 'pending' } : options.project, error: options.projectError ?? null }; } };
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'pdf-documents');
      return {
        async upload(path, bytes, settings) { events.push(['upload', path, bytes.byteLength, settings]); return { data: { path }, error: options.uploadError ?? null }; },
        async remove(paths) { events.push(['remove', paths]); return { error: options.cleanupError ?? null }; },
      };
    } },
    async rpc(name, input) { events.push(['rpc', name, input]); return { data: newId, error: options.rpcError ?? null }; },
  };
  const route = load('app/api/projects/[projectId]/replace/route.ts', {
    'next/cache': { revalidatePath(path) { paths.push(path); } }, 'pdf-lib': { PDFDocument },
    '@/lib/auth/access': { async checkPermission(permission) { permissions.push(permission); return options.access ?? { ok: true, userId: ownerId }; } },
    '@/lib/documents/mutation-request': mutation, '@/lib/validations/pdf-file': validation,
    '@/lib/supabase/server': { async createClient() { return client; } },
  });
  async function run({ file = validPdf, confirmed = 'true', documentId = oldId, origin = 'http://localhost:3000', id = projectId } = {}) {
    const body = new FormData(); if (file) body.set('file', file);
    body.set('confirmed', confirmed); body.set('documentId', documentId);
    return route.POST(new Request(url, { method: 'POST', headers: { Origin: origin }, body }), { params: Promise.resolve({ projectId: id }) });
  }
  return { run, events, paths, permissions, filters };
}

test('replacement rejects cross-origin requests, unauthenticated users and denied roles before reading projects', async () => {
  const cross = fixture(); assert.equal((await cross.run({ origin: 'https://other.example' })).status, 403); assert.deepEqual(cross.events, []);
  for (const status of [401, 403, 503]) {
    const f = fixture({ access: { ok: false, status, message: 'Denied' } });
    assert.equal((await f.run()).status, status); assert.deepEqual(f.events, []);
    assert.deepEqual(f.permissions, ['documents.manage.own']);
  }
});

test('replacement requires explicit confirmation and valid project/version IDs', async () => {
  for (const args of [{ confirmed: 'false' }, { confirmed: '' }, { id: 'invalid' }, { documentId: 'invalid' }]) {
    const f = fixture(); assert.ok((await f.run(args)).status >= 400); assert.deepEqual(f.events, []);
  }
});

test('missing/foreign, failed lookup, stale version and pending deletion never upload anything', async () => {
  for (const options of [{ project: null }, { projectError: {} }, { project: { document_id: newId, status: 'pending' } }, { project: { document_id: oldId, status: 'deleting' } }]) {
    const f = fixture(options); assert.ok((await f.run()).status >= 400);
    assert.deepEqual(f.events, ['project']);
    assert.deepEqual(f.filters, [['id', projectId], ['owner_id', ownerId]]);
  }
});

test('missing, empty, renamed non-PDF and corrupt PDF files never reach storage', async () => {
  for (const file of [null, new File([], 'empty.pdf', { type: 'application/pdf' }), new File(['hello'], 'fake.pdf', { type: 'application/pdf' }), new File(['%PDF-broken'], 'broken.pdf', { type: 'application/pdf' })]) {
    const f = fixture(); assert.ok((await f.run({ file })).status >= 400); assert.deepEqual(f.events, ['project']);
  }
});

test('storage failure preserves the current document without invoking the replacement transaction', async () => {
  const f = fixture({ uploadError: { message: 'private error' } });
  const response = await f.run(); assert.equal(response.status, 503);
  assert.match((await response.json()).message, /vigente se conserva/);
  assert.equal(f.events.length, 2); assert.deepEqual(f.paths, []);
});

test('a valid replacement stores a new object before atomically attaching it to the same project', async () => {
  const f = fixture(); const response = await f.run(); assert.equal(response.status, 200);
  assert.equal(f.events[1][0], 'upload'); assert.equal(f.events[1][1], `${ownerId}/${newId}.pdf`);
  assert.equal(f.events[1][3].upsert, false);
  const [, name, args] = f.events[2]; assert.equal(name, 'replace_project_pdf');
  assert.equal(args.p_project_id, projectId); assert.equal(args.p_expected_document_id, oldId);
  assert.equal(args.p_document_id, newId); assert.equal(args.p_original_name, 'version-2.pdf');
  assert.equal(args.p_storage_path, `${ownerId}/${newId}.pdf`);
  assert.deepEqual(f.paths, ['/documents', `/projects/${projectId}`]);
});

test('a rolled-back transaction cleans only the newly uploaded object; stale edits return conflict', async () => {
  for (const code of ['23505', '40001', '42501', 'PGRST202']) {
    const f = fixture({ rpcError: { code } }); const response = await f.run();
    assert.equal(response.status, code === '40001' ? 409 : 503);
    assert.equal(JSON.stringify(f.events.at(-1)), JSON.stringify(['remove', [`${ownerId}/${newId}.pdf`]]));
    assert.deepEqual(f.paths, []);
  }
});

test('an ambiguous network failure never deletes a replacement which may already be committed', async () => {
  for (const code of [undefined, '', '08006']) {
    const f = fixture({ rpcError: { code } }); const response = await f.run();
    assert.equal(response.status, 503); assert.match((await response.json()).message, /comprobar su estado/);
    assert.equal(f.events.length, 3); assert.deepEqual(f.paths, []);
  }
});

test('a failed temporary-object cleanup is not reported as a completed replacement', async () => {
  const f = fixture({ rpcError: { code: '23505' }, cleanupError: {} });
  const response = await f.run(); assert.equal(response.status, 503);
  assert.match((await response.json()).message, /limpieza/); assert.deepEqual(f.paths, []);
});

test('changing PDF identity remounts the viewer even when the project ID stays the same', () => {
  const viewer = () => null;
  const { ProjectWorkspace } = load('components/documents/project-workspace.tsx', {
    react: { useId: () => 'workspace', useState: initial => [initial, () => {}], useCallback: callback => callback, useRef: initial => ({ current: initial }) },
    '@/components/documents/pdf-viewer': { PdfViewer: viewer },
    '@/components/documents/reinforcement-request-draft': { ReinforcementRequestDraft: () => null },
    '@/lib/validations/difficulty': difficultyValidation,
    '@/lib/pdf/extract-selection-text': load('lib/pdf/extract-selection-text.ts', {}),
    '@/lib/pdf/selection-text-draft': load('lib/pdf/selection-text-draft.ts', {}),
    '@/lib/validations/reinforcement-request': requestValidation,
    '@/lib/reinforcements/submission': requestSubmission,
  });
  function find(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === viewer) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child); if (found) return found; }
    return null;
  }
  const props = { projectId, reinforcements: [], reinforcementsError: false };
  const before = find(ProjectWorkspace({ ...props, documentId: oldId }));
  const after = find(ProjectWorkspace({ ...props, documentId: newId }));
  assert.ok(before && after); assert.notEqual(before.key, after.key);
  assert.equal(after.props.projectId, projectId);
});

test('replacement and deletion confirmations apply only to the PDF version the user confirmed', () => {
  for (const [path, exportName] of [
    ['components/documents/replace-document-form.tsx', 'ReplaceDocumentForm'],
    ['components/documents/delete-document-form.tsx', 'DeleteDocumentForm'],
  ]) {
    const states = []; let cursor = 0;
    const component = load(path, {
      react: { useId: () => 'test', useRef: value => ({ current: value }), useState(initial) {
        const index = cursor++; if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
      } },
      'next/navigation': { useRouter: () => ({ refresh() {}, push() {} }) },
      '@/lib/validations/pdf-file': validation,
    })[exportName];
    const render = documentId => { cursor = 0; return component({ projectId, documentId, name: 'Test' }); };
    function find(node, predicate) {
      if (!node || typeof node !== 'object') return null;
      if (predicate(node)) return node;
      for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; }
      return null;
    }
    let tree = render(oldId);
    find(tree, node => node.type === 'button').props.onClick();
    tree = render(oldId);
    find(tree, node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
    assert.equal(find(render(oldId), node => node.type === 'input' && node.props.type === 'checkbox').props.checked, true);
    assert.equal(find(render(newId), node => node.type === 'input' && node.props.type === 'checkbox').props.checked, false);
    assert.equal(find(render(newId), node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  }
});
