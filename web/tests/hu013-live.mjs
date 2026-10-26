// Opt-in HTTP/SDK checks for disposable HU013 fixtures; never reads browser sessions.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
const [accountsFile, mode = 'check'] = process.argv.slice(2);
assert.ok(accountsFile && ['check','cleanup'].includes(mode));
const accounts = JSON.parse(await readFile(accountsFile,'utf8')).users;
assert.equal(accounts.length,2);
assert.ok(accounts.every(a=>/^hu013-[12]-[0-9a-f-]+@example\.invalid$/.test(a.email)));
const base='http://localhost:3000', directory=dirname(accountsFile);
const environment=Object.fromEntries((await readFile(new URL('../.env.local',import.meta.url),'utf8')).split(/\r?\n/)
 .map(line=>/^([A-Z_]+)\s*=\s*["']?([^"'\r\n]*)["']?$/.exec(line)).filter(Boolean).map(m=>[m[1],m[2]]));
async function session(account) {
  const cookies = new Map();
  async function request(path, init = {}) {
    const headers = new Headers(init.headers);
    if (cookies.size) headers.set('Cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (init.method && init.method !== 'GET') headers.set('Origin', base);
    const response = await fetch(base + path, { ...init, headers, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0], split = pair.indexOf('=');
      const name = pair.slice(0, split), value = pair.slice(split + 1);
      if (/max-age=0/i.test(cookie)) cookies.delete(name); else cookies.set(name, value);
    }
    return response;
  }
  await request('/login');
  async function action(path, exportedName, args) {
    const manifest = JSON.parse(await readFile(new URL('../.next/dev/server/server-reference-manifest.json', import.meta.url), 'utf8'));
    const id = Object.keys(manifest.node).find(id => manifest.node[id].exportedName === exportedName);
    assert.ok(id, `Compiled action unavailable: ${exportedName}`);
    const response = await request(path, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) });
    assert.equal(response.status, 200, `Server Action ${exportedName} failed`);
    const body = await response.text();
    return { success: body.includes('"success":true'), refused: body.includes('"success":false') };
  }
  assert.equal((await action('/login', 'loginAction', [{ email: account.email, password: account.password }])).success, true, 'Synthetic login failed');
  const dashboard = await request('/dashboard'); assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Bienvenido a tus proyectos/);
  const client = createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedIn = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  assert.equal(signedIn.error, null); assert.equal(signedIn.data.user?.id, account.id);
  return { request, action, client };
}

const owner=await session(accounts[0]);
const result=await owner.client.from('projects').select('id,owner_id,document_id,name,created_at,updated_at').eq('owner_id',accounts[0].id);
assert.equal(result.error,null); assert.equal(result.data.length,2);
assert.deepEqual(result.data.map(p=>p.name).sort(),['HU013-2-paginas','HU013-4-paginas']);
for(const p of result.data){assert.equal(p.owner_id,accounts[0].id);assert.equal(p.created_at,p.updated_at);}
if(mode==='check'){
 const other=await session(accounts[1]);
 for(const p of result.data){
  const pdf=await owner.request('/api/projects/'+p.id+'/pdf');assert.equal(pdf.status,200);
  const actual=Buffer.from(await pdf.arrayBuffer()), expected=await readFile(join(directory,p.name+'.pdf'));
  assert.equal(createHash('sha256').update(actual).digest('hex'),createHash('sha256').update(expected).digest('hex'));
  assert.equal((await other.request('/api/projects/'+p.id+'/pdf')).status,404);
  assert.equal((await other.client.from('projects').select('id').eq('id',p.id)).data.length,0);
  assert.equal((await fetch(base+'/api/projects/'+p.id+'/pdf')).status,401);
 }
 console.log('PASS: two unchanged PDFs match their original SHA-256; foreign owner denied by API/RLS; unauthenticated access denied.');
 await other.client.auth.signOut({ scope: 'local' });
}else{
 for(const p of result.data){
  const r=await owner.request('/api/projects/'+p.id+'/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documentId:p.document_id,confirmed:true})});
  assert.equal(r.status,200,(await r.json()).message);
 }
 assert.equal((await owner.client.from('projects').select('id').eq('owner_id',accounts[0].id)).data.length,0);
 assert.equal((await owner.client.from('documents').select('id').eq('owner_id',accounts[0].id)).data.length,0);
 console.log('PASS: both disposable projects and documents deleted through the confirmed application API.');
}
await owner.client.auth.signOut({ scope: 'local' });
