import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
const schemas=load('lib/validations/quiz-results.ts'),aggregate=load('lib/readers/quiz-results.ts',{'@/lib/validations/quiz-results':schemas});
function fixture(){
 const publication=randomUUID(),quiz=randomUUID(),reader=randomUUID(),second=randomUUID(),hash='a'.repeat(64);
 const content={title:'Quiz original',allowRetries:true,questions:[{prompt:'Primera pregunta original',options:['A','B'],correctIndex:0,explanation:'Explicación original de la primera pregunta.'},{prompt:'Segunda pregunta original',options:['X','Y','Z'],correctIndex:1,explanation:'Explicación original de la segunda pregunta.'}]};
 const pub={id:publication,ownerId:owner,version:5,hash,snapshot:{requireIdentification:false,items:[{pageNumber:1,quiz:{id:quiz,version:2,content}}]}};
 function attempt(answers=[0,0],number=1,participant=reader){const questions=content.questions.map((q,i)=>({correct:answers[i]===q.correctIndex,correctOption:q.options[q.correctIndex],explanation:q.explanation})),score=questions.filter(q=>q.correct).length;return{id:randomUUID(),publication_id:publication,quiz_version_id:quiz,owner_id:owner,reader_id:participant,publication_hash:hash,attempt_number:number,answers,score,total:2,feedback:{score,total:2,questions},created_at:new Date().toISOString()};}
 return{pub,attempt,reader,second,quiz};
}
const consolidate=(f,rows,page=1,pubs=[f.pub])=>aggregate.consolidateQuizResults(pubs,rows,new Date().toISOString(),page,id=>'Lector '+id.slice(0,8));
test('HU039 UI removes previously authorized answers when the next query loses authorization',async()=>{
 const f=fixture(),data=consolidate(f,[f.attempt()]),states=[],effects=[];let cursor=0,tree,status=200;
 const api=load('components/documents/quiz-results-panel.tsx',{react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect:fn=>effects.push(fn)},'@/lib/validations/quiz-results':schemas},{fetch:async()=>Response.json(status===200?data:{message:'Unauthorized'},{status})});
 function nodes(n){return !n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}function render(){cursor=0;tree=api.QuizResultsPanel({projectId,documentId});}
 render();nodes(tree).find(n=>n.type==='button').props.onClick();render();effects.pop()();await new Promise(r=>setImmediate(r));render();assert.equal(nodes(tree).filter(n=>n.type==='details').length,2);
 status=401;effects.pop()();await new Promise(r=>setImmediate(r));render();assert.equal(nodes(tree).filter(n=>n.type==='details').length,0);assert.match(nodes(tree).find(n=>n.props?.role==='alert').props.children,/iniciar sesión/);
});
test('HU039 consolidates the original attempts and per-question answers including retries, without mutating results or exposing raw reader identities',()=>{
 const f=fixture(),rows=[f.attempt(),f.attempt([0,1],2),f.attempt([1,1],1,f.second)],before=JSON.stringify(rows),result=consolidate(f,rows),g=result.groups[0];
 assert.equal(result.totalAttempts,3);assert.equal(g.participants,2);assert.equal(g.attempts,3);assert.deepEqual([...g.questions].map(q=>q.correct),[2,2]);assert.deepEqual([...g.questions].map(q=>q.percentage),[66.67,66.67]);assert.deepEqual([...g.questions[0].optionCounts],[2,1]);assert.deepEqual([...g.questions[1].optionCounts],[1,2,0]);
 assert.equal(JSON.stringify(rows),before);assert.ok(!JSON.stringify(result).includes(f.reader));assert.ok(!JSON.stringify(result).includes(f.second));assert.ok(!JSON.stringify(result).includes(owner));assert.equal(result.excluded,0);
});
test('HU039 later quiz/publication versions never regrade the historical score, and empty versions have safe zeros',()=>{
 const f=fixture(),row=f.attempt([0,0]),newPub=structuredClone(f.pub);newPub.id=randomUUID();newPub.version=6;newPub.snapshot.requireIdentification=true;newPub.snapshot.items[0].quiz.version=3;newPub.snapshot.items[0].quiz.content.questions[0].correctIndex=1;
 const result=consolidate(f,[row],1,[f.pub,newPub]);assert.equal(result.attempts[0].score,1);assert.equal(result.groups[0].questions[0].correct,1);assert.equal(result.groups[1].attempts,0);assert.equal(result.groups[1].questions[0].percentage,0);assert.equal(result.groups[1].identificationRequired,true);
});
test('HU039 inconsistent scores, answers, feedback, owner/hash and foreign quizzes are flagged and excluded, never silently repaired',()=>{
 const f=fixture(),base=f.attempt();const corrupt=[{score:2},{answers:[4,0]},{owner_id:other},{publication_hash:'f'.repeat(64)},{quiz_version_id:randomUUID()},{feedback:{...base.feedback,questions:[{...base.feedback.questions[0],explanation:'Texto alterado'},base.feedback.questions[1]]}}].map(change=>({...structuredClone(base),id:randomUUID(),...change}));
 const result=consolidate(f,corrupt);assert.equal(result.totalAttempts,0);assert.equal(result.excluded,corrupt.length);assert.equal(result.groups[0].questions[0].answers,0);
});
test('HU039 repeated rows and duplicate attempt numbers cannot inflate counts, and the detail is paginated independently of complete aggregates',()=>{
 const f=fixture(),rows=Array.from({length:41},(_,i)=>f.attempt([0,1],i+1));rows[0].created_at='2026-11-01T01:00:00-05:00';rows[1].created_at='2026-11-01T05:30:00Z';
 let result=consolidate(f,[...rows,rows[0],{...rows[0],id:randomUUID()}],3);assert.equal(result.totalAttempts,41);assert.equal(result.duplicatesIgnored,1);assert.equal(result.excluded,1);assert.equal(result.pages,3);assert.equal(result.attempts.length,1);assert.equal(result.groups[0].questions[0].answers,41);assert.equal(result.attempts[0].id,rows[1].id);
 result=consolidate(f,[],999);assert.equal(result.page,1);assert.equal(result.totalAttempts,0);assert.equal(result.groups[0].questions[0].percentage,0);
});
test('HU039 owner API reads only reader attempts, rejects unauthorized/stale/deleting documents and does not provide an admin bypass',async()=>{
 const f=fixture(),rows=[f.attempt()];let access={ok:true,userId:owner,role:'owner'},documentAvailable=true,deleting=false,replaced=false,projectReads=0;const tables=[];
 const db={from(table){tables.push(table);const filters={};let start=0,end=499;
  return {select(){return this},eq(k,v){filters[k]=v;return this},not(){return this},lte(){return this},in(){return this},order(){return this},range(a,b){start=a;end=b;return this},
   async maybeSingle(){if(table==='projects'){projectReads++;return{data:filters.owner_id===owner?{document_id:replaced&&projectReads>1?other:documentId,status:deleting?'deleting':'ready'}:null};}return{data:documentAvailable?{id:documentId,status:'uploaded'}:null};},
   then(resolve){resolve({data:table==='experience_publications'?[{id:f.pub.id,owner_id:owner,version:5,snapshot:f.pub.snapshot,snapshot_hash:f.pub.hash}]:rows.slice(start,end+1),error:null});},
  };}};
 const previous=process.env.REINFORCEMENT_REQUEST_SECRET;process.env.REINFORCEMENT_REQUEST_SECRET='a'.repeat(64);
 try{
  const api=load('lib/readers/quiz-results-service.ts',{'@/lib/auth/access':{checkPermission:async()=>access},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/reinforcements/request-service':{reply:(b,s=200)=>Response.json(b,{status:s})},'@/lib/readers/model':{readerSnapshotSchema:{parse:v=>v},validateSnapshotSources(){}},'@/lib/readers/quiz-results':aggregate});
  const query=(doc=documentId,page=1)=>{projectReads=0;return api.getQuizResults(new Request(`https://qa.example/api/projects/${projectId}/quiz-results?documentId=${doc}&page=${page}`),projectId);};
  let r=await query();assert.equal(r.status,200);let body=await r.json();assert.equal(body.totalAttempts,1);assert.match(body.attempts[0].participant,/^Lector [a-f0-9]{12}$/);assert.ok(!JSON.stringify(body).includes(f.reader));assert.ok(tables.every(t=>t!=='quiz_practice_attempts'));
  access={ok:false,status:401,message:'Login'};assert.equal((await query()).status,401);access={ok:false,status:403,message:'Inactive'};assert.equal((await query()).status,403);
  access={ok:true,userId:other,role:'owner'};assert.equal((await query()).status,404);access={...access,role:'admin'};assert.equal((await query()).status,404);access={ok:true,userId:owner,role:'owner'};
  assert.equal((await query(other)).status,409);assert.equal((await query(documentId,0)).status,400);documentAvailable=false;assert.equal((await query()).status,409);documentAvailable=true;deleting=true;assert.equal((await query()).status,409);deleting=false;replaced=true;assert.equal((await query()).status,409);
 }finally{if(previous===undefined)delete process.env.REINFORCEMENT_REQUEST_SECRET;else process.env.REINFORCEMENT_REQUEST_SECRET=previous;}
});
