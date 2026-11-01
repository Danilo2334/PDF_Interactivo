import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const schema=load('lib/validations/analytics.ts'),csv=load('lib/analytics/csv.ts');
const sample={document:{id:documentId,projectId,name:'Energía, "QA"'},from:'2020-01-01',to:'2020-01-01',timeZone:'America/Bogota',through:'2020-01-03T00:00:00Z',
 totals:{visits:2,opens:3,quizAttempts:1,correctAnswers:1,answeredQuestions:2,accuracy:50,feedback:2,useful:1,unclear:1,excludedQuizAttempts:0},reinforcements:[],quizzes:[]};

test('HU041 filters reject invalid calendar/ranges and CSV protects formulas, UTF-8 and quoted fields without reader details',()=>{
 assert.equal(schema.analyticsFilterSchema.safeParse({projectId,documentId,from:'2020-02-29',to:'2020-02-29'}).success,true);
 for(const dates of [{from:'2020-02-30',to:'2020-03-01'},{from:'2020-02-03',to:'2020-02-02'}])assert.equal(schema.analyticsFilterSchema.safeParse({projectId,documentId,...dates}).success,false);
 assert.equal(csv.analyticsCsvCell(' \t=HYPERLINK("x")'),'"\' \t=HYPERLINK(""x"")"');
 assert.equal(csv.analyticsCsvCell('a,b\r\n"c"'),'"a,b\r\n""c"""');
 const result=csv.analyticsCsv(sample);assert.ok(result.startsWith('\ufeff'));assert.match(result,/"Energía, ""QA"""/);assert.match(result,/"Intentos de quiz".*"1","intentos"/);assert.doesNotMatch(result,/reader_id|identity|correctIndex|password/);
});

test('HU041 API authorizes CSV and JSON identically, validates scope and rechecks deletion without a privileged fallback',async()=>{
 let allowed=true,foreign=false,removed=false,rpcError=null,rpcCalls=0;
 const db={from(table){let first=true;return{select(){return this},eq(){return this},async maybeSingle(){if(table==='documents')return{data:removed?null:{id:documentId,status:'uploaded'}};if(first){first=false;return{data:foreign?null:{document_id:documentId,status:'ready'}}}return{data:null};}}},rpc:async()=>{rpcCalls++;return{data:sample,error:rpcError}}};
 const api=load('lib/analytics/service.ts',{'@/lib/auth/access':{checkPermission:async()=>allowed?{ok:true,userId:owner}:{ok:false,status:401,message:'Login'}},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/reinforcements/request-service':{reply:(b,s=200)=>Response.json(b,{status:s})},'@/lib/validations/analytics':schema,'@/lib/analytics/csv':csv});
 const get=(format='',extra='')=>api.getAnalytics(new Request(`https://qa.example/api/analytics?projectId=${projectId}&documentId=${documentId}&from=2020-01-01&to=2020-01-01&through=${sample.through}${format?'&format='+format:''}${extra}`));
 assert.equal((await get()).status,200);const exported=await get('csv');assert.equal(exported.status,200);assert.match(exported.headers.get('content-type'),/text\/csv.*utf-8/);assert.match(await exported.text(),/"Visitas".*"2","visitas"/);
 allowed=false;assert.equal((await get('csv')).status,401);allowed=true;foreign=true;assert.equal((await get('csv')).status,404);foreign=false;
 assert.equal((await get('pdf')).status,400);removed=true;assert.equal((await get('csv')).status,409);removed=false;rpcError={code:'PT404'};assert.equal((await get()).status,404);assert.ok(rpcCalls>=4);
});

test('HU041 changing filters hides old metrics/export immediately and losing authorization removes private results and document options',async()=>{
 const states=[],effects=[];let cursor=0,tree,status=200;
 const doc={id:documentId,projectId,name:'QA privado'};
 const api=load('components/analytics/document-analytics-panel.tsx',{
  react:{useId:()=> 'analytics-test',useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}];},useEffect:f=>effects.push(f)},
  '@/lib/validations/analytics':schema,
 },{URLSearchParams,fetch:async()=>Response.json(status===200?sample:{message:'Login requerido'},{status})});
 const tick=()=>new Promise(r=>setImmediate(r));
 function nodes(n){return !n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
 function render(){cursor=0;tree=api.DocumentAnalyticsPanel({documents:[doc],initialFrom:'2020-01-01',initialTo:'2020-01-01'});}
 function exportButton(){return nodes(tree).find(n=>n.type==='button'&&n.props.children==='Exportar CSV');}
 render();assert.equal(exportButton().props.disabled,true);const cleanup=effects.pop()();await tick();render();assert.equal(exportButton().props.disabled,false);assert.equal(nodes(tree).filter(n=>n.type==='dd').length,4);
 nodes(tree).find(n=>n.type==='input'&&n.props.id.endsWith('-from')).props.onChange({target:{value:'2020-01-02'}});cleanup();render();assert.equal(exportButton().props.disabled,true);assert.equal(nodes(tree).filter(n=>n.type==='dd').length,0);
 nodes(tree).find(n=>n.type==='input'&&n.props.id.endsWith('-to')).props.onChange({target:{value:'2020-01-02'}});render();status=401;effects.pop()();await tick();render();assert.equal(exportButton().props.disabled,true);assert.equal(nodes(tree).filter(n=>n.type==='dd').length,0);assert.ok(!nodes(tree).some(n=>n.type==='option'&&n.props.children===doc.name));assert.ok(nodes(tree).some(n=>n.type==='a'&&n.props.href==='/login'&&n.props.children==='Iniciar sesión'));assert.ok(nodes(tree).some(n=>n.type==='div'&&n.props.role==='alert'));
});

