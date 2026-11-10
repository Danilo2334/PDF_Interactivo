// Server/CLI only. Never import this module from application client code.
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const operations = ['login', 'private_page', 'private_pdf', 'foreign_mutation', 'liveness_revision'];
const codes = ['NETWORK_FAILURE', 'CONTRACT_MISMATCH', 'HTTP_MISMATCH'];

export function operationEmail(event, expectedRevision, {drill = false} = {}) {
  if (!['contract_alert', 'contract_recovered'].includes(event.event) || !uuid.test(event.id ?? '') ||
      !operations.includes(event.operation) || !codes.includes(event.code) ||
      !/^[a-f0-9]{40}$/.test(expectedRevision ?? '') ||
      !Number.isFinite(Date.parse(event.openedAt)) ||
      (event.event === 'contract_recovered' && !Number.isFinite(Date.parse(event.recoveredAt))))
    throw Error('Invalid notification event');
  const recovered = event.event === 'contract_recovered';
  return {
    subject: `${drill ? '[PRUEBA CONTROLADA] ' : ''}PDF Interactivo QA: ${recovered ? 'contrato recuperado' : 'contrato incumplido'} (${event.operation})`,
    text: [
      drill ? 'Ensayo del canal de alertas. No constituye una caída real del servicio.' : 'Aviso del monitor de contratos HTTP.',
      'Destino supervisado: https://pdf-interactivo-qa.vercel.app',
      `Incidente: ${event.id}`, `Operación: ${event.operation}`, `Código: ${event.code}`,
      `Inicio: ${new Date(event.openedAt).toISOString()}`,
      ...(recovered ? [`Recuperación: ${new Date(event.recoveredAt).toISOString()}`] : []),
      `Revisión esperada: ${expectedRevision}`,
      `Referencia: ${uuid.test(event.reference ?? '') ? event.reference : 'no disponible'}`,
      'Diagnóstico: correlacionar este ID con events.jsonl y samples.jsonl de la serie.',
      'Verificar /api/health y los registros antes de liberar o revertir. Este aviso no mide el renderizado ni acredita todas las dependencias.',
    ].join('\n'),
    key: `pdf-qa/${drill ? 'drill' : 'live'}/${event.event}/${event.id}`,
  };
}

export function createOperationNotifier({apiKey, recipient, expectedRevision, drill = false, transport = fetch}) {
  // The existing resend.dev sender is restricted to the account owner. General mail
  // requires a verified domain and a separately reviewed configuration.
  if (recipient !== 'danilocarlosama96@gmail.com' || !/^re_[A-Za-z0-9_-]+$/.test(apiKey ?? '') ||
      !/^[a-f0-9]{40}$/.test(expectedRevision ?? '')) throw Error('Invalid private alert configuration');
  const receipts = new Map();
  let requests = 0;
  return async event => {
    const email = operationEmail(event, expectedRevision, {drill});
    if (receipts.has(email.key)) return {...receipts.get(email.key), duplicate: true};
    const base = {event: 'notification_result', incidentId: event.id, transition: event.event,
      checkedAt: new Date().toISOString(), drill, accepted: false};
    // A bounded process must not exhaust the free daily quota in a failure loop.
    if (requests >= 10) return {...base, code: 'SERIES_SEND_LIMIT'};
    requests++;
    let receipt;
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': email.key},
        body: JSON.stringify({from: 'PDF Interactivo QA <onboarding@resend.dev>', to: [recipient],
          subject: email.subject, text: email.text}),
      });
      if (!response.ok) receipt = {...base, code: response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_REJECTED', status: response.status};
      else {
        const body = await response.json();
        receipt = uuid.test(body?.id ?? '') ? {...base, accepted: true, providerId: body.id, code: 'ACCEPTED'} :
          {...base, code: 'INVALID_PROVIDER_RESPONSE'};
      }
    } catch { receipt = {...base, code: 'PROVIDER_UNAVAILABLE'}; }
    // No automatic resend, including timeouts where acceptance is unknown. The
    // provider key also deduplicates an explicit same-event replay for 24 hours.
    receipts.set(email.key, receipt);
    return receipt; // Accepted by provider does not mean delivered to the mailbox.
  };
}
