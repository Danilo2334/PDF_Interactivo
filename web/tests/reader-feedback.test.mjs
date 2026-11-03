import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const schema=load('lib/validations/reader-feedback.ts'),proof=load('lib/readers/feedback-proof.ts');

test('HU040 requires a single known rating, limits comments, normalizes controls and rejects client identities',()=>{
 const valid={operationId:randomUUID(),pageNumber:1,rating:'useful',comment:' \u0001Hola\r\nQA '};
 assert.equal(schema.readerFeedbackInputSchema.parse(valid).comment,'Hola\nQA');
 assert.equal(schema.readerFeedbackInputSchema.parse({...valid,comment:undefined}).comment,'');
 for(const input of [{...valid,rating:undefined},{...valid,rating:['useful','unclear']},{...valid,rating:''},{...valid,comment:'x'.repeat(1001)},{...valid,pageNumber:0},{...valid,readerId:randomUUID()},{...valid,documentId}])assert.equal(schema.readerFeedbackInputSchema.safeParse(input).success,false);
});

test('HU040 API binds feedback to server snapshot/session, excludes private/owner and rejects revoked, foreign page, origin or missing identity',async()=>{
 const before=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  let session={reader:randomUUID(),identified:true},privateTest=false,revoked=false,ownerView=false,requireIdentity=true;const calls=[];
  const target=randomUUID(),pub=randomUUID(),opaque='r_'+'a'.repeat(32);
  class ReaderUnavailable extends Error{constructor(){super('Unavailable');this.status=404;}}
  const api=load('lib/readers/feedback-service.ts',{
   '@/lib/auth/access':{getCurrentAccess:async()=>ownerView?{ok:true,userId:owner}:{ok:false,status:401}},
   '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='https://qa.example'},
   '@/lib/reinforcements/request-service':{readSmallJson:async r=>({body:await r.json()}),reply:(b,s=200)=>Response.json(b,{status:s})},
   '@/lib/readers/repository':{ReaderUnavailable,loadReader:async()=>{if(revoked)throw new ReaderUnavailable();return{id:pub,ownerId:owner,privateTest,hash:'b'.repeat(64),accessVersion:2,snapshot:{requireIdentification:requireIdentity,items:[{id:target,pageNumber:2}]},db:{rpc:async(name,input)=>{calls.push({name,input});return{data:{id:randomUUID(),pageNumber:2,rating:'useful',comment:'QA',createdAt:new Date().toISOString()}};}}};}},
   '@/lib/readers/session':{getReaderSession:()=>session},'@/lib/readers/model':{readerObjectId:()=>opaque},
   '@/lib/publications/proof':{publicationOrigin:()=> 'https://qa.example'},'@/lib/readers/feedback-proof':proof,
   '@/lib/validations/reader-feedback':schema,
  });
  const post=(body={},id=opaque,origin='https://qa.example')=>api.readerFeedback(new Request('https://qa.example/api/read/token/reinforcements/'+id+'/feedback',{method:'POST',headers:{Origin:origin},body:JSON.stringify({operationId:randomUUID(),pageNumber:2,rating:'useful',comment:' QA ',...body})}),'token',id,true);
  assert.equal((await post({},opaque,'https://other.example')).status,403);assert.equal((await post({},'r_'+'f'.repeat(32))).status,404);
  assert.equal((await post({pageNumber:1})).status,409);assert.equal((await post({rating:''})).status,400);assert.equal(calls.length,0);
  session=null;assert.equal((await post()).status,403);requireIdentity=false;assert.equal((await post()).status,428);
  session={reader:randomUUID(),identified:true};privateTest=true;assert.equal((await post()).status,403);privateTest=false;ownerView=true;assert.equal((await post()).status,403);ownerView=false;
  assert.equal((await post()).status,200);const p=JSON.parse(calls[0].input.p_payload);assert.equal(p.readerId,session.reader);assert.equal(p.reinforcementId,target);assert.equal(p.pageNumber,2);assert.equal(p.comment,'QA');assert.equal(p.operation,'reinforcement-feedback');assert.doesNotMatch(calls[0].input.p_payload,/email|identity|password/);
  revoked=true;assert.equal((await post()).status,404);
 }finally{if(before===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=before;}
});

