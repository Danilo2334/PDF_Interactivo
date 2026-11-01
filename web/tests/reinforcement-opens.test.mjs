import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const schema=load('lib/validations/reinforcement-opens.ts'),proof=load('lib/readers/visit-session.ts');
const tick=()=>new Promise(r=>setImmediate(r));
test('HU038 owner panel renders zero denominator safely and removes metrics when authorization expires',async()=>{
 const states=[],effects=[];let cursor=0,tree,status=200;
 const api=load('components/documents/reinforcement-usage-panel.tsx',{
  react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect:f=>effects.push(f)},
  '@/lib/validations/reinforcement-opens':schema,
 },{fetch:async()=>Response.json(status===200?{totalVisits:0,through:new Date().toISOString(),rows:[{id:randomUUID(),pageNumber:2,title:'QA sin uso',frequency:0,visits:0,percentage:0}]}:{message:'Unauthorized'},{status})});
 function nodes(n){return !n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
 function render(){cursor=0;tree=api.ReinforcementUsagePanel({projectId,documentId});}
 render();nodes(tree).find(n=>n.type==='button').props.onClick();render();effects.pop()();await tick();render();
 assert.ok(nodes(tree).some(n=>n.type==='p'&&String(n.props.children).includes('Sin visitas válidas')));assert.ok(nodes(tree).some(n=>n.type==='li'));
 status=401;effects.pop()();await tick();render();assert.ok(!nodes(tree).some(n=>n.type==='li'));assert.match(nodes(tree).find(n=>n.props?.role==='alert').props.children,/iniciar sesión/);
});
test('HU038 nonblocking queue waits for valid visit, retries exactly once with the same operation, and excludes owner/preview',async()=>{
 const calls=[];let release;
 const api=load('lib/readers/reinforcement-open-reporter.ts',{}, {fetch:async(url,init)=>{calls.push({url,...JSON.parse(init.body)});if(calls.length===1)await new Promise(r=>release=r);return new Response('',{status:calls.length===1?503:200});}});
 const reporter=api.createReinforcementOpenReporter('/api/read/qa',false),items=[{id:'r_'+'a'.repeat(32),pageNumber:2}];
 assert.equal(reporter.opened(items),undefined);assert.equal(calls.length,0);
 reporter.acceptedVisit(randomUUID());await tick();assert.equal(calls.length,1);
 reporter.opened(items);assert.equal(calls.length,1);release();await tick();assert.equal(calls.length,3);
 assert.equal(calls[0].operationId,calls[1].operationId);assert.notEqual(calls[1].operationId,calls[2].operationId);
 reporter.acceptedVisit(null);reporter.opened(items);await tick();assert.equal(calls.length,3);reporter.close();
 const preview=api.createReinforcementOpenReporter('/private',true);preview.opened(items);preview.acceptedVisit(randomUUID());await tick();assert.equal(calls.length,3);preview.close();
});
test('HU038 inputs reject duplicate targets, client identities, invalid pages and unbounded batches',()=>{
 const item={id:'r_'+'a'.repeat(32),pageNumber:1},valid={operationId:randomUUID(),visitId:randomUUID(),items:[item]};
 assert.equal(schema.reinforcementOpenInputSchema.safeParse(valid).success,true);
 for(const input of [{...valid,items:[item,item]},{...valid,documentId},{...valid,items:[{...item,pageNumber:0}]},{...valid,items:Array.from({length:501},()=>item)}])assert.equal(schema.reinforcementOpenInputSchema.safeParse(input).success,false);
});
test('HU038 server resolves opaque IDs itself and refuses foreign page, session, publication and owner metrics',async()=>{
 const before=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  let access={ok:false,status:401,message:'Login'},reader=true,privateTest=false,visitCookie=true,denied=false;const calls=[];
  const id=randomUUID(),opaque='r_'+'a'.repeat(32),pub=randomUUID(),visitId=randomUUID();
  class ReaderUnavailable extends Error{constructor(){super('Unavailable');this.status=404;}}
  const db={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{owner_id:owner,document_id:documentId,status:'ready'}})}),rpc:async(name,body)=>{calls.push({name,body});return{data:{recorded:true,count:1}};}};
  const api=load('lib/readers/reinforcement-open-service.ts',{
   '@/lib/auth/access':{getCurrentAccess:async()=>access,checkPermission:async()=>access},'@/lib/supabase/server':{createClient:async()=>db},
   '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='https://qa.example'},
   '@/lib/reinforcements/request-service':{readSmallJson:async r=>({body:await r.json()}),reply:(body,status=200)=>Response.json(body,{status})},
   '@/lib/readers/repository':{ReaderUnavailable,serverClient:()=>db,loadReader:async()=>{if(denied)throw new ReaderUnavailable();return{id:pub,documentId,ownerId:owner,privateTest,hash:'b'.repeat(64),accessVersion:2,db,snapshot:{items:[{id,pageNumber:2}],requireIdentification:false}};}},
   '@/lib/readers/model':{readerObjectId:()=>opaque},'@/lib/readers/session':{getReaderSession:()=>reader?{identified:false}:null},
   '@/lib/publications/proof':{publicationOrigin:()=> 'https://qa.example'},'@/lib/readers/visit-session':{...proof,visitSession:()=>({nonce:'c'.repeat(64),cookie:visitCookie?null:'new'})},
   '@/lib/validations/reinforcement-opens':schema,
  });
  const post=(items=[{id:opaque,pageNumber:2}],origin='https://qa.example')=>api.postReinforcementOpen(new Request('https://qa.example/api/read/token/reinforcement-opens',{method:'POST',headers:{Origin:origin},body:JSON.stringify({operationId:randomUUID(),visitId,items})}),'token');
  assert.equal((await post(undefined,'https://foreign.example')).status,403);
  assert.equal((await post([{id:opaque,pageNumber:1}])).status,409);assert.equal(calls.length,0);
  reader=false;assert.equal((await post()).status,428);reader=true;visitCookie=false;assert.equal((await post()).status,428);visitCookie=true;
  access={ok:true,userId:owner,role:'owner'};assert.equal((await(await post()).json()).count,0);assert.equal(calls.length,0);
  access={ok:false,status:401,message:'Login'};privateTest=true;assert.equal((await(await post()).json()).count,0);privateTest=false;
  assert.equal((await post()).status,200);const p=JSON.parse(calls[0].body.p_payload);assert.equal(p.items[0].id,id);assert.equal(p.items[0].pageNumber,2);assert.equal(p.visitId,visitId);assert.equal(p.operation,'reinforcement-open');assert.doesNotMatch(calls[0].body.p_payload,/email|nonce|userAgent/);
  denied=true;assert.equal((await post()).status,404);
  const totals=()=>api.getReinforcementUsage(new Request('https://qa.example/api/projects/x/reinforcement-usage?documentId='+documentId),projectId);
  assert.equal((await totals()).status,401);access={ok:true,userId:other,role:'owner'};assert.equal((await totals()).status,404);
 }finally{if(before===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=before;}
});
test('HU038 PostgreSQL validates associations atomically, keeps frequency separate from visit percentage, preserves history and enforces RLS',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),before=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 const pub=randomUUID(),first=randomUUID(),second=randomUUID(),visit=randomUUID(),another=randomUUID(),visitor='c'.repeat(64),admin=randomUUID();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,private to authenticated,service_role;
   create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);grant select on public.profiles to authenticated;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);insert into private.reinforcement_request_secrets values(true,repeat('a',64));
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,status text);
   create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,size_bytes bigint);
   create table public.experience_publications(id uuid primary key,project_id uuid,document_id uuid,owner_id uuid,version integer,snapshot jsonb,snapshot_hash text,token text,published_at timestamptz,origin text,visibility text,visibility_version integer);
   insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner'),('${admin}',true,'admin');
   insert into public.projects values('${projectId}','${owner}','${documentId}','ready');insert into public.documents values('${documentId}','${owner}','uploaded','original.pdf',100);`);
  const snapshot={document:{storagePath:'original.pdf',sizeBytes:100},items:[{id:first,pageNumber:1,title:'Primero'},{id:second,pageNumber:2,title:'Segundo'}]};
  await db.query('insert into public.experience_publications values($1,$2,$3,$4,1,$5,$6,$7,now(),$8,$9,1)',[pub,projectId,documentId,owner,JSON.stringify(snapshot),'b'.repeat(64),'d'.repeat(48),'https://qa.example','public']);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261101061105_reader_open_visits.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261101220427_reader_reinforcement_opens.sql',import.meta.url),'utf8'));
  await db.query('insert into public.reader_open_visits(id,project_id,document_id,owner_id,publication_id,visitor_hash,origin) values($1,$2,$3,$4,$5,$6,$7),($8,$2,$3,$4,$5,$9,$7)',[visit,projectId,documentId,owner,pub,visitor,'https://qa.example',another,'e'.repeat(64)]);
  async function role(user='',name='service_role'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role '+name);}
  async function record(extra={},transform=p=>p){const signed=transform(proof.signReinforcementOpen({operationId:randomUUID(),visitId:visit,publicationId:pub,publicationHash:'b'.repeat(64),publicationToken:'d'.repeat(48),accessVersion:1,origin:'https://qa.example',visitorHash:visitor,identified:true,items:[{id:first,pageNumber:1}],...extra}));return(await db.query('select public.record_reinforcement_open($1,$2) result',[signed.p_payload,signed.p_signature])).rows[0].result;}
  async function totals(){return(await db.query('select public.get_reinforcement_open_totals($1,$2) result',[projectId,documentId])).rows[0].result;}
  await role(owner,'authenticated');assert.equal((await totals()).totalVisits,2);assert.equal((await totals()).rows.length,0);
  await role();const operationId=randomUUID();assert.equal((await record({operationId})).recorded,true);assert.equal((await record({operationId})).recorded,false);
  await record();await record({items:[{id:second,pageNumber:2}]});
  await assert.rejects(record({items:[{id:first,pageNumber:2}]}),e=>e.code==='PT409');
  await assert.rejects(record({items:[{id:first,pageNumber:1},{id:randomUUID(),pageNumber:2}]}),e=>e.code==='PT409');
  await assert.rejects(record({visitId:another}),e=>e.code==='42501');
  await assert.rejects(record({operationId,items:[{id:second,pageNumber:2}]}),e=>e.code==='PT409');
  await assert.rejects(record({},p=>({...p,p_signature:'f'.repeat(64)})),e=>e.code==='42501');
  await role(owner,'authenticated');let result=await totals();assert.equal(result.totalVisits,2);assert.equal(result.rows.find(x=>x.id===first).frequency,2);assert.equal(result.rows.find(x=>x.id===first).visits,1);assert.equal(result.rows.find(x=>x.id===first).percentage,50);assert.equal(result.rows.find(x=>x.id===second).pageNumber,2);
  await assert.rejects(record(),e=>e.code==='42501');await role(other,'authenticated');assert.equal((await totals()).totalVisits,0);assert.equal((await totals()).rows.length,0);
  await role(admin,'authenticated');assert.equal((await totals()).rows.length,2);
  await db.exec('reset role');await db.query('update public.experience_publications set visibility=$1 where id=$2',['unpublished',pub]);await role();await assert.rejects(record(),e=>e.code==='PT404');
  await role(owner,'authenticated');assert.equal((await totals()).rows.find(x=>x.id===first).frequency,2);
  await db.exec('reset role');await db.query('update public.profiles set is_active=false where id=$1',[owner]);await role(owner,'authenticated');assert.equal((await totals()).totalVisits,0);assert.equal((await totals()).rows.length,0);
 }finally{await db.close();if(before===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=before;}
});
