import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { z } from 'zod';

function compile(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  runInNewContext(outputText, { exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test-key' } },
    require(name) { if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`); return dependencies[name]; } });
  return exports;
}
const update = compile('../lib/validations/update-password.ts', { zod: { z } });
const validation = compile('../lib/validations/change-password.ts', { zod: { z }, './update-password': update });
const valid = { currentPassword: 'Only-test-current-1', password: 'Only-test-new-2', confirmPassword: 'Only-test-new-2' };
function fixture(options = {}) {
  const events = [];
  const access = options.access ?? { ok: true, userId: 'owner' };
  const verifier = { auth: {
    async signInWithPassword(value) { events.push(['verify', value]); return { data: { user: { id: options.verifiedId ?? 'owner' } }, error: options.verifyError ?? null }; },
    async updateUser(value) { events.push(['update', value]); return { error: options.updateError ?? null }; },
    async signOut(value) { events.push(['verifierSignOut', value.scope]); return { error: null }; },
  } };
  let accesses = 0;
  const action = compile('../app/actions/change-password.ts', {
    '@supabase/supabase-js': { createClient(_url, _key, config) { assert.equal(config.auth.persistSession, false); assert.equal(config.auth.autoRefreshToken, false); return verifier; } },
    '@/lib/auth/access': { async getCurrentAccess() { accesses++; return accesses === 2 && options.freshAccess ? options.freshAccess : access; } },
    '@/lib/auth/login-session': { async clearLoginSession() { events.push(['clearLogin']); } },
    '@/lib/supabase/server': { async createClient() { return { auth: {
      async getUser() { return { data: { user: { id: options.userId ?? 'owner', email: 'test@example.test' } }, error: null }; },
      async signOut(value) { events.push(['browserSignOut', value.scope]); return { error: null }; },
    } }; } },
    '@/lib/validations/change-password': validation,
  });
  return { events, action: action.changePasswordAction };
}

test('password change rejects missing, unchanged, weak and mismatched credentials before contacting Auth', async () => {
  for (const input of [{ ...valid, currentPassword: '' }, { ...valid, password: valid.currentPassword, confirmPassword: valid.currentPassword },
    { ...valid, password: 'weak', confirmPassword: 'weak' }, { ...valid, confirmPassword: 'Different-1' }]) {
    const f = fixture(); assert.equal((await f.action(input)).success, false); assert.equal(f.events.length, 0);
  }
});
test('password change never contacts Auth for an absent, inactive or mismatched owner session', async () => {
  for (const options of [{ access: { ok: false, message: 'No session' } }, { access: { ok: false, message: 'Inactive' } }, { userId: 'another-owner' }]) {
    const f = fixture(options); assert.equal((await f.action(valid)).success, false); assert.equal(f.events.length, 0);
  }
});
test('incorrect current password or rate limiting prevents any update and returns no credentials', async () => {
  for (const status of [400, 429]) {
    const f = fixture({ verifyError: { status } }); const result = await f.action(valid);
    assert.equal(result.success, false); assert.equal(f.events.some(e => e[0] === 'update'), false);
    assert.ok(result.errors.currentPassword); assert.equal(JSON.stringify(result).includes(valid.currentPassword), false);
    if (status === 429) assert.match(result.message, /Demasiados intentos/);
  }
});
test('identity mismatch and revoked access after reauthentication cannot change a password', async () => {
  for (const options of [{ verifiedId: 'another-owner' }, { freshAccess: { ok: false } }]) {
    const f = fixture(options); assert.equal((await f.action(valid)).success, false); assert.equal(f.events.some(e => e[0] === 'update'), false);
  }
});
test('provider rejection leaves the existing browser session intact and safely reports the failure', async () => {
  const f = fixture({ updateError: { code: 'weak_password' } }); const result = await f.action(valid);
  assert.equal(result.success, false); assert.match(result.message, /seguridad/);
  assert.equal(f.events.some(e => e[0] === 'clearLogin'), false);
});
test('successful change updates only the verified user then revokes sessions and clears browser login', async () => {
  const f = fixture(); const result = await f.action(valid);
  assert.equal(result.success, true);
  assert.deepEqual(f.events.map(e => e[0]), ['verify', 'update', 'verifierSignOut', 'clearLogin', 'browserSignOut', 'verifierSignOut']);
  assert.equal(f.events[1][1].password, valid.password);
  assert.equal(f.events[1][1].current_password, valid.currentPassword);
  assert.equal(f.events[2][1], 'global'); assert.equal(f.events[4][1], 'local');
  assert.equal(JSON.stringify(result).includes(valid.password), false);
});
