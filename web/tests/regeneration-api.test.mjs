import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { load, context, diagnosis, analysis, record } from './summary-test-helpers.mjs';
import { schemas as exampleSchemas } from './example-test-helpers.mjs';
import { schemas as explanationSchemas, explanation, generation } from './explanation-test-helpers.mjs';
import { schemas as summarySchemas } from './summary-test-helpers.mjs';
import { schemas as visualSchemas } from './visual-test-helpers.mjs';
const schemas=load('lib/validations/regeneration.ts',{'@/lib/validations/example':exampleSchemas});
const body={action:'regenerate',documentId:record.document_id,expectedVersion:1,instructions:'Aclara la transformación, conservando el alcance.',operationId:randomUUID()};
const job={operation_id:body.operationId,request_id:record.id,actor_id:record.owner_id,expected_version:1,instructions:body.instructions,status:'ready',started_at:analysis.started_at,
  lease_expires_at:analysis.lease_expires_at,finished_at:analysis.updated_at,result_version:2,model:'test-only',error_code:null};
function fixture(options={}){
  const calls=[],providerCalls=[];
  const db={from(table){return {select(){return this},eq(){return this},async maybeSingle(){return {data:table==='reinforcement_analyses'?(options.insufficient?{...analysis,context:{...context,enough:false}}:{...analysis,status:'ready',context,diagnosis}):{recommendation_choice_version:1},error:null}}}},
    async rpc(name,proof){calls.push({name,proof});if(options.rpcThrow)throw Error('unavailable');if(options.rpcError)return {error:{code:options.rpcError}};
      return {data:name==='prepare_explanation_review'?{}:proof.action==='start'?{disposition:options.disposition??'started',job,kind:'explanation',generation:{...generation,status:'ready',content:explanation},previous:explanation}:{job},error:null}}};
  const service=load('lib/reinforcements/regeneration-service.ts',{
    '@/lib/reinforcements/request-service':{authorizeRequest:async()=>options.denied?{response:new Response('{}',{status:options.denied})}:{db,userId:record.owner_id,row:record},readSmallJson:async request=>({body:await request.json()}),reply:(data,status=200)=>Response.json(data,{status})},
    '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('Origin')==='http://localhost'},
    '@/lib/validations/regeneration':schemas,'@/lib/validations/contextual-analysis':{analysisRecordSchema:{safeParse:data=>({success:true,data})},validateDiagnosis(){}},
    '@/lib/validations/explanation':explanationSchemas,'@/lib/validations/example':exampleSchemas,'@/lib/validations/summary':summarySchemas,'@/lib/validations/visual':visualSchemas,
    '@/lib/reinforcements/gemini-provider':{getGeminiConfiguration:()=>options.unavailable?null:{model:'test-only'}},
    '@/lib/reinforcements/explanation-provider':{async generateExplanation(...args){providerCalls.push(args);if(options.providerError)throw options.providerError;return {content:explanation,model:'test-only'}}},
    '@/lib/reinforcements/example-provider':{},'@/lib/reinforcements/summary-provider':{},'@/lib/reinforcements/visual-provider':{},
    '@/lib/reinforcements/regeneration-proof':{signRegenerationProof:value=>value},
  });
  const run=(input=body,origin='http://localhost')=>service.postRegeneration(new Request('http://localhost/api',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)}),record.project_id,record.id);
  return {run,calls,providerCalls};
}
test('regeneration rejects foreign origins, invalid instructions, unauthenticated access and insufficient context before spending',async()=>{
  const f=fixture();assert.equal((await f.run(body,'https://foreign.example')).status,403);assert.equal((await f.run({...body,instructions:' '})).status,400);
  for(const denied of [401,403,404,409])assert.equal((await fixture({denied}).run()).status,denied);
  assert.equal((await fixture({insufficient:true}).run()).status,409);assert.equal(f.providerCalls.length,0);
});
test('a busy/cached operation never calls AI again; prepare review works during provider outage',async()=>{
  for(const disposition of ['busy','cached']){const f=fixture({disposition});assert.equal((await f.run()).status,disposition==='busy'?202:200);assert.equal(f.providerCalls.length,0)}
  const f=fixture({unavailable:true});assert.equal((await f.run()).status,503);assert.equal((await f.run({action:'prepare',documentId:record.document_id})).status,200);assert.equal(f.providerCalls.length,0);
  assert.equal((await fixture({rpcThrow:true}).run({action:'prepare',documentId:record.document_id})).status,503);
});
test('one claimed generation receives persisted previous version and bounded instructions and saves one independent result',async()=>{
  const f=fixture();assert.equal((await f.run()).status,200);assert.equal(f.providerCalls.length,1);
  const args=f.providerCalls[0];assert.deepEqual(args[0],context);assert.deepEqual(JSON.parse(JSON.stringify(args[5])),{instructions:body.instructions,previous:explanation});
  assert.deepEqual(Array.from(f.calls,c=>c.proof.action),['start','finish']);assert.equal(f.calls[1].proof.status,'ready');assert.equal(f.calls[0].proof.attemptId,f.calls[1].proof.attemptId);
});
test('quota, timeout and malformed outputs are persisted safely without provider retries or publication',async()=>{
  for(const code of ['provider_unavailable','timeout','invalid_explanation']){const f=fixture({providerError:{code,quotaExhausted:code==='provider_unavailable'}});assert.equal((await f.run()).status,code==='provider_unavailable'?429:200);assert.equal(f.providerCalls.length,1);assert.equal(f.calls.at(-1).proof.status,'error');assert.equal(f.calls.at(-1).proof.content,null)}
  for(const [rpcError,status] of [['PT409',409],['42501',403],['P0001',429]]){const f=fixture({rpcError});assert.equal((await f.run()).status,status);assert.equal(f.providerCalls.length,0)}
});
