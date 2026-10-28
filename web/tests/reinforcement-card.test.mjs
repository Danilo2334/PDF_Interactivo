import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, record } from './summary-test-helpers.mjs';
const schemas=load('lib/validations/reinforcement-card.ts');
const body={documentId:record.document_id,reinforcementId:randomUUID(),approvedVersionId:randomUUID(),expectedVersion:0,initialExpanded:false,operationId:randomUUID()};
const card={reinforcement_id:body.reinforcementId,approved_version_id:body.approvedVersionId,initial_expanded:false,version:1,operation_id:body.operationId,updated_by:record.owner_id,updated_at:record.created_at};
function service(options={}){const calls=[];const {postCard}=load('lib/reinforcements/card-service.ts',{
  '@/lib/reinforcements/request-service':{authorizeRequest:async()=>options.denied?{response:new Response('{}',{status:options.denied})}:{db:{rpc:async(...args)=>{calls.push(args);if(options.throw)throw Error('network');return options.code?{error:{code:options.code}}:{data:options.invalid?{}:card}}},row:record},
    readSmallJson:async request=>({body:await request.json()}),reply:(data,status=200)=>Response.json(data,{status})},
  '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='http://localhost'},'@/lib/validations/reinforcement-card':schemas});
  return {calls,run:(input=body,origin='http://localhost')=>postCard(new Request('http://localhost/card',{method:'POST',headers:{origin},body:JSON.stringify(input)}),record.project_id,record.id)};
}
test('HU026 card endpoint blocks foreign origin, invalid fields, missing sessions and stale/denied versions',async()=>{
  const f=service();assert.equal((await f.run(body,'https://foreign.invalid')).status,403);
  for(const input of [{...body,expectedVersion:-1},{...body,initialExpanded:'true'},{...body,title:'unapproved override'}])assert.equal((await f.run(input)).status,400);
  assert.equal(f.calls.length,0);
  for(const denied of [401,403,404,409])assert.equal((await service({denied}).run()).status,denied);
  for(const [code,status] of [['PT409',409],['40001',409],['42501',403],['unknown',503]])assert.equal((await service({code}).run()).status,status);
});
test('HU026 only passes approved identity, presentation and optimistic version; transport errors do not invent success',async()=>{
  const f=service();assert.equal((await f.run()).status,200);assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0])),['save_reinforcement_card',{
    p_request_id:record.id,p_document_id:body.documentId,p_reinforcement_id:body.reinforcementId,p_approved_version_id:body.approvedVersionId,
    p_expected_version:0,p_initial_expanded:false,p_operation_id:body.operationId}]);
  assert.equal((await service({throw:true}).run()).status,503);assert.equal((await service({invalid:true}).run()).status,503);
});
const item={id:body.reinforcementId,document_id:record.document_id,page_number:record.page_number,title:'Concepto de energía',content:{text:'Texto aprobado que permanece idéntico.'},
  source_request_id:record.id,approved_version_id:body.approvedVersionId,source:record,card};
const deps={'@/lib/validations/reinforcement-card':schemas,'@/components/documents/reinforcement-media':{ReinforcementMedia:()=>null},'@/components/documents/visual-resource':{VisualResource:()=>null},'@/components/documents/summary-resource':{SummaryResource:()=>null}};
test('HU026 collapsed/expanded markup links a native keyboard button to content and scopes source controls',()=>{
  const {ReinforcementCard}=load('components/documents/reinforcement-card.tsx',{...deps,react:React});
  const render=value=>renderToStaticMarkup(React.createElement(ReinforcementCard,{reinforcement:value,projectId:record.project_id,canManage:true,onSource(){}}));
  const collapsed=render(item);assert.match(collapsed,/aria-expanded="false"/);assert.match(collapsed,/aria-controls="[^"]+-content"/);assert.match(collapsed,/<div id="[^"]+-content" hidden=""/);
  assert.match(collapsed,/Concepto de energía/);assert.match(collapsed,/Texto aprobado que permanece idéntico/);
  const expanded=render({...item,card:{...card,initial_expanded:true}});assert.match(expanded,/aria-expanded="true"/);assert.doesNotMatch(expanded,/<div id="[^"]+-content" hidden/);
  assert.match(expanded,/Guardar tarjeta/);assert.match(expanded,/Ver .*original/);
  assert.doesNotMatch(render({...item,source:{...record,document_id:randomUUID()}}),/Guardar tarjeta|Ver .*original/);
});
