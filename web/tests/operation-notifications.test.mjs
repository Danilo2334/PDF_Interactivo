import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createOperationNotifier, operationEmail} from '../scripts/operation-notifications.mjs';
import {monitorOperations} from '../scripts/monitor-operations.mjs';

const sha = 'a'.repeat(40), id = 'bd571c55-754d-490f-9c1a-75177d1cbf2e';
const event = {event: 'contract_alert', id, operation: 'liveness_revision', code: 'CONTRACT_MISMATCH', openedAt: '2026-11-09T20:00:00Z'};
const config = {apiKey: 're_QA_TEST_ONLY', recipient: 'danilocarlosama96@gmail.com', expectedRevision: sha};

test('alert mail uses only diagnostic allowlist, flags drills, and rejects untrusted destinations/events', () => {
  const email = operationEmail({...event, message: 'SECRET', reference: '<SECRET>', cookie: 'SECRET'}, sha, {drill:true});
  assert.match(email.subject, /PRUEBA CONTROLADA/);
  assert.doesNotMatch(JSON.stringify(email), /SECRET|cookie/);
  assert.match(email.text, /No constituye una caída real/);
  for (const patch of [{id:'SECRET'}, {operation:'<script>'}, {openedAt:'bad'}, {event:'other'}, {code:'secret'}])
    assert.throws(() => operationEmail({...event, ...patch}, sha));
  assert.throws(() => createOperationNotifier({...config, recipient:'stranger@example.com'}));
  assert.throws(() => createOperationNotifier({...config, apiKey:''}));
});

test('accepted notification has bounded request, stable provider key, no cookies, and is not claimed delivered', async () => {
  const calls = [];
  const notify = createOperationNotifier({...config, transport: async (url, init) => {
    calls.push({url, init}); return Response.json({id, privateMessage:'SECRET'});
  }});
  const receipt = await notify(event);
  assert.equal(receipt.accepted, true); assert.equal(receipt.providerId, id);
  assert.doesNotMatch(JSON.stringify(receipt), /SECRET|re_QA_TEST|delivered/);
  assert.equal((await notify(event)).duplicate, true); assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.redirect, 'error'); assert.ok(calls[0].init.signal);
  assert.equal(calls[0].init.headers.Cookie, undefined);
  assert.match(calls[0].init.headers['Idempotency-Key'], new RegExp(id));
  const recovery = {...event, event:'contract_recovered', recoveredAt:'2026-11-09T20:05:00Z'};
  await notify(recovery); assert.equal(calls.length, 2);
  assert.notEqual(calls[0].init.headers['Idempotency-Key'], calls[1].init.headers['Idempotency-Key']);
});

test('quota, invalid response and uncertain timeout never leak body or retry automatically', async () => {
  for (const [transport, code] of [
    [async () => new Response('SECRET',{status:429}), 'PROVIDER_RATE_LIMIT'],
    [async () => new Response('SECRET',{status:403}), 'PROVIDER_REJECTED'],
    [async () => Response.json({id:'SECRET'}), 'INVALID_PROVIDER_RESPONSE'],
    [async () => {throw Error('SECRET');}, 'PROVIDER_UNAVAILABLE'],
  ]) {
    let calls = 0;
    const notify = createOperationNotifier({...config, transport: async (...args) => {calls++; return transport(...args);}});
    const receipt = await notify(event);
    assert.equal(receipt.accepted, false); assert.equal(receipt.code, code);
    assert.doesNotMatch(JSON.stringify(receipt), /SECRET/);
    await notify(event); assert.equal(calls, 1);
  }
});

test('one collector cannot send more than ten messages, even for different incidents', async () => {
  let calls = 0;
  const notify = createOperationNotifier({...config, transport: async () => {calls++; return Response.json({id});}});
  for (let i = 0; i < 10; i++) assert.equal((await notify({...event, id:randomUUID()})).accepted, true);
  assert.equal((await notify({...event, id:randomUUID()})).code, 'SERIES_SEND_LIMIT');
  assert.equal(calls, 10);
});

test('notification failure is recorded without hiding probe recovery or claiming delivery', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pdf-alerts-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  let count = 0;
  const names = ['login','private_page','private_pdf','foreign_mutation','liveness_revision'];
  const notify = createOperationNotifier({...config, transport: async () => new Response('',{status:429})});
  const summary = await monitorOperations({expectedRevision:sha, samples:2, intervalMs:15000,
    outputDirectory:join(root,'series'), wait:async()=>{}, notify,
    probe:async()=> {
      const bad = count++ === 0;
      return {origin:'https://pdf-interactivo-qa.vercel.app', expectedRevision:sha, checkedAt:new Date().toISOString(),
        checks:names.map((name,i)=>({name, passed:!(bad && i===4), status:[200,307,401,403,200][i], elapsedMs:1})),
        alerts:bad ? [{operation:'liveness_revision',code:'CONTRACT_MISMATCH'}] : []};
    }});
  assert.equal(summary.samples, 2); assert.equal(summary.lastSamplePassed, true); assert.equal(summary.passed, false);
  assert.deepEqual(summary.notifications, {configured:true, accepted:0, failed:2, deliveryVerified:false});
  const lines = (await readFile(join(root,'series','notifications.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(lines.length, 2); assert.equal(lines[0].incidentId, lines[1].incidentId);
});
