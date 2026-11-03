import {randomUUID} from 'node:crypto';
import {mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const source146 = 'https://danilocarlosama96.atlassian.net/browse/SCRUM-146?focusedCommentId=10078';
const source108 = 'https://danilocarlosama96.atlassian.net/browse/SCRUM-108';
const budgets = Object.freeze({
  documents_ready: {limitMs: 3000, source: source146, trigger: 'reload'},
  pdf_first_page_2_02mb: {limitMs: 5000, source: source146, trigger: 'reload', referencePdf: '2.02MB-15pages'},
  pdf_first_page_19mb: {limitMs: 10000, source: source146, trigger: 'reload', referencePdf: '19MB-19pages'},
  reinforcements_ready: {limitMs: 3000, source: source108, trigger: 'open-panel'},
});
const scope = 'Evalúa mediciones de interfaz ya recogidas. No mide HTTP, no abre un navegador ni acredita vigilancia continua, entrega de avisos o compatibilidad. Los perfiles PDF son los escenarios RNF de referencia, no límites extrapolados a otros documentos.';

function canonicalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw Error('Invalid observation date');
  return value;
}

export function evaluateViewBudgets(input) {
  if (input?.schemaVersion !== 1 || !['real', 'historical', 'simulation'].includes(input.kind) ||
      !Array.isArray(input.measurements) || input.measurements.length < 1 || input.measurements.length > 1000)
    throw Error('Invalid view measurement report');
  const revision = /^[a-f0-9]{40}$/.test(input.revision ?? '') ? input.revision : null;
  if (input.kind === 'real' && !revision) throw Error('Real measurements require a source revision');
  if (input.kind === 'historical' && input.historicalSource !== 'SCRUM-146:10078')
    throw Error('Historical measurements require a known evidence source');

  // Validate every row before producing a result. A loader, background tab,
  // private preview or invented PDF category cannot become an approved sample.
  const observations = input.measurements.map(row => {
    if (!Object.hasOwn(budgets, row?.metric)) throw Error('Unknown RNF profile');
    const budget = budgets[row.metric], context = row.context;
    if (!Number.isFinite(row.elapsedMs) || row.elapsedMs < 0 || context?.production !== true ||
        context.visible !== true || context.authenticated !== true || context.usable !== true ||
        context.includesServerQueries !== true || context.includesAiGeneration !== false || context.trigger !== budget.trigger)
      throw Error('Incomplete or inapplicable UI measurement');
    if (budget.referencePdf && context.referencePdf !== budget.referencePdf) throw Error('PDF scenario does not match the RNF source');
    if (row.metric === 'reinforcements_ready' && context.pdfAlreadyOpen !== true) throw Error('PDF must already be open');
    if (input.kind === 'historical' && budget.source !== source146) throw Error('Historical source does not cover this profile');
    return {metric: row.metric, elapsedMs: row.elapsedMs,
      observedAt: input.kind === 'real' ? canonicalDate(row.observedAt) : null,
      limitMs: budget.limitMs, source: budget.source};
  });

  const samples = [], events = [], incidents = new Map();
  for (const [index, observation] of observations.entries()) {
    const sample = {event: 'view_sample', reference: randomUUID(), sequence: index + 1,
      ...observation, passed: observation.elapsedMs <= observation.limitMs};
    samples.push(sample);
    const existing = incidents.get(sample.metric);
    if (!sample.passed && !existing) {
      const incident = {id: randomUUID(), metric: sample.metric, source: sample.source,
        openedBy: sample.reference, sequence: sample.sequence};
      incidents.set(sample.metric, incident);
      events.push({event: 'view_budget_exceeded', ...incident, sampleReference: sample.reference,
        elapsedMs: sample.elapsedMs, limitMs: sample.limitMs});
    } else if (sample.passed && existing) {
      incidents.delete(sample.metric);
      events.push({event: 'view_budget_recovered', ...existing, sampleReference: sample.reference,
        recoveredAtSequence: sample.sequence, elapsedMs: sample.elapsedMs, limitMs: sample.limitMs});
    }
  }
  return {schemaVersion: 1, event: 'view_budget_report', kind: input.kind, revision,
    historicalSource: input.kind === 'historical' ? 'SCRUM-146:10078' : null,
    complete: true, passed: samples.every(sample => sample.passed),
    metrics: {samples: samples.length, failed: samples.filter(sample => !sample.passed).length,
      maxMs: Math.max(...samples.map(sample => sample.elapsedMs))},
    openIncidents: [...incidents.values()], samples, events, scope};
}

export async function saveViewBudgetReport(input, outputDirectory) {
  const report = evaluateViewBudgets(input);
  if (typeof outputDirectory !== 'string' || !outputDirectory) throw Error('A new output directory is required');
  const directory = resolve(outputDirectory);
  await mkdir(directory, {mode: 0o700}); // Existing evidence is never replaced.
  const summary = {...report, samples: undefined, events: undefined};
  await writeFile(join(directory, 'summary.json'), JSON.stringify({...summary, complete: false, passed: false}, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  await writeFile(join(directory, 'samples.jsonl'), report.samples.map(sample => JSON.stringify(sample)).join('\n') + '\n', {flag: 'wx', mode: 0o600});
  await writeFile(join(directory, 'events.jsonl'), report.events.map(event => JSON.stringify(event)).join('\n') + (report.events.length ? '\n' : ''), {flag: 'wx', mode: 0o600});
  await writeFile(join(directory, 'summary.json.tmp'), JSON.stringify(summary, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  await rename(join(directory, 'summary.json.tmp'), join(directory, 'summary.json'));
  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2 || !process.env.QA_VIEW_INPUT || !process.env.QA_VIEW_OUTPUT) throw Error('Invalid invocation');
    if ((await stat(process.env.QA_VIEW_INPUT)).size > 1024 * 1024) throw Error('Input is too large');
    const input = JSON.parse(await readFile(process.env.QA_VIEW_INPUT, 'utf8'));
    const result = await saveViewBudgetReport(input, process.env.QA_VIEW_OUTPUT);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
  } catch {
    console.error('No se pudo evaluar o conservar la medición de interfaz. Conserva los registros parciales; no representan un resultado aprobado.');
    process.exitCode = 2;
  }
}
