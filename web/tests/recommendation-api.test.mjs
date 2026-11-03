import assert from 'node:assert/strict';
import test from 'node:test';
import { owner, projectId, documentId, receipt, requestSchemas } from './analysis-test-helpers.mjs';
import { load, schemas, analysisSchemas, context, diagnosis, record, analysis, result, options, provider } from './recommendation-test-helpers.mjs';

function fixture(settings={}) {
  const calls=[],rpc=[];let providerCalls=0;
  const selection={recommended_type:null,recommendation_reason:null,recommendation_attempt_id:null,recommendation_selected_at:null,recommendation_choice_version:0};
  const readyAnalysis={...analysis,status:'ready',context,diagnosis,model:'test-model',finished_at:analysis.started_at};
  const db={from(table){
    const call={table,filters:[]};calls.push(call);
    return {select(columns){call.columns=columns;return this},eq(key,value){call.filters.push([key,value]);return this},async maybeSingle(){
      if(table==='projects')return {data:settings.project===undefined?{document_id:documentId,status:'pending'}:settings.project};
      if(table==='reinforcement_requests')return {data:call.columns.startsWith('recommended_type')?{...selection,...settings.selection}
        :settings.record===undefined?{...record,status:'pending',stage:'choosing'}:settings.record};
      if(table==='reinforcement_analyses')return {data:settings.analysis===undefined?readyAnalysis:settings.analysis};
      return {data:settings.recommendations??null,error:settings.readError};
    }};
  },async rpc(name,args){
    const input=args.p_payload?JSON.parse(args.p_payload):args;rpc.push({name,input});
    if(settings.rpcError)return {error:{code:settings.rpcError}};
    if(name==='choose_reinforcement_option')return {data:{choiceVersion:input.p_expected_version+1,choice:{type:input.p_type,
      justification:options.find(o=>o.type===input.p_type).justification,attemptId:input.p_attempt_id,selectedAt:new Date().toISOString()}}};
    if(input.action==='start')return {data:{disposition:settings.disposition??'started',recommendations:{...result,attempt_id:input.attemptId}}};
    return {data:{disposition:'saved',recommendations:{...result,status:input.status,attempt_id:input.attemptId,options:input.options,
      empty_reason:input.emptyReason,error_code:input.errorCode,model:input.model,finished_at:new Date().toISOString()}}};
  }};
  const access=load('lib/reinforcements/request-service.ts',{
    '@/lib/auth/access':{checkPermission:async()=>settings.access??{ok:true,userId:owner}},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/validations/request-list':requestSchemas,
  });
  const service=load('lib/reinforcements/run-recommendations.ts',{
    '@/lib/reinforcements/request-service':access,'@/lib/documents/mutation-request':load('lib/documents/mutation-request.ts'),
    '@/lib/validations/contextual-analysis':analysisSchemas,'@/lib/validations/recommendations':schemas,
    '@/lib/reinforcements/recommendation-proof':{signRecommendationProof:input=>({p_payload:JSON.stringify(input),p_signature:'unit-test'})},
    '@/lib/reinforcements/recommendation-provider':{...provider,getRecommendationConfiguration:()=>settings.configured===false?null:{provider:'gemini',key:'unit-test',model:'test-model'},
      recommendReinforcement:async(c,d)=>{providerCalls++;assert.equal(c.selectedText,context.selectedText);assert.equal(d.topic,diagnosis.topic);
        if(settings.failure)throw new provider.RecommendationFailure(settings.failure,settings.quota);return {options:settings.options??options,model:'test-model'};}},
  });
  const url=`http://localhost:3000/api/projects/${projectId}/reinforcement-requests/${receipt.id}/recommendations`;
  return {calls,rpc,providerCalls:()=>providerCalls,
    get:()=>service.getRecommendations(new Request(`${url}?documentId=${documentId}`),projectId,receipt.id),
    post:(body={action:'recommend'},origin='http://localhost:3000')=>service.postRecommendations(new Request(url,{method:'POST',
      headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({documentId,...body})}),projectId,receipt.id),
  };
}
const choose={action:'choose',attemptId:result.attempt_id,type:'example',expectedVersion:0};

test('interactive advice cannot strand a request as a base format; the optional quiz follows a generated reinforcement',async()=>{
  const f=fixture();const response=await f.post({...choose,type:'interaction'});
  assert.equal(response.status,400);assert.match((await response.json()).message,/mini quiz es opcional/);
  assert.equal(f.rpc.length,0);assert.equal(f.providerCalls(),0);
});

test('recommendations persist a safe error and return a clear free-quota message without retrying Gemini',async()=>{
  const f=fixture({failure:'provider_unavailable',quota:true});const response=await f.post();const body=await response.json();
  assert.equal(response.status,429);assert.match(body.message,/cuota/);assert.equal(body.recommendations.status,'error');assert.equal(f.providerCalls(),1);
});

