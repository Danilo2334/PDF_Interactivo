import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { load, validation, proof, submission, owner, projectId, documentId, idempotencyKey, content, receipt } from './reinforcement-test-helpers.mjs';

test('request validation rejects empty content, forged identity and inconsistent page/selection geometry', () => {
  const area = { kind: 'area', documentId, pageNumber: 1, rect: { x: .1, y: .1, width: .3, height: .4 } };
  for (const variant of [content, { ...content, source: 'manual', fragment: area }])
    assert.equal(validation.reinforcementRequestSchema.safeParse({ content: variant, idempotencyKey }).success, true);
  for (const changes of [{ text: ' ' }, { text: 'x'.repeat(20001) }, { need: 'corto' }, { pageNumber: 0 }, { pageNumber: 1.5 },
    { category: 'invalid' }, { ownerId: owner }, { fragment: { ...area, documentId: projectId } },
    { fragment: { ...area, pageNumber: 2 } }, { fragment: { ...area, rect: { ...area.rect, width: 1 } } }])
    assert.equal(validation.reinforcementContentSchema.safeParse({ ...content, ...changes }).success, false);
});

test('only matching confirmed text and difficulty produce a sendable draft', () => {
  const difficulty = { documentId, pageNumber: 1, fragment: null, category: content.category, observation: content.need };
  const text = { ...difficulty, text: content.text, status: 'ready', source: 'digital', confirmed: true };
  assert.ok(validation.contentFromDraft(difficulty, text).content);
  for (const pair of [[null, text], [difficulty, { ...text, confirmed: false }], [difficulty, { ...text, pageNumber: 2 }],
    [difficulty, { ...text, status: 'loading' }], [difficulty, { ...text, fragment: { kind: 'area' } }]]) {
    const result = validation.contentFromDraft(...pair); assert.equal(result.content, null); assert.ok(result.missing.length);
  }
});

test('double-click starts one request; interrupted reply reuses its key; success does not send again', async () => {
  const calls = [], states = []; let complete, fail = true;
  const controller = submission.createSubmissionController(state => states.push(state), {
    uuid: () => idempotencyKey, fetch: async (_url, request) => {
      calls.push(JSON.parse(request.body)); await new Promise(resolve => { complete = resolve; });
      if (fail) throw Error('Respuesta interrumpida'); return Response.json({ request: receipt });
    },
  });
  const first = controller.send(projectId, content);
  await controller.send(projectId, content); assert.equal(calls.length, 1);
  complete(); await first; assert.equal(states.at(-1).status, 'error'); fail = false;
  const retry = controller.send(projectId, content); complete(); await retry;
  assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey); assert.equal(states.at(-1).receipt.id, receipt.id);
  await controller.send(projectId, content); assert.equal(calls.length, 2);
});

test('changed content and an explicitly new request receive a new key; failed HTTP is never success', async () => {
  let count = 0; const keys = [], states = [];
  const controller = submission.createSubmissionController(state => states.push(state), {
    uuid: () => `key-${++count}`, fetch: async (_url, request) => {
      keys.push(JSON.parse(request.body).idempotencyKey); return Response.json({ message: 'La página no existe.' }, { status: 422 });
    },
  });
  await controller.send(projectId, content); await controller.send(projectId, { ...content, pageNumber: 2 });
  controller.reset(); await controller.send(projectId, { ...content, pageNumber: 2 });
  assert.equal(new Set(keys).size, 3); assert.equal(states.at(-1).status, 'error');
});

const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage();
const pdfFile = new Blob([await pdf.save()]);
process.env.REINFORCEMENT_REQUEST_SECRET = 'a'.repeat(64);
function fixture(options = {}) {
  const events = [], filters = [];
  const tables = { reinforcement_requests: options.existing ?? null, projects: options.project === undefined ? { document_id: documentId, status: 'pending' } : options.project,
    documents: { storage_path: `${owner}/${documentId}.pdf`, size_bytes: options.file?.size ?? pdfFile.size } };
  const client = {
    from(table) {
      events.push(table);
      return { select() { return this; }, eq(k, v) { filters.push([table, k, v]); return this; }, async maybeSingle() {
        return { data: tables[table], error: options.lookupError && table === 'reinforcement_requests' ? {} : null };
      } };
    },
    storage: { from: () => ({ download: async () => { events.push('download'); options.onDownload?.(); return { data: options.file ?? pdfFile, error: options.downloadError ?? null }; } }) },
    async rpc(name, args) { events.push(['rpc', name, args]); return { data: { request: receipt, created: true }, error: options.rpcError ?? null }; },
  };
  const route = load('app/api/projects/[projectId]/reinforcement-requests/route.ts', {
    'pdf-lib': { PDFDocument }, '@/lib/auth/access': { checkPermission: async () => options.access ?? { ok: true, userId: owner } },
    '@/lib/documents/mutation-request': load('lib/documents/mutation-request.ts'), '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/validations/reinforcement-request': validation, '@/lib/reinforcements/request-proof': proof,
    '@/lib/reinforcements/read-requests': { readRequests() { throw Error('GET not used by POST'); } },
  });
  const run = ({ data = { content, idempotencyKey }, origin = 'http://localhost:3000' } = {}) => route.POST(new Request(
    `http://localhost:3000/api/projects/${projectId}/reinforcement-requests`, { method: 'POST', headers: { Origin: origin }, body: JSON.stringify(data) }), { params: Promise.resolve({ projectId }) });
  return { run, events, filters };
}

