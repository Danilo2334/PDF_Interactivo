import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, requestState, validation, owner, other, projectId, documentId, content, receipt } from './reinforcement-test-helpers.mjs';

const schemas = load('lib/validations/request-list.ts', { '@/lib/reinforcements/state': requestState, '@/lib/validations/reinforcement-request': validation });
const { createRequestResource } = load('lib/reinforcements/request-resource.ts');
const summary = { id: receipt.id, project_id: projectId, document_id: documentId, owner_id: owner, page_number: 1,
  status: 'pending', stage: 'queued', created_at: receipt.createdAt, updated_at: receipt.createdAt, error_message: null };
const record = { ...summary, selection: null, selected_text: content.text, text_source: 'digital', category: content.category, need: content.need };
const event = { id: other, request_id: receipt.id, previous_status: null, status: 'pending', previous_stage: null, stage: 'queued',
  actor_kind: 'owner', actor_id: owner, event_kind: 'created', occurred_at: receipt.createdAt };
function fixture(options = {}) {
  const calls = [];
  const client = { from(table) {
    const call = { table, filters: [], orders: [] }; calls.push(call);
    return {
      select(columns, options) { call.columns = columns; call.count = options?.count; return this; },
      eq(k, v) { call.filters.push([k, v]); return this; },
      order(k, options) { call.orders.push([k, options]); return this; },
      async maybeSingle() { return table === 'projects'
        ? { data: options.project === undefined ? { document_id: documentId, status: 'pending' } : options.project, error: options.projectError }
        : { data: options.record === undefined ? record : options.record, error: options.rowError }; },
      async range(start, end) { call.range = [start, end]; return table === 'reinforcement_request_events'
        ? { data: [event], count: 1, error: options.historyError }
        : { data: options.items ?? [summary], count: options.total ?? 1, error: options.listError }; },
    };
  } };
  const reader = load('lib/reinforcements/read-requests.ts', {
    '@/lib/auth/access': { checkPermission: async () => options.access ?? { ok: true, userId: owner } },
    '@/lib/supabase/server': { createClient: async () => client }, '@/lib/validations/request-list': schemas,
  });
  const run = (query = '', requestId) => reader.readRequests(new Request(`http://localhost/api?documentId=${documentId}${query}`), projectId, requestId);
  return { run, calls, reader };
}

test('request reads reject anonymous/inactive accounts, foreign projects, obsolete versions and invalid filters', async () => {
  for (const status of [401, 403, 503]) {
    const f = fixture({ access: { ok: false, status, message: 'Acceso rechazado' } });
    const r = await f.run(); assert.equal(r.status, status); assert.equal(f.calls.length, 0);
    assert.equal(r.headers.get('Cache-Control'), 'private, no-store');
  }
  for (const query of ['&status=made-up', '&page=0', '&page=1.5', '&page=-1', '&page=10000']) {
    const f = fixture(); assert.equal((await f.run(query)).status, 400); assert.equal(f.calls.length, 0);
  }
  for (const [options, status] of [[{ project: null }, 404], [{ projectError: {} }, 503],
    [{ project: { document_id: other } }, 409], [{ project: { document_id: documentId, status: 'deleting' } }, 409]]) {
    const f = fixture(options); assert.equal((await f.run()).status, status); assert.equal(f.calls.length, 1);
  }
});

test('each state filter and reset retain ownership/document scope with stable bounded pagination', async () => {
  for (const status of ['all', ...requestState.REQUEST_STATUSES]) {
    const f = fixture(), response = await f.run(`&status=${status}&page=2`);
    assert.equal(response.status, 200); const result = await response.json();
    assert.equal(result.page, 2); assert.equal(result.pageSize, 20);
    const request = f.calls[1]; assert.deepEqual(request.range, [20, 39]);
    assert.deepEqual(request.filters.slice(0, 3), [['owner_id', owner], ['project_id', projectId], ['document_id', documentId]]);
    assert.deepEqual(request.filters.slice(3), status === 'all' ? [] : [['status', status]]);
    assert.equal(request.columns.includes('selected_text'), false);
    assert.deepEqual(request.orders.map(([key]) => key), ['created_at', 'id']);
  }
  const empty = await fixture({ items: [], total: 0 }).run(); assert.equal((await empty.json()).items.length, 0);
});

