import assert from 'node:assert/strict';
import test from 'node:test';
import {load,schemas,analysisSchemas,analysis,context,diagnosis,summary,record,reviewSchemas} from './summary-test-helpers.mjs';
const head={request_id:record.id,current_version:2,decision:'pending',approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.updated_at};
function fixture(settings={}){
 const calls=[];const db={from(table){return {select(){return this},eq(){return this},async maybeSingle(){return {data:table==='reinforcement_summaries'?{mode:'compact'}:{...analysis,status:'ready',context,diagnosis,model:'test-model',finished_at:analysis.started_at},error:settings.readError}}}},
 async rpc(name,args){calls.push({name,args});return settings.error?{error:{code:settings.error}}:{data:head}}};
 const service=load('lib/reinforcements/summary-review-service.ts',{'@/lib/reinforcements/request-service':{authorizeRequest:async()=>settings.access??{db,userId:record.owner_id,row:record},readSmallJson:async request=>({body:await request.json()}),reply:(body,status=200)=>Response.json(body,{status})},
 '@/lib/documents/mutation-request':load('lib/documents/mutation-request.ts'),'@/lib/validations/example':reviewSchemas,'@/lib/validations/summary':schemas,'@/lib/validations/contextual-analysis':analysisSchemas});
 return {calls,post:(body,origin='http://localhost:3000')=>service.postSummaryReview(new Request('http://localhost:3000/api/summary/review',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({documentId:record.document_id,expectedVersion:1,operationId:record.id,...body})}),record.project_id,record.id)};
}
test('summary edits normalize grounded concepts, sign no provider call, and save only a pending version',async()=>{
 const f=fixture(),response=await f.post({action:'edit',title:summary.title,text:summary.text,concepts:[...summary.concepts,{name:'ENERGIA',sourceQuote:context.selectedText},{name:'',sourceQuote:''}]});assert.equal(response.status,200);assert.equal((await response.json()).review.decision,'pending');
 assert.equal(f.calls[0].name,'review_reinforcement_summary');assert.equal(f.calls[0].args.p_concepts.length,2);assert.equal(f.calls[0].args.p_expected_version,1);assert.equal(f.calls[0].args.p_action,'edit');
});
test('summary edits reject unsupported or missing concepts, wrong extent and unavailable source before persistence',async()=>{
 for(const extra of [{text:'a'.repeat(351)},{concepts:[]},{concepts:[{name:'temperatura',sourceQuote:context.selectedText}]},{concepts:[{name:'energía',sourceQuote:'Cita de otra página.'}]}]){
 const f=fixture();assert.equal((await f.post({action:'edit',title:summary.title,text:summary.text,concepts:summary.concepts,...extra})).status,400);assert.equal(f.calls.length,0);}
 const unavailable=fixture({readError:{code:'unknown'}});assert.equal((await unavailable.post({action:'edit',title:summary.title,text:summary.text,concepts:summary.concepts})).status,503);assert.equal(unavailable.calls.length,0);
});
test('review requires a session, same origin, a known action and explicit confirmation; stale server versions return safe errors',async()=>{
 const f=fixture();assert.equal((await f.post({action:'approve'})).status,400);assert.equal((await f.post({action:'approve',confirmed:true},'https://foreign.example')).status,403);assert.equal(f.calls.length,0);
 const denied=fixture({access:{response:Response.json({message:'Sesión requerida'},{status:401})}});assert.equal((await denied.post({action:'approve',confirmed:true})).status,401);assert.equal(denied.calls.length,0);
 for(const [error,status] of [['PT409',409],['42501',403],['P0001',429],['unknown',503]])assert.equal((await fixture({error}).post({action:'approve',confirmed:true})).status,status);
});
