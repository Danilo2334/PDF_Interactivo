import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { load, record } from './summary-test-helpers.mjs';
import { schemas as reviews } from './example-test-helpers.mjs';
const schemas=load('lib/validations/quiz.ts',{'@/lib/validations/example':reviews});
const source={versionId:randomUUID(),requestId:record.id,documentId:record.document_id,pageNumber:1,title:'Conservación de la energía',text:'La energía total se conserva en un sistema aislado. No se pierde al transformarse en otra forma de energía; su cantidad total permanece constante.',concepts:['energía'],hash:'a'.repeat(64)};
const content={title:'Quiz del refuerzo seleccionado',allowRetries:false,questions:[{prompt:'¿Qué ocurre con la energía total?',options:['Se conserva.','Desaparece.'],correctIndex:0,explanation:'El refuerzo explica que la energía total se conserva en un sistema aislado.',sourceQuote:'La energía total se conserva en un sistema aislado.'}]};
const head={request_id:record.id,choice:'generate',choice_version:1,target_source_version_id:source.versionId,current_version:0,decision:'pending',approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.created_at};
const input={action:'generate',documentId:record.document_id,sourceVersionId:source.versionId,operationId:randomUUID(),choiceVersion:1,expectedVersion:0,questionCount:1};
const job={operation_id:input.operationId,request_id:record.id,source_version_id:source.versionId,expected_version:0,question_count:1,status:'ready',started_at:record.created_at,lease_expires_at:'2099-01-01T00:00:00Z',finished_at:record.created_at,result_version:1,error_code:null,model:'isolated-test'};
function fixture(options={}){
  const calls=[],ai=[];class QuizFailure extends Error{constructor(code,quotaExhausted=false){super(code);this.code=code;this.quotaExhausted=quotaExhausted;}}
  const db={from(table){return{select(){return this},eq(){return this},order(){return this},limit:async()=>({data:[],error:null}),maybeSingle:async()=>({data:table==='reinforcement_quiz_heads'?head:null,error:null})}},
    async rpc(name,args){calls.push({name,args});if(options.rpcThrow)throw Error('network');if(options.rpcError)return{error:{code:options.rpcError}};
      if(name==='get_reinforcement_quiz_source')return{data:source};const proof=JSON.parse(args.p_payload);
      if(proof.action==='start')return{data:{disposition:options.disposition??'started',source:options.wrongSource?{...source,requestId:randomUUID()}:source,previous:options.previous?content:null,job:options.disposition==='busy'?null:job}};
      if(proof.action==='finish')return{data:{job:proof.status==='ready'?job:{...job,status:'error',result_version:null,model:null,error_code:proof.errorCode}}};return{data:{head}};
    }};
  const service=load('lib/reinforcements/quiz-service.ts',{
    '@/lib/reinforcements/request-service':{authorizeRequest:async()=>options.denied?{response:new Response('{}',{status:options.denied})}:{db,userId:record.owner_id,row:record},readSmallJson:async r=>({body:await r.json()}),reply:(data,status=200)=>Response.json(data,{status})},
    '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('Origin')==='http://localhost'},'@/lib/validations/quiz':schemas,
    '@/lib/reinforcements/quiz-proof':{signQuizProof:p=>({p_payload:JSON.stringify(p),p_signature:'isolated-test'})},
    '@/lib/reinforcements/quiz-provider':{getQuizConfiguration:()=>options.unavailable?null:{provider:'gemini',key:'isolated-key',model:'gemini-test'},QuizFailure,
      generateQuiz:async(...args)=>{ai.push(args);if(options.providerError)throw new QuizFailure(options.providerError,options.quota??false);return{content,model:'isolated-test'}}},
  });
  const url='http://localhost/quiz?documentId='+record.document_id+'&sourceVersionId='+source.versionId;
  return{calls,ai,get:()=>service.getQuiz(new Request(url),record.project_id,record.id),post:(body=input,origin='http://localhost')=>service.postQuiz(new Request(url,{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)}),record.project_id,record.id)};
}
test('HU028 private quiz endpoint checks origin/session/approval/count before provider calls, and omitting never requires Gemini',async()=>{
  const f=fixture();assert.equal((await f.post(input,'https://foreign.invalid')).status,403);
  for(const questionCount of [0,4])assert.equal((await f.post({...input,questionCount})).status,400);
  assert.equal((await f.post({action:'approve',documentId:record.document_id,sourceVersionId:source.versionId,operationId:randomUUID(),expectedVersion:1,confirmed:false})).status,400);assert.equal(f.ai.length,0);
  for(const denied of [401,403,404,409]){const g=fixture({denied});assert.equal((await g.post()).status,denied);assert.equal((await g.get()).status,denied);assert.equal(g.calls.length,0);}
  const offline=fixture({unavailable:true});assert.equal((await offline.post()).status,503);
  assert.equal((await offline.post({action:'choose',documentId:record.document_id,sourceVersionId:source.versionId,operationId:randomUUID(),choice:'omit',choiceVersion:0})).status,200);assert.equal(offline.ai.length,0);
});
test('HU028 only one claimed operation generates from the persisted source and retains the operation identity through finish',async()=>{
  const f=fixture({previous:true});assert.equal((await f.post()).status,200);assert.equal(f.ai.length,1);assert.deepEqual(f.ai[0][0],source);assert.equal(f.ai[0][1],1);assert.deepEqual(f.ai[0][4],content);
  const proofs=f.calls.map(c=>JSON.parse(c.args.p_payload));assert.deepEqual(proofs.map(p=>p.action),['start','finish']);assert.equal(proofs[0].inputHash,proofs[1].inputHash);assert.equal(proofs[0].operationId,proofs[1].operationId);
  for(const [disposition,status]of [['busy',202],['cached',200]]){const cached=fixture({disposition});assert.equal((await cached.post()).status,status);assert.equal(cached.ai.length,0);assert.equal(cached.calls.length,1);}
  const wrong=fixture({wrongSource:true});assert.equal((await wrong.post()).status,200);assert.equal(wrong.ai.length,0);assert.equal(JSON.parse(wrong.calls.at(-1).args.p_payload).errorCode,'invalid_quiz');
});
test('HU028 failures persist an explicit error without another provider or automatic retry',async()=>{
  for(const code of ['timeout','invalid_quiz','insufficient_quiz','provider_refused']){const f=fixture({providerError:code});const response=await f.post();assert.equal(response.status,200);assert.equal((await response.json()).job.error_code,code);assert.equal(f.ai.length,1);}
  const quota=fixture({providerError:'provider_unavailable',quota:true});assert.equal((await quota.post()).status,429);assert.equal(quota.ai.length,1);
  for(const [code,status]of [['PT409',409],['42501',403],['P0001',429]])assert.equal((await fixture({rpcError:code}).post()).status,status);
  assert.equal((await fixture({rpcThrow:true}).post()).status,503);
});
test('HU028 GET reads the source, choice and private history without creating a draft or calling AI',async()=>{
  const f=fixture(),response=await f.get();assert.equal(response.status,200);const body=await response.json();assert.equal(body.source.requestId,record.id);assert.equal(body.head.current_version,0);assert.deepEqual(body.versions,[]);assert.equal(body.approvedVersion,null);
  assert.equal(f.ai.length,0);assert.deepEqual(f.calls.map(c=>c.name),['get_reinforcement_quiz_source']);
});

