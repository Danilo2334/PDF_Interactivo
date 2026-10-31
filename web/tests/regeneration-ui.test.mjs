import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, record } from './summary-test-helpers.mjs';
import { schemas as reviews } from './example-test-helpers.mjs';
const schemas=load('lib/validations/regeneration.ts',{'@/lib/validations/example':reviews});
const {OwnerReviewPanel}=load('components/documents/owner-review-panel.tsx',{react:React});
function render(view){const {RegenerationPanel}=load('components/documents/regeneration-panel.tsx',{react:React,'next/navigation':{useRouter:()=>({refresh(){}})},
  '@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:view},refresh(){}})},'@/lib/validations/regeneration':schemas,
  '@/lib/validations/example':reviews,'@/components/documents/owner-review-panel':{OwnerReviewPanel},'@/components/documents/quiz-panel':{QuizPanel:()=>null}});
  return renderToStaticMarkup(React.createElement(RegenerationPanel,{request:record,active:true,onChanged(){}}));}
const view={kind:'explanation',ready:true,providerAvailable:true,processing:false,review:null,versions:[],events:[],job:null};
test('older explanations enter review only through an explicit prepare action; unsupported formats do not expose regeneration',()=>{
  assert.match(render(view),/Revisar explicación generada/);assert.equal(render(view).includes('Regenerar con instrucciones'),false);assert.equal(render({...view,kind:null}), '');
});
test('regeneration needs owner instructions, targets the saved version, retains approval and blocks simultaneous work',()=>{
  const head={request_id:record.id,current_version:2,decision:'pending',approved_version_id:record.id,approved_by:record.owner_id,approved_at:record.created_at,updated_at:record.created_at};
  const version={id:record.id,request_id:record.id,version:2,origin:'ai',title:'Ejemplo coherente',text:'Texto sustentado. '.repeat(8),actor_id:record.owner_id,created_at:record.created_at};
  const ready=render({...view,review:head,versions:[version]});assert.match(ready,/Título de la explicación/);assert.match(ready,/Instrucciones para regenerar/);assert.match(ready,/minLength="3"/i);assert.match(ready,/maxLength="500"/i);
  assert.match(ready,/versión guardada 2/);assert.match(ready,/Se conserva la última aprobada/);assert.match(ready,/disabled=""[^>]*>Regenerar con instrucciones/);assert.match(ready,/disabled=""[^>]*>Aprobar esta versión/);
  const busy=render({...view,review:head,versions:[version],processing:true});assert.match(busy,/Hay una regeneración en curso/);assert.match(busy,/disabled=""[^>]*>Guardar nueva versión/);
});