test('HU040 PostgreSQL preserves one immutable opinion per session/ref/version, validates proof and current publication, and enforces private owner RLS',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),before=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 const pub=randomUUID(),target=randomUUID(),second=randomUUID(),reader=randomUUID(),source=randomUUID();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,private to authenticated,service_role;
   create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);grant select on public.profiles to authenticated;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);insert into private.reinforcement_request_secrets values(true,repeat('a',64));
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,status text);
   create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,size_bytes bigint);
   create table public.experience_publications(id uuid primary key,project_id uuid references public.projects(id) on delete cascade,document_id uuid references public.documents(id) on delete cascade,owner_id uuid,version integer,snapshot jsonb,snapshot_hash text,token text,published_at timestamptz,origin text,visibility text,visibility_version integer);
   insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner');
   insert into public.projects values('${projectId}','${owner}','${documentId}','ready');insert into public.documents values('${documentId}','${owner}','uploaded','original.pdf',100);`);
  const snapshot={requireIdentification:true,document:{storagePath:'original.pdf',sizeBytes:100},items:[{id:target,sourceVersionId:source,pageNumber:1,title:'Primero'},{id:second,pageNumber:2,title:'Segundo'}]};
  await db.query('insert into public.experience_publications values($1,$2,$3,$4,1,$5,$6,$7,now(),$8,$9,1)',[pub,projectId,documentId,owner,JSON.stringify(snapshot),'b'.repeat(64),'d'.repeat(48),'https://qa.example','public']);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261101231149_reader_reinforcement_feedback.sql',import.meta.url),'utf8'));
  async function role(user='',name='service_role'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role '+name);}
  async function send(extra={},mutate=p=>p){const p=mutate(proof.signReaderFeedback({action:'submit',operationId:randomUUID(),publicationId:pub,publicationHash:'b'.repeat(64),publicationToken:'d'.repeat(48),accessVersion:1,origin:'https://qa.example',readerId:reader,identified:true,reinforcementId:target,pageNumber:1,rating:'useful',comment:'QA',...extra}));return(await db.query('select public.change_reader_reinforcement_feedback($1,$2) result',[p.p_payload,p.p_signature])).rows[0].result;}
  await role();assert.equal(await send({action:'status'}),null);const op=randomUUID(),first=await send({operationId:op});assert.equal(first.id,op);assert.equal(first.rating,'useful');assert.equal(first.pageNumber,1);assert.deepEqual(await send({operationId:op}),first);assert.deepEqual(await send(),first);assert.deepEqual(await send({action:'status'}),first);
  await assert.rejects(send({rating:'unclear'}),e=>e.code==='PT409');await assert.rejects(send({operationId:op,reinforcementId:second,pageNumber:2}),e=>e.code==='PT409');await assert.rejects(send({pageNumber:2}),e=>e.code==='PT409');
  for(const change of [{rating:''},{rating:null},{comment:'x'.repeat(1001)},{comment:' untrimmed '},{comment:'a\u0001b'}])await assert.rejects(send(change),e=>e.code==='23514');
  await assert.rejects(send({identified:false}),e=>e.code==='42501');await assert.rejects(send({},p=>({...p,p_signature:'f'.repeat(64)})),e=>e.code==='42501');
  await assert.rejects(send({},signed=>{const payload=JSON.stringify({...JSON.parse(signed.p_payload),expiresAt:0});return{p_payload:payload,p_signature:createHmac('sha256','a'.repeat(64)).update(payload).digest('hex')};}),e=>e.code==='42501');
  const another=await send({reinforcementId:second,pageNumber:2,rating:'unclear',comment:'',operationId:randomUUID()});assert.equal(another.pageNumber,2);
  await role(owner,'authenticated');assert.equal((await db.query('select * from public.reader_reinforcement_feedback')).rows.length,2);
  for(const sql of ['update public.reader_reinforcement_feedback set rating=\'unclear\'','delete from public.reader_reinforcement_feedback','insert into public.reader_reinforcement_feedback(id) values(gen_random_uuid())'])await assert.rejects(db.query(sql),e=>e.code==='42501');
  await assert.rejects(send(),e=>e.code==='42501');await role(other,'authenticated');assert.equal((await db.query('select * from public.reader_reinforcement_feedback')).rows.length,0);
  await role('','anon');await assert.rejects(db.query('select * from public.reader_reinforcement_feedback'),e=>e.code==='42501');
  await db.exec('reset role');await db.query('update public.experience_publications set visibility=$1 where id=$2',['unpublished',pub]);await role();await assert.rejects(send({action:'status'}),e=>e.code==='PT404');await assert.rejects(send(),e=>e.code==='PT404');
  await role(owner,'authenticated');assert.equal((await db.query('select * from public.reader_reinforcement_feedback')).rows.length,2);
  await db.exec('reset role');await db.query('update public.profiles set is_active=false where id=$1',[owner]);await role(owner,'authenticated');assert.equal((await db.query('select * from public.reader_reinforcement_feedback')).rows.length,0);
  await db.exec('reset role');await db.query('delete from public.documents where id=$1',[documentId]);assert.equal((await db.query('select * from public.reader_reinforcement_feedback')).rows.length,0);
 }finally{await db.close();if(before===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=before;}
});

test('HU040 UI starts without a choice, blocks concurrent submit and recovers a lost response using the same operation',async()=>{
 const states=[],refs=[],effects=[],calls=[];let cursor=0,refCursor=0,tree,release;
 const receipt={id:randomUUID(),pageNumber:1,rating:'useful',comment:'QA <b>texto</b>',createdAt:new Date().toISOString()};
 const api=load('components/readers/reader-feedback.tsx',{
  react:{useId:()=> 'feedback-test',useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}];},useRef(initial){return refs[refCursor++]??={current:initial};},useEffect:f=>effects.push(f)},
  '@/lib/validations/reader-feedback':schema,
 },{requestAnimationFrame:f=>f(),fetch:async(url,init)=>{if(!init.method)return Response.json({enabled:true,receipt:null});calls.push(JSON.parse(init.body));if(calls.length===1){await new Promise(r=>release=r);throw new TypeError('Lost response');}return Response.json({enabled:true,receipt});}});
 function nodes(n){return !n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
 function render(){cursor=0;refCursor=0;tree=api.ReaderFeedback({endpoint:'/api/read/qa',itemId:'r_'+'a'.repeat(32),pageNumber:1,active:true});}
 const tick=()=>new Promise(r=>setImmediate(r));
 render();effects.pop()();await tick();render();let n=nodes(tree);assert.ok(n.filter(e=>e.type==='input').every(e=>!e.props.checked));assert.equal(n.find(e=>e.type==='button'&&e.props.type==='submit').props.disabled,true);
 n.find(e=>e.type==='input'&&e.props.value==='useful').props.onChange();n.find(e=>e.type==='textarea').props.onChange({target:{value:receipt.comment}});render();
 const send=()=>nodes(tree).find(e=>e.type==='form').props.onSubmit({preventDefault(){}});
 const first=send();await tick();await send();assert.equal(calls.length,1);assert.ok(!nodes(tree).some(e=>e.props?.role==='status'&&String(e.props.children).includes('Opinión guardada')));
 release();await first;render();assert.ok(nodes(tree).some(e=>e.props?.role==='alert'));await send();render();assert.equal(calls.length,2);assert.equal(calls[0].operationId,calls[1].operationId);assert.ok(!nodes(tree).some(e=>e.type==='form'));
 assert.equal(nodes(tree).find(e=>e.type==='p'&&e.props.children===receipt.comment).props.children,receipt.comment);
});
