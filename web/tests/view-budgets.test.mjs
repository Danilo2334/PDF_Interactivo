import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateViewBudgets, saveViewBudgetReport} from '../scripts/check-view-budgets.mjs';

const context = {production: true, visible: true, authenticated: true, usable: true,
  includesServerQueries: true, includesAiGeneration: false, trigger: 'reload'};
const sample = (metric, elapsedMs, extra = {}) => ({metric, elapsedMs, context: {...context, ...extra}});
const simulated = measurements => ({schemaVersion: 1, kind: 'simulation', measurements});

test('RNF boundaries use their Jira sources and preserve a previous failure after recovery', () => {
  const report = evaluateViewBudgets(simulated([
    sample('documents_ready', 3000), sample('documents_ready', 3000.01), sample('documents_ready', 4000), sample('documents_ready', 2999),
    sample('pdf_first_page_2_02mb', 5000, {referencePdf: '2.02MB-15pages'}),
    sample('pdf_first_page_19mb', 10000, {referencePdf: '19MB-19pages'}),
    sample('reinforcements_ready', 3000, {trigger: 'open-panel', pdfAlreadyOpen: true}),
  ]));
  assert.equal(report.passed, false); assert.equal(report.metrics.failed, 2);
  assert.deepEqual(report.events.map(e => e.event), ['view_budget_exceeded', 'view_budget_recovered']);
  assert.equal(report.events[0].id, report.events[1].id);
  assert.equal(report.events[0].sampleReference, report.samples[1].reference);
  assert.equal(report.events[1].sampleReference, report.samples[3].reference);
  assert.match(report.samples[0].source, /SCRUM-146.*10078/);
  assert.match(report.samples.at(-1).source, /SCRUM-108/);
  assert.equal(report.openIncidents.length, 0); assert.equal(report.kind, 'simulation');
});

test('UI readiness, foreground, authenticated production and measurement scope are mandatory', () => {
  for (const change of [{usable: false}, {visible: false}, {authenticated: false}, {production: false},
    {includesServerQueries: false}, {includesAiGeneration: true}, {trigger: 'http-response'}]) {
    assert.throws(() => evaluateViewBudgets(simulated([sample('documents_ready', 1, change)])));
  }
  assert.throws(() => evaluateViewBudgets(simulated([sample('reinforcements_ready', 1, {trigger: 'open-panel'})])));
  assert.throws(() => evaluateViewBudgets(simulated([sample('pdf_first_page_19mb', 1, {referencePdf: 'arbitrary-small-pdf'})])));
  for (const metric of ['api_latency', '__proto__', 'constructor', ['documents_ready']]) assert.throws(() => evaluateViewBudgets(simulated([sample(metric, 1)])));
  for (const duration of [-1, NaN, Infinity, '10']) assert.throws(() => evaluateViewBudgets(simulated([sample('documents_ready', duration)])));
  assert.throws(() => evaluateViewBudgets(simulated([])));
});

test('real evidence requires the revision and a valid observed timestamp; archived measurements stay historical', () => {
  const real = {schemaVersion: 1, kind: 'real', revision: 'a'.repeat(40), measurements: [sample('documents_ready', 804)]};
  assert.throws(() => evaluateViewBudgets(real));
  real.measurements[0].observedAt = '2026-02-30T00:00:00.000Z'; assert.throws(() => evaluateViewBudgets(real));
  real.measurements[0].observedAt = '2026-11-02T12:00:00.000Z';
  assert.equal(evaluateViewBudgets(real).samples[0].observedAt, real.measurements[0].observedAt);
  assert.throws(() => evaluateViewBudgets({...real, revision: null}));
  assert.throws(() => evaluateViewBudgets({...real, revision: [real.revision]}));
  const archived = {...real, kind: 'historical', historicalSource: 'SCRUM-146:10078', revision: null};
  assert.equal(evaluateViewBudgets(archived).samples[0].observedAt, null);
  assert.equal(evaluateViewBudgets(archived).kind, 'historical');
  assert.throws(() => evaluateViewBudgets({...archived, historicalSource: 'invented'}));
});

test('only diagnostic fields survive; arbitrary messages, URL tokens and source paths are never copied', () => {
  const input = simulated([sample('documents_ready', 5000)]);
  input.token = 'QA_PRIVATE_TOKEN'; input.measurements[0].url = 'https://example.com/QA_PRIVATE_TOKEN';
  input.measurements[0].context.cookie = 'QA_PRIVATE_TOKEN'; input.measurements[0].message = 'QA_PRIVATE_TOKEN';
  input.measurements[0].id = 'QA_PRIVATE_TOKEN';
  const result = evaluateViewBudgets(input);
  assert.doesNotMatch(JSON.stringify(result), /QA_PRIVATE|example.com|cookie/);
  assert.equal(result.events[0].source, result.samples[0].source);
  assert.match(result.events[0].id, /^[a-f0-9-]{36}$/);
});

test('a complete report links alerts to saved samples and refuses overwriting previous evidence', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pdf-view-rnf-'));
  t.after(() => {
    const target = resolve(root);
    assert.equal(dirname(target), resolve(tmpdir()));
    assert.match(basename(target), /^pdf-view-rnf-/);
    return rm(target, {recursive: true, force: true});
  });
  const out = join(root, 'report');
  const input = simulated([sample('documents_ready', 3100), sample('documents_ready', 900)]);
  const summary = await saveViewBudgetReport(input, out);
  assert.equal(summary.complete, true); assert.equal(summary.passed, false);
  const stored = JSON.parse(await readFile(join(out, 'summary.json'), 'utf8'));
  assert.deepEqual(stored, JSON.parse(JSON.stringify(summary)));
  const samples = (await readFile(join(out, 'samples.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  const events = (await readFile(join(out, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(events[0].sampleReference, samples[0].reference); assert.equal(events[1].sampleReference, samples[1].reference);
  await assert.rejects(() => saveViewBudgetReport(input, out));
});

test('CLI rejects invalid input with a bounded message that does not echo secrets or private paths', () => {
  const script = fileURLToPath(new URL('../scripts/check-view-budgets.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, 'QA_PRIVATE_TOKEN'], {encoding: 'utf8'});
  assert.equal(result.status, 2); assert.doesNotMatch(result.stdout + result.stderr, /QA_PRIVATE|Error:|stack/);
});
