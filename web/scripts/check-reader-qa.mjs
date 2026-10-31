import { fileURLToPath } from 'node:url';

// Read-only configuration inspection. No network, writes, provider calls or values
// in the output. A passing result is not proof of HTTPS or hosting ownership.
const project = 'zqodybtzssvqozrckfgw';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function legacyClaims(key) {
  try { return JSON.parse(Buffer.from(key?.split('.')[1] ?? '', 'base64url').toString()); }
  catch { return null; }
}
function httpsOrigin(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && url.pathname === '/' && !url.search && !url.hash
      && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)
      && !/\.(?:localhost|local|invalid|test|example)$/i.test(url.hostname)
      && !['example.com', 'example.org', 'example.net'].includes(url.hostname) ? url.origin : null;
  } catch { return null; }
}
export function inspectReaderQa(env, phase = 'bootstrap') {
  if (!['bootstrap', 'publication'].includes(phase)) throw Error('Unsupported QA phase');
  const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const serverKey = env.SUPABASE_SERVER_KEY?.trim() ?? '';
  const publicClaims = legacyClaims(publicKey), serverClaims = legacyClaims(serverKey);
  const origin = httpsOrigin(env.PUBLICATION_ORIGIN ?? '');
  const checks = [
    { name: 'supabase_project', ok: env.NEXT_PUBLIC_SUPABASE_URL === `https://${project}.supabase.co` },
    { name: 'public_key_format', ok: publicKey.startsWith('sb_publishable_') || publicClaims?.role === 'anon' && publicClaims?.ref === project },
    { name: 'server_key_format', ok: serverKey.startsWith('sb_secret_') || serverClaims?.role === 'service_role' && serverClaims?.ref === project },
    { name: 'existing_signing_secret_format', ok: /^[0-9a-f]{64}$/.test(env.REINFORCEMENT_REQUEST_SECRET ?? '') },
    { name: 'publication_origin_syntax', ok: origin !== null },
    { name: 'site_matches_publication_origin', ok: origin !== null && httpsOrigin(env.NEXT_PUBLIC_SITE_URL ?? '') === origin },
    { name: 'shared_deployment_login_epoch', ok: uuid.test(env.PDF_INTERACTIVO_LOGIN_EPOCH ?? '') },
    { name: 'publication_flag', ok: phase === 'publication' ? env.PUBLICATION_HTTPS_VERIFIED === 'true' : env.PUBLICATION_HTTPS_VERIFIED !== 'true' },
    { name: 'no_public_server_credentials', ok: !Object.entries(env).some(([name, value]) => value && /^NEXT_PUBLIC_.*(?:SECRET|SERVER_KEY|SERVICE_ROLE|OPENAI_API_KEY|GEMINI_API_KEY)/i.test(name)) },
  ];
  return { phase, configurationChecksPassed: checks.every(check => check.ok), checks,
    notVerified: ['hosting_account_and_plan', 'key_ownership_and_signing_secret_match', 'dns_certificate_and_redirects', 'reader_end_to_end', 'withdrawal_HU036'],
    effects: 'read-only; no deployment, publication, database writes or AI calls' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && !['--bootstrap', '--publication'].includes(args[0])) {
    console.error('Uso: node --env-file=<archivo privado> web/scripts/check-reader-qa.mjs [--bootstrap|--publication]');
    process.exitCode = 2;
  } else {
    const result = inspectReaderQa(process.env, args[0] === '--publication' ? 'publication' : 'bootstrap');
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.configurationChecksPassed ? 0 : 1;
  }
}
