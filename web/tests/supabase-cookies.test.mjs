import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function fixture(set) {
  const source = readFileSync(new URL('../lib/supabase/server.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  let adapter; const exports = {};
  runInNewContext(outputText, { exports, Error, process: { env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  } }, require(name) {
    if (name === 'next/headers') return { cookies: async () => ({ getAll: () => [{ name: 'test', value: 'value' }], set }) };
    if (name === '@supabase/ssr') return { createServerClient(_url, _key, options) { adapter = options.cookies; return { auth: { getUser: async () => {
      adapter.setAll([{ name: 'test', value: '', options: { maxAge: 0 } }]);
      return { data: { user: null }, error: { message: 'Revoked session' } };
    } } }; } };
    throw Error(`Unexpected dependency ${name}`);
  } });
  return { create: exports.createClient, get adapter() { return adapter; } };
}

test('a revoked session can finish its auth check in a read-only Server Component', async () => {
  const f = fixture(() => { throw new Error('Cookies can only be modified in a Server Action or Route Handler.'); });
  const client = await f.create(); const result = await client.auth.getUser();
  assert.equal(result.data.user, null); assert.equal(result.error.message, 'Revoked session');
});

test('mutable Action/Route cookie stores still receive the exact values and options', async () => {
  const writes = []; const f = fixture((...args) => writes.push(args)); await f.create();
  const options = { httpOnly: true, sameSite: 'lax' };
  f.adapter.setAll([{ name: 'test', value: 'new-value', options }]);
  assert.deepEqual(writes, [['test', 'new-value', options]]);
  assert.equal(f.adapter.getAll()[0].value, 'value');
});

test('unexpected cookie failures are propagated rather than mistaken for read-only rendering', async () => {
  const failure = new Error('Unexpected storage failure');
  const f = fixture(() => { throw failure; }); await f.create();
  assert.throws(() => f.adapter.setAll([{ name: 'test', value: '' }]), error => error === failure);
});