test('API checks origin, fresh permissions and body before accessing private data', async () => {
  const f = fixture(); assert.equal((await f.run({ origin: 'https://foreign.example' })).status, 403); assert.equal(f.events.length, 0);
  for (const status of [401, 403, 503]) { const f = fixture({ access: { ok: false, status, message: 'Denied' } });
    assert.equal((await f.run()).status, status); assert.equal(f.events.length, 0); }
  const invalid = fixture(); assert.equal((await invalid.run({ data: { content: { ...content, ownerId: owner }, idempotencyKey } })).status, 400);
  assert.equal(invalid.events.length, 0);
});

test('valid API request verifies the actual PDF and signs session identity, page count and immutable version', async () => {
  const f = fixture(); const response = await f.run(); assert.equal(response.status, 201);
  assert.equal((await response.json()).request.id, receipt.id);
  const [, name, proofArgs] = f.events.at(-1); const signed = JSON.parse(proofArgs.p_payload);
  assert.equal(name, 'create_reinforcement_request'); assert.equal(signed.userId, owner);
  assert.equal(signed.pageCount, 2); assert.equal(signed.content.documentId, documentId);
  assert.equal(signed.inputHash, proof.requestHash(projectId, content)); assert.match(proofArgs.p_signature, /^[a-f0-9]{64}$/);
  assert.ok(f.filters.some(([t, k, v]) => t === 'projects' && k === 'owner_id' && v === owner));
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('retry returns the original receipt without downloading PDF or writing again; changed content conflicts', async () => {
  const existing = { id: receipt.id, status: 'pending', created_at: receipt.createdAt, input_hash: proof.requestHash(projectId, content) };
  const f = fixture({ existing }); assert.equal((await f.run()).status, 200); assert.deepEqual(f.events, ['reinforcement_requests']);
  assert.equal((await f.run({ data: { content: { ...content, text: 'Otro texto' }, idempotencyKey } })).status, 409);
});

test('foreign, stale, deleting, unreadable PDF and out-of-range page never invoke the transaction', async () => {
  for (const [options, status] of [[{ project: null }, 404], [{ project: { document_id: projectId } }, 409],
    [{ project: { document_id: documentId, status: 'deleting' } }, 409], [{ file: new Blob(['broken PDF']) }, 422],
    [{ downloadError: {} }, 503], [{ lookupError: true }, 503]]) {
    const f = fixture(options); assert.equal((await f.run()).status, status); assert.equal(f.events.some(e => Array.isArray(e)), false);
  }
  const f = fixture(); assert.equal((await f.run({ data: { content: { ...content, pageNumber: 3 }, idempotencyKey } })).status, 422);
  assert.equal(f.events.some(e => Array.isArray(e)), false);
});

test('late ownership/version rejection and ambiguous transaction failures are reported without false confirmation', async () => {
  for (const [code, status] of [['42501', 403], ['PT409', 409], ['40001', 409], ['23505', 409], ['08006', 503]]) {
    const f = fixture({ rpcError: { code } }); const response = await f.run(); assert.equal(response.status, status);
    assert.equal((await response.json()).request, undefined);
  }
});

test('a PDF version conflict discovered after download returns HTTP 409 and the submission controller preserves the draft', async () => {
  for (const code of ['PT409', '40001']) {
    const settings = { onDownload() { settings.rpcError = { code }; } }, f = fixture(settings);
    const response = await f.run(), body = await response.json();
    assert.equal(response.status, 409); assert.match(body.message, /Recarga el proyecto/); assert.equal(body.request, undefined);
    assert.ok(f.events.indexOf('download') < f.events.findIndex(event => Array.isArray(event) && event[0] === 'rpc'));
    assert.equal(f.events.filter(event => Array.isArray(event) && event[0] === 'rpc').length, 1);
    const states = [], sent = [];
    const controller = submission.createSubmissionController(state => states.push(state), {
      uuid: () => idempotencyKey,
      fetch: async (_url, request) => { sent.push(JSON.parse(request.body)); return Response.json(body, { status: 409 }); },
    });
    await controller.send(projectId, content);
    assert.equal(states.at(-1).status, 'error'); assert.match(states.at(-1).message, /Recarga el proyecto/);
    assert.equal(states.at(-1).receipt, undefined); assert.deepEqual(sent[0].content, content);
  }
});