test('recommendation API rejects anonymous/inactive users, foreign projects, stale PDFs and cross-origin writes', async()=>{
  const foreign=fixture();assert.equal((await foreign.post(undefined,'https://evil.example')).status,403);assert.equal(foreign.calls.length,0);
  for(const [settings,status] of [[{access:{ok:false,status:401,message:'Sesión requerida'}},401],[{access:{ok:false,status:403,message:'Inactivo'}},403],
    [{project:null},404],[{project:{document_id:receipt.id,status:'pending'}},409],[{record:null},404]]){
    const f=fixture(settings);assert.equal((await f.post()).status,status);assert.equal(f.providerCalls(),0);assert.equal(f.rpc.length,0);
  }
});
test('a sufficient saved analysis is mandatory; absent provider configuration creates neither runs nor artificial suggestions', async()=>{
  for(const source of [null,{...analysis,status:'processing'},{...analysis,status:'insufficient',context:{...context,enough:false}}]){
    const f=fixture({analysis:source});assert.equal((await f.post()).status,409);assert.equal(f.rpc.length,0);
    assert.equal((await (await f.get()).json()).analysisReady,false);
  }
  const f=fixture({configured:false});assert.equal((await f.post()).status,503);assert.equal(f.rpc.length,0);assert.equal(f.providerCalls(),0);
  const response=await f.get();assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.equal((await response.json()).canRecommend,false);
});
test('the API uses the saved diagnosis and persists ordered options with the claim identity, never generated content',async()=>{
  const f=fixture(),response=await f.post(),body=await response.json();assert.equal(response.status,200);assert.equal(body.recommendations.status,'ready');
  assert.equal(f.providerCalls(),1);assert.equal(f.rpc.length,2);assert.equal(f.rpc[0].input.attemptId,f.rpc[1].input.attemptId);
  assert.equal(f.rpc[0].input.analysisAttemptId,analysis.attempt_id);assert.deepEqual(f.rpc[1].input.options.map(o=>o.type),['example','explanation']);
  assert.ok(f.calls.filter(c=>c.table==='projects'||c.table==='reinforcement_requests').every(c=>c.filters.some(([k,v])=>k==='owner_id'&&v===owner)));
  for(const disposition of ['busy','cached']){const d=fixture({disposition});assert.equal((await d.post()).status,disposition==='busy'?202:200);assert.equal(d.providerCalls(),0);assert.equal(d.rpc.length,1);}
});
test('no pertinent options and provider failures are distinct from success, and errors expose only controlled messages',async()=>{
  const empty=fixture({options:[]});const noOptions=await(await empty.post()).json();assert.equal(noOptions.recommendations.status,'empty');assert.match(noOptions.recommendations.empty_reason,/No se encontraron/);
  for(const failure of schemas.RECOMMENDATION_FAILURES){const f=fixture({failure});const body=await(await f.post()).json();assert.equal(body.recommendations.status,'error');assert.equal(body.recommendations.error_code,failure);assert.equal(body.recommendations.options.length,0);}
  for(const [code,status] of [['42501',403],['PT409',409],['40001',409],['23514',409],['P0001',429],['PGRST202',503]]){
    const f=fixture({rpcError:code});assert.equal((await f.post()).status,status);assert.equal(f.providerCalls(),0);
  }
});
test('owner choice works for stored options even during provider outage and never accepts a forged reason',async()=>{
  const f=fixture({configured:false});const saved=await(await f.post(choose)).json();assert.equal(saved.choice.type,'example');assert.equal(saved.choiceVersion,1);
  assert.equal(saved.choice.justification,options[0].justification);assert.equal(f.rpc[0].name,'choose_reinforcement_option');assert.equal(f.providerCalls(),0);
  for(const extra of [{justification:'mi razón falsa'},{status:'approved'},{expectedVersion:-1},{type:'video'}])
    assert.equal((await f.post({...choose,...extra})).status,400);
  assert.equal(f.rpc.length,1);
  for(const code of ['PT409','40001']){
    const stale=fixture({rpcError:code}), response=await stale.post(choose), body=await response.json();
    assert.equal(response.status,409);assert.match(body.message,/Actualiza las opciones/);
    assert.equal(stale.rpc.length,1);assert.equal(stale.rpc[0].name,'choose_reinforcement_option');assert.equal(stale.providerCalls(),0);
    assert.equal(body.choice,undefined);assert.equal(body.choiceVersion,undefined);
  }
});
test('GET preserves the saved choice, blocks stale analysis sets and allows retries only after a lease expires',async()=>{
  const complete={...result,status:'ready',options,model:'test-model',finished_at:analysis.started_at};
  const f=fixture({recommendations:complete,selection:{recommended_type:'example',recommendation_reason:options[0].justification,
    recommendation_attempt_id:result.attempt_id,recommendation_selected_at:analysis.started_at,recommendation_choice_version:1}});
  const view=await(await f.get()).json();assert.equal(view.choice.type,'example');assert.equal(view.choiceVersion,1);assert.equal(view.canChoose,true);assert.equal(view.canRecommend,false);
  assert.equal((await(await fixture({recommendations:result}).get()).json()).canRecommend,false);
  assert.equal((await(await fixture({recommendations:{...result,lease_expires_at:'2000-01-01T00:00:00.000Z'}}).get()).json()).canRecommend,true);
  assert.equal((await fixture({recommendations:{...complete,analysis_attempt_id:receipt.id}}).get()).status,409);
  const generating=fixture({record:{...record,status:'processing',stage:'generating'},recommendations:complete});
  assert.equal((await(await generating.get()).json()).canChoose,false);
});
