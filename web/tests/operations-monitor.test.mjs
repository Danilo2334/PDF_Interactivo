import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOperationHistory, monitorOperations, operationSummaryMarkdown} from '../scripts/monitor-operations.mjs';

const sha = 'a'.repeat(40), names = ['login', 'private_page', 'private_pdf', 'foreign_mutation', 'liveness_revision'];
const reference = '2f199784-0d8b-47ee-8e12-96834511726c';
function report({fail = [], network = false, at = '2026-11-02T07:00:00Z'} = {}) {
  return {origin: 'https://pdf-interactivo-qa.vercel.app', expectedRevision: sha, checkedAt: at,
    checks: names.map((name, i) => ({name, passed: !fail.includes(name), status: network ? null : [200,307,401,403,200][i],
      elapsedMs: i + 1, reference})), alerts: fail.map(operation => ({operation, code: network ? 'NETWORK_FAILURE' : 'CONTRACT_MISMATCH'}))};
}

test('HU046 history deduplicates repeated failures, correlates recovery, and retains earlier failures in the release result', () => {
  const history = createOperationHistory({expectedRevision: sha});
  const first = history.record(report({fail: ['login']}));
  assert.equal(first.events.length, 1); assert.equal(first.events[0].event, 'contract_alert');
  assert.equal(history.record(report({fail: ['login']})).events.length, 0);
  const recovered = history.record(report());
  assert.equal(recovered.events[0].event, 'contract_recovered');
  assert.equal(recovered.events[0].id, first.events[0].id);
  const summary = history.summary({complete: true});
  assert.equal(summary.passed, false); assert.equal(summary.lastSamplePassed, true);
  assert.equal(summary.metrics.failedChecks, 2); assert.equal(summary.openIncidents.length, 0);
  assert.equal(summary.alertsOpened, 1); assert.equal(summary.recoveries, 1);
  const reopened = history.record(report({fail: ['login']}));
  assert.notEqual(reopened.events[0].id, first.events[0].id);
});

test('HU046 measurements distinguish expected 401/403, contract failure and missing HTTP response', () => {
  const history = createOperationHistory({expectedRevision: sha});
  history.record(report());
  let summary = history.summary({complete: true});
  assert.equal(summary.passed, true); assert.equal(summary.metrics.respondedChecksPercent, 100);
  assert.equal(summary.metrics.failedChecksPercent, 0); assert.equal(summary.metrics.p95HttpMs, 5);
  history.record(report({fail: names, network: true}));
  summary = history.summary({complete: true});
  assert.equal(summary.metrics.respondedChecksPercent, 50); assert.equal(summary.metrics.failedChecksPercent, 50);
  assert.equal(summary.openIncidents.length, 5);
});

test('HU046 report persistence uses an allowlist and cannot promote empty/incomplete or malformed evidence', () => {
  const history = createOperationHistory({expectedRevision: sha});
  assert.equal(history.summary({complete: true}).passed, false);
  const untrusted = report(); untrusted.cookie = 'QA_SECRET'; untrusted.checks[0].message = 'QA_SECRET';
  untrusted.checks[0].reference = '<script>QA_SECRET</script>';
  const copied = history.record(untrusted);
  assert.doesNotMatch(JSON.stringify(copied), /QA_SECRET|script|cookie/);
  assert.equal(history.summary().passed, false);
  for (const modify of [r => r.origin = 'https://other.example', r => r.checks.pop(),
    r => r.checks[1].name = 'login', r => r.checks[0].elapsedMs = NaN, r => r.checkedAt = 'bad', r => r.expectedRevision = 'b'.repeat(40)]) {
    const bad = report(); modify(bad); assert.throws(() => history.record(bad));
  }
  assert.equal(history.summary().samples, 1);
  assert.throws(() => createOperationHistory({expectedRevision: 'secret'}));
});

test('HU046 bounded series persists individual samples, incident IDs and summary without overlapping probes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pdf-operations-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const directory = join(root, 'series'), calls = []; let count = 0;
  const summary = await monitorOperations({expectedRevision: sha, samples: 3, intervalMs: 15000,
    outputDirectory: directory, wait: async ms => {calls.push(['wait', ms]);},
    probe: async options => {assert.equal(options.expectedRevision, sha); calls.push(['probe']); return report({fail: count++ < 2 ? ['private_pdf'] : []});}});
  assert.deepEqual(calls.map(c => c[0]), ['probe','wait','probe','wait','probe']);
  const stored = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8'));
  assert.deepEqual(stored, summary); assert.equal(summary.complete, true); assert.equal(summary.passed, false);
  const events = (await readFile(join(directory, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(events.length, 2); assert.equal(events[0].id, events[1].id);
  assert.equal((await readFile(join(directory, 'samples.jsonl'), 'utf8')).trim().split('\n').length, 3);
  assert.match(await readFile(join(directory, 'summary.md'), 'utf8'), /no disponibilidad temporal mensual/);
  await assert.rejects(() => monitorOperations({expectedRevision: sha, outputDirectory: directory}));
});

test('HU046 interrupted collection keeps completed samples and an explicitly incomplete summary', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pdf-operations-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const directory = join(root, 'partial');
  await assert.rejects(() => monitorOperations({expectedRevision: sha, samples: 2, outputDirectory: directory,
    probe: async () => report(), wait: async () => {throw Error('QA_PRIVATE_INTERRUPTION');}}));
  const stored = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8'));
  assert.equal(stored.complete, false); assert.equal(stored.passed, false); assert.equal(stored.samples, 1);
  assert.doesNotMatch(await readFile(join(directory, 'summary.json'), 'utf8'), /QA_PRIVATE/);
});

test('HU046 refuses unbounded or excessive collector settings before any probe and explains diagnostic limits', async () => {
  for (const config of [{samples:0}, {samples:1441}, {samples:Infinity}, {intervalMs:1}, {intervalMs:3600001}, {outputDirectory:''}])
    await assert.rejects(() => monitorOperations({expectedRevision: sha, outputDirectory: 'unused-monitor-dir', ...config,
      probe: async () => {throw Error('Must not reach probe');}}));
  const summary = createOperationHistory({expectedRevision: sha}).summary();
  assert.match(operationSummaryMarkdown(summary), /incompleta/);
  assert.match(operationSummaryMarkdown(summary), /No configura alertas de latencia/);
});
