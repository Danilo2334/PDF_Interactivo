import assert from 'node:assert/strict';
import test from 'node:test';
import { owner, projectId, documentId, receipt, requestSchemas } from './analysis-test-helpers.mjs';
import { load, schemas, analysisSchemas, context, diagnosis, record, analysis, example, generation, provider } from './example-test-helpers.mjs';
function fixture(settings={}){
  const rpc=[];let calls=0;
  const ready={...analysis,status:'ready',context,diagnosis,model:'test-model',finished_at:analysis.started_at};
  const db={from(table){let columns;return {select(c){columns=c;return this},eq(){return this},order(){return this},async limit(){return {data:[]}},async maybeSingle(){
    if(table==='projects')return {data:settings.project===undefined?{document_id:documentId,status:'pending'}:settings.project};
    if(table==='reinforcement_requests')return {data:columns.startsWith('recommended_type')?{recommended_type:'example',recommendation_choice_version:1}
      :{...record,status:settings.state??'pending',stage:settings.stage??'choosing'}};
    if(table==='reinforcement_analyses')return {data:settings.analysis===undefined?ready:settings.analysis};
    if(table==='reinforcement_review_heads')return {data:null}; return {data:settings.generation??generation};
  }}},async rpc(name,args){const input=JSON.parse(args.p_payload);rpc.push({name,input});if(settings.rpcError)return {error:{code:settings.rpcError}};
    return {data:{disposition:input.action==='start'?settings.disposition??'started':'saved',generation:input.action==='finish'
      ?{...generation,status:input.status,content:input.content,model:input.model,error_code:input.errorCode}
      :{...generation,mode:input.mode??generation.mode}}};
  }};
  const access=load('lib/reinforcements/request-service.ts',{'@/lib/auth/access':{checkPermission:async()=>settings.access??{ok:true,userId:owner}},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/validations/request-list':requestSchemas});
  const service=load('lib/reinforcements/run-example.ts',{'@/lib/reinforcements/request-service':access,
    '@/lib/documents/mutation-request':load('lib/documents/mutation-request.ts'),'@/lib/validations/contextual-analysis':analysisSchemas,
    '@/lib/validations/example':schemas,'@/lib/reinforcements/example-proof':{signExampleProof:input=>({p_payload:JSON.stringify(input),p_signature:'unit-test'})},
    '@/lib/reinforcements/example-provider':{...provider,getExampleConfiguration:()=>settings.configured===false?null:{key:'unit-test',model:'test-model'},
      generateExample:async(c,d,l)=>{calls++;assert.equal(c.selectedText,context.selectedText);assert.equal(d.topic,diagnosis.topic);assert.equal(l,'practical');
        if(settings.failure)throw new provider.ExampleFailure(settings.failure,settings.quota);return {content:example,model:'test-model'};}},
  });
  const url=`http://localhost:3000/api/projects/${projectId}/reinforcement-requests/${receipt.id}/example`;
  return {rpc,calls:()=>calls,get:()=>service.getExample(new Request(`${url}?documentId=${documentId}`),projectId,receipt.id),
    post:(body={},origin='http://localhost:3000')=>service.postExample(new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({documentId,expectedVersion:1,choiceVersion:1,action:'generate',...body})}),projectId,receipt.id)};
}
test('generation API blocks anonymous/inactive/foreign/version/cross-origin access before the provider',async()=>{
  const cross=fixture();assert.equal((await cross.post({},'https://foreign.example')).status,403);assert.equal(cross.rpc.length,0);
  for(const [settings,status] of [[{access:{ok:false,status:401,message:'Sesión requerida'}},401],[{access:{ok:false,status:403,message:'Inactivo'}},403],
    [{project:null},404],[{project:{document_id:receipt.id,status:'pending'}},409],[{analysis:null},409],[{configured:false},503]]){
    const f=fixture(settings);assert.equal((await f.post()).status,status);assert.equal(f.calls(),0);assert.equal(f.rpc.length,0);
  }
  for(const extra of [{mode:'analogy'},{status:'approved'},{expectedVersion:-1},{choiceVersion:0}])assert.equal((await fixture().post(extra)).status,400);
});
test('saving detail works without Gemini, and generation uses the saved mode and the same attempt for claim/finish',async()=>{
  const configure=fixture({configured:false});assert.equal((await configure.post({action:'configure',mode:'analogy'})).status,200);assert.equal(configure.calls(),0);
  const f=fixture(),response=await f.post(),body=await response.json();assert.equal(body.generation.status,'ready');assert.equal(f.calls(),1);
  assert.equal(f.rpc[0].input.attemptId,f.rpc[1].input.attemptId);assert.equal(f.rpc[1].input.analysisAttemptId,analysis.attempt_id);
  assert.equal(body.generation.approval_status,'pending');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  for(const disposition of ['busy','cached']){const d=fixture({disposition});assert.equal((await d.post()).status,disposition==='busy'?202:200);assert.equal(d.calls(),0);}
});
test('errors cannot masquerade as saved content or publish it, and free quota is reported without automatic retry',async()=>{
  for(const code of schemas.EXAMPLE_FAILURES){const f=fixture({failure:code,quota:code==='provider_unavailable'}),response=await f.post(),body=await response.json();
    assert.equal(response.status,code==='provider_unavailable'?429:200);assert.equal(body.generation.status,'error');assert.equal(body.generation.content,null);assert.equal(f.calls(),1);}
  for(const [code,status] of [['PT409',409],['42501',403],['23514',409],['P0001',429],['PGRST202',503]]){const f=fixture({rpcError:code});assert.equal((await f.post()).status,status);assert.equal(f.calls(),0);}
});
test('GET disables edits after generation, retains a private result and never triggers provider calls',async()=>{
  const f=fixture({state:'generated',stage:'review',generation:{...generation,status:'ready',content:example}}),response=await f.get(),view=await response.json();
  assert.equal(view.canConfigure,false);assert.equal(view.canGenerate,false);assert.equal(view.generation.approval_status,'pending');assert.equal(f.calls(),0);
});
