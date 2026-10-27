import assert from 'node:assert/strict';
import test from 'node:test';
import { load, owner, projectId, documentId, receipt, schemas, requestSchemas, contextModule, context, diagnosis, record, analysis, provider } from './analysis-test-helpers.mjs';

function fixture(options = {}) {
  const calls = [], rpc = []; let providerCalls = 0, downloads = 0, versionReads = 0;
  const client = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    return { select() { return this; }, eq(k,v) { call.filters.push([k,v]); return this; }, async maybeSingle() {
      if (table === 'projects') { versionReads++; return { data: options.project === undefined
        ? { document_id: options.replaced && versionReads > 1 ? receipt.id : documentId, status: 'pending' } : options.project }; }
      if (table === 'reinforcement_requests') return { data: options.record === undefined ? record : options.record };
      if (table === 'documents') return { data: { storage_path: `${owner}/${documentId}.pdf`, size_bytes: 100 } };
      return { data: options.analysis ?? null };
    } };
  }, storage: { from() { return { async download() { downloads++; return options.downloadError ? { error: {} } : { data: new Blob([new Uint8Array(100)]) }; } }; } },
  async rpc(_name,args) {
    const input = JSON.parse(args.p_payload); rpc.push(input);
    if (options.rpcError) return { error: { code: options.rpcError } };
    return input.action === 'start' ? { data: { disposition: options.disposition ?? 'started', analysis: { ...analysis, attempt_id: input.attemptId } } }
      : { data: { disposition: 'saved', analysis: { ...analysis, status: input.status, attempt_id: input.attemptId,
        context: input.context, diagnosis: input.diagnosis, model: input.model, error_code: input.errorCode, finished_at: new Date().toISOString() } } };
  } };
  const service = load('lib/reinforcements/run-analysis.ts', {
    '@/lib/auth/access': { checkPermission: async () => options.access ?? { ok: true, userId: owner } },
    '@/lib/supabase/server': { createClient: async () => client }, '@/lib/documents/mutation-request': load('lib/documents/mutation-request.ts'),
    '@/lib/validations/request-list': requestSchemas, '@/lib/validations/contextual-analysis': schemas,
    '@/lib/reinforcements/analysis-context': contextModule,
    '@/lib/pdf/read-analysis-page': { readAnalysisPage: async () => ({ pageText: options.pageText ?? context.nearbyText, areaText: '', pdfSha256: context.pdfSha256 }) },
    '@/lib/reinforcements/analysis-proof': { signAnalysisProof: input => ({ p_payload: JSON.stringify(input), p_signature: 'unit-test' }) },
    '@/lib/reinforcements/analysis-provider': { ...provider, getAnalysisConfiguration: () => options.configured === false ? null : { key: 'unit-test', model: 'test-model' },
      analyzeContext: async () => { providerCalls++; if (options.failure) throw new provider.AnalysisFailure(options.failure,options.quota);
        return { diagnosis: options.diagnosis ?? diagnosis, model: 'test-model' }; } },
  });
  const url = `http://localhost:3000/api/projects/${projectId}/reinforcement-requests/${receipt.id}/analysis`;
  const post = (action = 'analyze', origin = 'http://localhost:3000', extra = {}) => service.postAnalysis(new Request(url,
    { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId, action, ...extra }) }), projectId, receipt.id);
  const get = () => service.getAnalysis(new Request(`${url}?documentId=${documentId}`), projectId, receipt.id);
  return { post, get, calls, rpc, stats: () => ({ providerCalls, downloads }) };
}

test('Gemini free quota exhaustion is persisted safely and returned with a clear bounded retry message',async()=>{
  const f=fixture({failure:'provider_unavailable',quota:true});const response=await f.post();const body=await response.json();
  assert.equal(response.status,429);assert.match(body.message,/cuota gratuita/);assert.match(body.message,/no se usará un proveedor de pago/);
  assert.equal(body.analysis.status,'error');assert.equal(body.analysis.error_code,'provider_unavailable');assert.equal(f.stats().providerCalls,1);
});