test('detail includes saved content and paginated audit events only for the same request/project/document', async () => {
  const f = fixture(), response = await f.run('&page=3', receipt.id), data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.request.selected_text, content.text); assert.equal(data.events[0].actor_id, owner);
  assert.deepEqual(f.calls[1].filters, [['id', receipt.id], ['owner_id', owner], ['project_id', projectId], ['document_id', documentId]]);
  assert.deepEqual(f.calls[2].filters, [['request_id', receipt.id]]); assert.deepEqual(f.calls[2].range, [40, 59]);
  assert.equal((await fixture({ record: null }).run('', receipt.id)).status, 404);
  assert.equal((await fixture({ historyError: {} }).run('', receipt.id)).status, 503);
  assert.equal((await fixture({ record: { ...record, selection: { documentId: other, pageNumber: 1, kind: 'area', rect: { x: 0, y: 0, width: 1, height: 1 } } } }).run('', receipt.id)).status, 503);
  assert.equal((await fixture({ listError: {} }).run()).status, 503);
});

test('a late response cannot overwrite the newest refresh or repopulate a disposed document view', async () => {
  const published = [], pending = [];
  const resource = createRequestResource('/requests', x => x, x => published.push(x), (_url, options) => new Promise(resolve => pending.push({ resolve, signal: options.signal })));
  const first = resource.load(), second = resource.load(); assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(Response.json({ version: 2 })); await second;
  pending[0].resolve(Response.json({ version: 1 })); await first;
  assert.equal(published.length, 1); assert.equal(published[0].value.version, 2);
  const last = resource.load(); resource.dispose(); pending[2].resolve(Response.json({ version: 3 })); await last;
  assert.equal(published.length, 1); assert.equal(pending[2].signal.aborted, true);
});

test('resource exposes access errors and recovers on retry without retaining inaccessible data', async () => {
  const states = []; let allowed = false;
  const resource = createRequestResource('/requests', schemas.requestListSchema.parse, x => states.push(x), async () => allowed
    ? Response.json({ items: [], total: 0, page: 1, pageSize: 20 }) : Response.json({ message: 'Sesión requerida' }, { status: 401 }));
  await resource.load(); assert.match(states.at(-1).error, /Sesión/); assert.equal(states.at(-1).value, undefined);
  allowed = true; await resource.load(); assert.equal(states.at(-1).value.total, 0); resource.dispose();
});

test('retry receipts accept a persisted final status without restarting a request', () => {
  for (const status of requestState.REQUEST_STATUSES) assert.equal(validation.reinforcementReceiptSchema.safeParse({ ...receipt, status }).success, true);
});

test('state presentation uses the persisted stage, indeterminate progress and a usable error message', () => {
  const { RequestState } = load('components/documents/request-list-panel.tsx', {
    react: React, '@/lib/reinforcements/state': requestState, '@/lib/reinforcements/request-resource': { createRequestResource },
    '@/lib/validations/request-list': schemas,
  });
  for (const [status, stage] of [['pending','queued'], ['processing','analyzing'], ['error','failed'], ['generated','review'], ['approved','approved']]) {
    const markup = renderToStaticMarkup(React.createElement(RequestState, { request: { ...summary, status, stage, error_message: status === 'error' ? 'Inténtalo nuevamente.' : null } }));
    assert.ok(markup.includes(requestState.REQUEST_STATUS_LABELS[status]));
    assert.ok(markup.includes(requestState.REQUEST_STAGE_LABELS[stage]));
    assert.equal(markup.includes('role="status"'), status === 'processing');
    assert.equal(markup.includes('Inténtalo nuevamente.'), status === 'error');
    assert.equal(markup.includes('%'), false);
  }
});