test('HU029 owner configuration rejects incomplete options, missing/extra correct answers and blank private text before any database mutation',async()=>{
  const f=fixture(),edit={action:'edit',documentId:record.document_id,sourceVersionId:source.versionId,operationId:randomUUID(),expectedVersion:1,content};
  for(const change of [q=>q.options=['Only one'],q=>q.options=['A',' '],q=>q.options=['Same','same'],q=>delete q.correctIndex,q=>q.correctIndex=-1,q=>q.correctIndex=4,q=>q.correctIndices=[0,1],q=>q.prompt='   ',q=>q.explanation='   ']){
    const invalid=structuredClone(edit);change(invalid.content.questions[0]);assert.equal((await f.post(invalid)).status,400);
  }
  assert.equal(f.calls.length,0);assert.equal(f.ai.length,0);
  for(const allowRetries of [true,false]){const value=structuredClone(edit);value.content.allowRetries=allowRetries;assert.equal((await f.post(value)).status,200);const proof=JSON.parse(f.calls.at(-1).args.p_payload);assert.equal(proof.content.allowRetries,allowRetries);assert.deepEqual(proof.content.questions,content.questions);}
  const other=fixture({denied:404});assert.equal((await other.post(edit)).status,404);assert.equal(other.calls.length,0);
});