test('analysis API blocks foreign origins, unauthorized users, foreign projects and replaced PDFs before provider work', async () => {
  const origin = fixture(); assert.equal((await origin.post('analyze', 'https://evil.example')).status, 403); assert.equal(origin.calls.length, 0);
  for (const [options, expected] of [[{ access: { ok: false, status: 401, message: 'Sesión requerida' } },401],
    [{ access: { ok: false, status: 403, message: 'Cuenta inactiva' } },403], [{ project: null },404],
    [{ project: { document_id: receipt.id, status: 'pending' } },409], [{ record: null },404]]) {
    const f = fixture(options); assert.equal((await f.post()).status, expected); assert.equal(f.rpc.length, 0); assert.equal(f.stats().providerCalls, 0);
  }
  const f = fixture(); assert.equal((await f.post('analyze', 'http://localhost:3000', { context: 'forged', status: 'approved' })).status, 400);
  assert.equal((await f.post('analyze', 'http://localhost:3000', { padding: 'a'.repeat(2000) })).status, 413);
});

test('unconfigured provider performs no claim or paid call; context preview is still available and private', async () => {
  const f = fixture({ configured: false }); assert.equal((await f.post()).status, 503); assert.equal(f.rpc.length, 0);
  const response = await f.post('prepare'), data = await response.json(); assert.equal(response.status, 200);
  assert.equal(data.context.selectedText, record.selected_text); assert.equal(data.context.pageNumber, 1);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store'); assert.equal(f.stats().providerCalls, 0);
  assert.ok(f.calls.filter(c => ['projects','documents','reinforcement_requests'].includes(c.table)).every(c => c.filters.some(([k,v]) => k === 'owner_id' && v === owner)));
  const view = await (await f.get()).json(); assert.equal(view.available, false); assert.equal(view.retryable, true);
});

test('duplicate cached/busy analysis does not redownload or call the provider again', async () => {
  for (const disposition of ['cached','busy']) {
    const f = fixture({ disposition }); assert.equal((await f.post()).status, disposition === 'busy' ? 202 : 200);
    assert.equal(f.rpc.length, 1); assert.deepEqual(f.stats(), { providerCalls: 0, downloads: 0 });
  }
});

test('successful analysis persists its grounded diagnosis with the same server attempt; failures persist safe errors', async () => {
  const f = fixture(), result = await (await f.post()).json(); assert.equal(result.analysis.status, 'ready');
  assert.equal(f.rpc.length, 2); assert.equal(f.rpc[1].attemptId, f.rpc[0].attemptId); assert.equal(f.rpc[1].requestId, receipt.id);
  assert.equal(f.rpc[1].context.pdfSha256, context.pdfSha256); assert.equal(f.rpc[1].diagnosis.topic, diagnosis.topic);
  assert.equal(f.rpc[1].status, 'ready'); assert.equal(f.stats().providerCalls, 1);
  for (const failure of ['timeout','provider_refused','invalid_diagnosis','provider_unavailable']) {
    const e = fixture({ failure }); const response = await e.post(), data = await response.json();
    assert.equal(data.analysis.status, 'error'); assert.equal(data.analysis.diagnosis, null); assert.equal(data.analysis.error_code, failure);
  }
  for (const options of [{ replaced: true }, { downloadError: true }]) {
    const e = fixture(options); const data = await (await e.post()).json(); assert.equal(data.analysis.error_code, 'pdf_unavailable'); assert.equal(e.stats().providerCalls, 0);
  }
});

test('insufficient local text avoids the provider; semantic insufficiency also never becomes generated or approved', async () => {
  const f = fixture({ pageText: '', record: { ...record, selected_text: 'x', text_source: 'manual' } });
  const result = await (await f.post()).json(); assert.equal(result.analysis.status, 'insufficient'); assert.equal(f.stats().providerCalls, 0);
  const e = fixture({ diagnosis: { sufficient: false, topic: '', scope: '', concepts: [], quotes: [], reason: 'No se identifica qué variable se necesita comprender.' } });
  assert.equal((await (await e.post()).json()).analysis.status, 'insufficient'); assert.equal(e.rpc.at(-1).status, 'insufficient');
});

test('current access/version failures during persistence and account rate limits cannot masquerade as success', async () => {
  for (const [code,status] of [['42501',403],['40001',409],['23514',409],['P0001',429],['PGRST202',503]]) {
    const f = fixture({ rpcError: code }); assert.equal((await f.post()).status, status); assert.equal(f.stats().providerCalls, 0);
  }
  const active = fixture({ analysis, record: { ...record, status: 'processing', stage: 'analyzing' } });
  assert.equal((await (await active.get()).json()).retryable, false);
  const expired = fixture({ analysis: { ...analysis, lease_expires_at: '2000-01-01T00:00:00.000Z' }, record: { ...record, status: 'processing', stage: 'analyzing' } });
  assert.equal((await (await expired.get()).json()).retryable, true);
});
