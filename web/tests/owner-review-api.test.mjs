import assert from 'node:assert/strict';
import test from 'node:test';
import { owner, projectId, documentId, requestSchemas } from './analysis-test-helpers.mjs';
import { load, schemas, record, example } from './example-test-helpers.mjs';
function fixture(settings={}){
  const rpc=[];
  const db={from(table){return {select(){return this},eq(){return this},async maybeSingle(){return {data:table==='projects'
    ?settings.project===null?null:{document_id:documentId,status:'pending'}:record};}}},async rpc(name,args){rpc.push({name,args});
    return settings.error?{error:{code:settings.error}}:{data:{request_id:record.id,current_version:2,decision:args.p_action==='approve'?'approved':'pending',
      approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.created_at}};}};
  const access=load('lib/reinforcements/request-service.ts',{'@/lib/auth/access':{checkPermission:async()=>settings.access??{ok:true,userId:owner}},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/validations/request-list':requestSchemas});
  const service=load('lib/reinforcements/review-service.ts',{'@/lib/reinforcements/request-service':access,
    '@/lib/documents/mutation-request':load('lib/documents/mutation-request.ts'),'@/lib/validations/example':schemas});
  return {rpc,post:(body={},origin='http://localhost:3000')=>service.postReview(new Request(`http://localhost:3000/api/projects/${projectId}/reinforcement-requests/${record.id}/review`,
    {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({documentId,operationId:record.id,expectedVersion:1,action:'approve',confirmed:true,...body})}),projectId,record.id)};
}
test('review API enforces origin, session, active owner, explicit confirmation, strict fields and a bounded body',async()=>{
  const cross=fixture();assert.equal((await cross.post({},'https://foreign.example')).status,403);assert.equal(cross.rpc.length,0);
  for(const [settings,status] of [[{access:{ok:false,status:401,message:'Session'}},401],[{access:{ok:false,status:403,message:'Inactive'}},403],[{project:null},404]]){
    const f=fixture(settings);assert.equal((await f.post()).status,status);assert.equal(f.rpc.length,0);}
  for(const extra of [{confirmed:false},{confirmed:undefined},{text:'forged approval payload'},{expectedVersion:0}]){
    const f=fixture();assert.equal((await f.post(extra)).status,400);assert.equal(f.rpc.length,0);}
  assert.equal((await fixture().post({action:'edit',confirmed:undefined,title:'Title',text:'a'.repeat(25000)})).status,413);
});
test('owner editing sends only bounded text and the expected version to the transactional review RPC',async()=>{
  const f=fixture(),response=await f.post({action:'edit',confirmed:undefined,title:example.title,text:example.text});
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(f.rpc.length,1);
  assert.equal(f.rpc[0].name,'review_reinforcement_draft');assert.equal(f.rpc[0].args.p_text,example.text);
  assert.equal(f.rpc[0].args.p_expected_version,1);assert.equal(f.rpc[0].args.p_operation_id,record.id);
  for(const [code,status] of [['PT409',409],['42501',403],['23514',409],['P0001',429],['PGRST202',503]])
    assert.equal((await fixture({error:code}).post()).status,status);
});