test('HU041 PostgreSQL aggregates all four sources across inclusive Bogota dates, above 10000 attempts, enforces RLS and cascades without persisted aggregates',async()=>{
 const db=new PGlite({extensions:{pgcrypto}}),pub=randomUUID(),ref=randomUUID(),quiz=randomUUID(),source=randomUUID(),visit=randomUUID(),lastVisit=randomUUID(),earlyVisit=randomUUID(),nextVisit=randomUUID();
 const otherProject=randomUUID(),otherDocument=randomUUID(),otherPub=randomUUID();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema extensions;create extension pgcrypto with schema extensions;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth,private to authenticated,service_role;
   create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,is_active boolean,role text);grant select on public.profiles to authenticated;
   create function private.can_manage_own_documents() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and is_active and role in ('owner','admin'))$$;
   create function private.document_is_available(id uuid) returns boolean language sql stable as $$select true$$;
   create table private.reinforcement_request_secrets(singleton boolean,secret text);
   create table public.projects(id uuid primary key,owner_id uuid,document_id uuid,status text,name text);
   create table public.documents(id uuid primary key,owner_id uuid,status text,storage_path text,size_bytes bigint);
   create table public.experience_publications(id uuid primary key,project_id uuid references public.projects(id) on delete cascade,document_id uuid references public.documents(id) on delete cascade,owner_id uuid,version integer,snapshot jsonb,snapshot_hash text,token text,published_at timestamptz,origin text,visibility text,visibility_version integer);
   create table public.reinforcement_quiz_versions(id uuid primary key);
   grant select on public.projects,public.documents,public.experience_publications to authenticated;
   alter table public.projects enable row level security;create policy own on public.projects for select to authenticated using(owner_id=auth.uid());
   alter table public.documents enable row level security;create policy own on public.documents for select to authenticated using(owner_id=auth.uid());
   alter table public.experience_publications enable row level security;create policy own on public.experience_publications for select to authenticated using(owner_id=auth.uid());
   insert into auth.users values('${owner}'),('${other}');insert into public.profiles values('${owner}',true,'owner'),('${other}',true,'owner');
   insert into public.projects values('${projectId}','${owner}','${documentId}','ready','Energía'),('${otherProject}','${other}','${otherDocument}','ready','Ajeno');
   insert into public.documents values('${documentId}','${owner}','uploaded','original.pdf',100),('${otherDocument}','${other}','uploaded','other.pdf',100);
   insert into public.reinforcement_quiz_versions values('${quiz}');`);
  const snap={document:{storagePath:'original.pdf',sizeBytes:100},items:[{id:ref,sourceVersionId:source,pageNumber:1,title:'Energía',quiz:{id:quiz,version:3,content:{title:'Quiz energía',questions:[{}]}}}]};
  await db.query("insert into public.experience_publications values($1,$2,$3,$4,1,$5,$6,null,'2019-12-01T00:00:00Z','https://qa.example','unpublished',2),($7,$8,$9,$10,1,$5,$6,null,'2019-12-01T00:00:00Z','https://qa.example','unpublished',2)",[pub,projectId,documentId,owner,JSON.stringify(snap),'b'.repeat(64),otherPub,otherProject,otherDocument,other]);
  const dir=new URL('../../supabase/migrations/',import.meta.url),migration=name=>readFileSync(new URL(readdirSync(dir).find(n=>n.endsWith('_'+name+'.sql')),dir),'utf8');
  await db.exec(migration('reader_open_visits'));await db.exec(migration('reader_reinforcement_opens'));await db.exec(migration('reader_reinforcement_feedback'));
  const attempts=migration('quiz_reader_attempts');await db.exec(attempts.slice(attempts.indexOf('do $$declare tab'),attempts.indexOf('grant select on public.quiz_reader_attempts')));
  await db.exec(migration('document_analytics'));
  await db.query("insert into public.reader_open_visits(id,project_id,document_id,owner_id,publication_id,visitor_hash,origin,occurred_at) values($1,$5,$6,$7,$8,repeat('a',64),'https://qa.example','2020-01-01T05:00:00Z'),($2,$5,$6,$7,$8,repeat('a',64),'https://qa.example','2020-01-02T04:59:59.999999Z'),($3,$5,$6,$7,$8,repeat('a',64),'https://qa.example','2020-01-01T04:59:59.999999Z'),($4,$5,$6,$7,$8,repeat('a',64),'https://qa.example','2020-01-02T05:00:00Z')",[visit,lastVisit,earlyVisit,nextVisit,projectId,documentId,owner,pub]);
  await db.query("insert into public.reader_reinforcement_opens values(gen_random_uuid(),$1,$2,$3,$4,$5,$6,1,'Energía','2020-01-01T06:00:00Z'),(gen_random_uuid(),$1,$7,$3,$4,$5,$6,1,'Energía','2020-01-02T04:59:59.999999Z')",[ref,earlyVisit,projectId,documentId,owner,pub,visit]);
  await db.query("insert into public.reader_reinforcement_feedback(id,publication_id,project_id,document_id,owner_id,reinforcement_id,page_number,title,reader_id,rating,comment,created_at) values(gen_random_uuid(),$1,$2,$3,$4,$5,1,'Energía',gen_random_uuid(),'useful','PRIVATE_COMMENT','2020-01-01T12:00:00Z'),(gen_random_uuid(),$1,$2,$3,$4,$5,1,'Energía',gen_random_uuid(),'unclear','','2020-01-02T04:59:59.999999Z')",[pub,projectId,documentId,owner,ref]);
  await db.query("insert into public.quiz_reader_attempts(id,publication_id,quiz_version_id,owner_id,reader_id,publication_hash,attempt_number,answers,score,total,feedback,input_hash,created_at) select gen_random_uuid(),$1,$2,$3,gen_random_uuid(),repeat('b',64),1,'[0]',1,1,'{}',repeat('c',64),'2020-01-01T12:00:00Z' from generate_series(1,10001)",[pub,quiz,owner]);
  await db.query("insert into public.quiz_reader_attempts(id,publication_id,quiz_version_id,owner_id,reader_id,publication_hash,attempt_number,answers,score,total,feedback,input_hash,created_at) values(gen_random_uuid(),$1,$2,$3,gen_random_uuid(),repeat('f',64),1,'[0]',1,1,'{}',repeat('c',64),'2020-01-01T12:00:00Z'),(gen_random_uuid(),$1,$2,$3,gen_random_uuid(),repeat('b',64),1,'[0]',1,1,'{}',repeat('c',64),'2020-01-02T05:00:00Z')",[pub,quiz,owner]);
  await db.query("insert into public.quiz_practice_attempts select * from public.quiz_reader_attempts limit 1");
  await db.query("insert into public.reader_reinforcement_feedback(id,publication_id,project_id,document_id,owner_id,reinforcement_id,page_number,title,reader_id,rating,created_at) values(gen_random_uuid(),$1,$2,$3,$4,$5,1,'Ajeno',gen_random_uuid(),'unclear','2020-01-01T12:00:00Z')",[otherPub,otherProject,otherDocument,other,ref]);
  async function role(user=owner,name='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role '+name);}
  async function get(from='2020-01-01',to=from,through='2020-01-03T00:00:00Z',p=projectId,d=documentId){return(await db.query('select public.get_document_analytics($1,$2,$3,$4,$5) result',[p,d,from,to,through])).rows[0].result;}
  await role();let result=await get();assert.equal(schema.documentAnalyticsSchema.safeParse(result).success,true);assert.deepEqual(result.totals,{visits:2,opens:2,quizAttempts:10001,correctAnswers:10001,answeredQuestions:10001,accuracy:100,feedback:2,useful:1,unclear:1,excludedQuizAttempts:1});
  assert.equal(result.quizzes[0].attempts,10001);assert.equal(result.reinforcements[0].opens,2);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_COMMENT|reader_id|visitor_hash/);
  const early=await get('2020-01-01','2020-01-01','2020-01-01T11:59:59.999Z');assert.equal(early.totals.quizAttempts,0);assert.equal(early.totals.feedback,0);
  const next=await get('2020-01-02');assert.equal(next.totals.visits,1);assert.equal(next.totals.quizAttempts,1);assert.equal(next.totals.feedback,0);assert.equal(next.totals.opens,0);
  const empty=await get('2010-01-01');assert.equal(empty.totals.accuracy,null);assert.equal(empty.totals.visits+empty.totals.opens+empty.totals.quizAttempts+empty.totals.feedback,0);
  await assert.rejects(get('2020-01-03','2020-01-01'),e=>e.code==='23514');await assert.rejects(get('2020-01-01','2020-01-01','9999-01-01T00:00:00Z'),e=>e.code==='23514');
  await assert.rejects(get('2020-01-01','2020-01-01',undefined,otherProject,otherDocument),e=>e.code==='PT404');
  await role(other);await assert.rejects(get(),e=>e.code==='PT404');await role('','anon');await assert.rejects(get(),e=>e.code==='42501');
  await db.exec('reset role');await db.query('update public.projects set status=$1 where id=$2',['deleting',projectId]);await role();await assert.rejects(get(),e=>e.code==='PT404');
  await db.exec('reset role');await db.query('update public.projects set status=$1 where id=$2',['ready',projectId]);await db.query('update public.profiles set is_active=false where id=$1',[owner]);await role();await assert.rejects(get(),e=>e.code==='42501');
  await db.exec('reset role');await db.query('update public.profiles set is_active=true where id=$1',[owner]);await db.query('delete from public.documents where id=$1',[documentId]);
  for(const table of ['reader_open_visits','reader_reinforcement_opens','quiz_reader_attempts','quiz_practice_attempts','reader_reinforcement_feedback'])assert.equal((await db.query('select count(*) count from public.'+table+' where owner_id=$1',[owner])).rows[0].count,0);
  await role();await assert.rejects(get(),e=>e.code==='PT404');
 }finally{await db.close();}
});
