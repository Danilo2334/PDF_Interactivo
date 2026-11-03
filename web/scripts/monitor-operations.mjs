import {appendFile, mkdir, rename, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {checkOperations} from './check-operations.mjs';

const operations = ['login', 'private_page', 'private_pdf', 'foreign_mutation', 'liveness_revision'];
const codes = ['NETWORK_FAILURE', 'CONTRACT_MISMATCH', 'HTTP_MISMATCH'];
const scope = 'Serie finita de sondeos HTTP anónimos. Los porcentajes describen muestras, no disponibilidad temporal mensual ni SLO. No mide renderizado, dependencias autenticadas ni entrega de notificaciones.';

// Copy only the diagnostic contract: never persist arbitrary probe payloads or errors.
function safeSample(report, sequence) {
  if (report.origin !== 'https://pdf-interactivo-qa.vercel.app' ||
      !/^[a-f0-9]{40}$/.test(report.expectedRevision ?? '') ||
      !Number.isFinite(Date.parse(report.checkedAt)) || report.checks?.length !== operations.length)
    throw Error('Invalid probe report');
  const seen = new Set();
  const checks = report.checks.map(check => {
    if (!operations.includes(check.name) || seen.has(check.name) || typeof check.passed !== 'boolean' ||
        !(check.status === null || (Number.isInteger(check.status) && check.status >= 100 && check.status <= 599)) ||
        !Number.isFinite(check.elapsedMs) || check.elapsedMs < 0)
      throw Error('Invalid probe check');
    seen.add(check.name);
    const failure = report.alerts?.find(alert => alert.operation === check.name);
    if (!check.passed && !codes.includes(failure?.code)) throw Error('Missing failure diagnosis');
    return {name: check.name, passed: check.passed, status: check.status, elapsedMs: check.elapsedMs,
      reference: /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(check.reference ?? '') ? check.reference : null,
      code: check.passed ? null : failure.code};
  });
  return {event: 'qa_sample', sequence, checkedAt: report.checkedAt, expectedRevision: report.expectedRevision,
    passed: checks.every(check => check.passed), checks};
}

export function createOperationHistory({expectedRevision}) {
  if (!/^[a-f0-9]{40}$/.test(expectedRevision ?? '')) throw Error('A full expected revision is required');
  const samples = [], incidents = new Map(), events = [];
  return {
    record(report) {
      if (report.expectedRevision !== expectedRevision) throw Error('Probe revision changed within the series');
      const sample = safeSample(report, samples.length + 1), currentEvents = [];
      for (const check of sample.checks) {
        const open = incidents.get(check.name);
        if (!check.passed && !open) {
          const incident = {id: randomUUID(), operation: check.name, openedAt: sample.checkedAt,
            code: check.code, reference: check.reference};
          incidents.set(check.name, incident);
          currentEvents.push({event: 'contract_alert', ...incident, sequence: sample.sequence});
        } else if (check.passed && open) {
          incidents.delete(check.name);
          currentEvents.push({event: 'contract_recovered', ...open, recoveredAt: sample.checkedAt, sequence: sample.sequence});
        }
      }
      samples.push(sample); events.push(...currentEvents);
      return {sample, events: currentEvents};
    },
    summary({complete = false} = {}) {
      const checks = samples.flatMap(sample => sample.checks), durations = checks.map(check => check.elapsedMs).sort((a,b) => a-b);
      const failedChecks = checks.filter(check => !check.passed).length;
      const quantile = q => durations.length ? durations[Math.ceil(durations.length * q) - 1] : null;
      return {event: 'qa_monitor_summary', schemaVersion: 1, origin: 'https://pdf-interactivo-qa.vercel.app',
        expectedRevision, complete, passed: complete && samples.length > 0 && failedChecks === 0,
        lastSamplePassed: samples.at(-1)?.passed ?? null, startedAt: samples[0]?.checkedAt ?? null,
        lastCheckedAt: samples.at(-1)?.checkedAt ?? null, samples: samples.length,
        metrics: {checks: checks.length, failedChecks,
          respondedChecksPercent: checks.length ? checks.filter(check => check.status !== null).length / checks.length * 100 : null,
          failedChecksPercent: checks.length ? failedChecks / checks.length * 100 : null,
          healthySamplesPercent: samples.length ? samples.filter(sample => sample.passed).length / samples.length * 100 : null,
          p50HttpMs: quantile(.5), p95HttpMs: quantile(.95), maxHttpMs: durations.at(-1) ?? null},
        alertsOpened: events.filter(event => event.event === 'contract_alert').length,
        recoveries: events.filter(event => event.event === 'contract_recovered').length,
        openIncidents: [...incidents.values()], scope};
    }
  };
}

export function operationSummaryMarkdown(summary) {
  return ['# Sondeos del QA de PDF Interactivo', '',
    `Estado de la serie: ${summary.complete ? 'completa' : 'incompleta'}. Resultado acumulado: ${summary.passed ? 'correcto' : 'no aprobado'}.`,
    `Revisión esperada: \`${summary.expectedRevision}\`.`, '',
    '| Métrica observada | Valor |', '| --- | --- |',
    `| Sondeos / comprobaciones | ${summary.samples} / ${summary.metrics.checks} |`,
    `| Comprobaciones fallidas | ${summary.metrics.failedChecks} |`,
    `| Muestras completamente correctas | ${summary.metrics.healthySamplesPercent ?? 'sin datos'} % |`,
    `| p50 / p95 / máximo HTTP | ${summary.metrics.p50HttpMs ?? '-'} / ${summary.metrics.p95HttpMs ?? '-'} / ${summary.metrics.maxHttpMs ?? '-'} ms |`,
    `| Alertas / recuperaciones / incidentes abiertos | ${summary.alertsOpened} / ${summary.recoveries} / ${summary.openIncidents.length} |`,
    '', scope, '',
    'Diagnóstico: samples.jsonl conserva cada contrato, estado HTTP y referencia; events.jsonl correlaciona la apertura y recuperación por ID. Un fallo previo sigue invalidando la serie aunque el último sondeo sea correcto.',
    'Umbral de contrato: la primera comprobación incorrecta abre un incidente por operación; la primera comprobación correcta posterior lo recupera. No configura alertas de latencia o tasa de errores sin un umbral RNF acordado.', ''].join('\n');
}

export async function monitorOperations({expectedRevision, samples = 1, intervalMs = 60000, outputDirectory,
  probe = checkOperations, wait = delay, onEvent = () => {}}) {
  if (!Number.isInteger(samples) || samples < 1 || samples > 1440 ||
      !Number.isInteger(intervalMs) || intervalMs < 15000 || intervalMs > 3600000 || !outputDirectory)
    throw Error('Invalid bounded monitor configuration');
  const history = createOperationHistory({expectedRevision});
  const directory = resolve(outputDirectory);
  // Require a fresh directory so a second invocation cannot overwrite earlier evidence.
  await mkdir(directory, {mode: 0o700});
  await writeFile(join(directory, 'samples.jsonl'), '', {flag: 'wx'});
  await writeFile(join(directory, 'events.jsonl'), '', {flag: 'wx'});
  async function saveSummary(complete) {
    const summary = history.summary({complete});
    for (const [name, contents] of [['summary.json', JSON.stringify(summary, null, 2) + '\n'], ['summary.md', operationSummaryMarkdown(summary)]]) {
      const temporary = join(directory, name + '.tmp');
      await writeFile(temporary, contents, {mode: 0o600});
      await rename(temporary, join(directory, name));
    }
    return summary;
  }
  await saveSummary(false);
  for (let index = 0; index < samples; index++) {
    if (index) await wait(intervalMs); // No overlapping probes or automatic HTTP retries.
    const recorded = history.record(await probe({origin: 'https://pdf-interactivo-qa.vercel.app', expectedRevision}));
    await appendFile(join(directory, 'samples.jsonl'), JSON.stringify(recorded.sample) + '\n');
    for (const event of recorded.events) await appendFile(join(directory, 'events.jsonl'), JSON.stringify(event) + '\n');
    await saveSummary(false); // An interrupted run remains explicitly incomplete.
    for (const event of recorded.events) await onEvent(event);
  }
  return saveSummary(true);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw Error('Unsupported argument');
    const summary = await monitorOperations({expectedRevision: process.env.QA_EXPECTED_REVISION,
      outputDirectory: process.env.QA_MONITOR_DIR,
      samples: Number(process.env.QA_MONITOR_SAMPLES ?? '1'),
      intervalMs: Number(process.env.QA_MONITOR_INTERVAL_SECONDS ?? '60') * 1000,
      onEvent: event => console.log(JSON.stringify(event))});
    console.log(JSON.stringify(summary, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, operationSummaryMarkdown(summary));
    process.exitCode = summary.passed ? 0 : 1;
  } catch {
    console.error('No se pudo completar la supervisión. Conserva los registros parciales; una serie incompleta no acredita salud ni entrega de alertas.');
    process.exitCode = 2;
  }
}
