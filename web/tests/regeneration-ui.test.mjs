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

test('HU045 a lost response recovered from the same saved job blocks another generation until an explicit new adjustment',async()=>{
 const job={operation_id:record.id,status:'ready',result_version:3},head={current_version:3,decision:'pending',approved_version_id:record.id};
 let requests=0,refIndex=0,stateIndex=0;const refs=[{current:null},{current:{fingerprint:'original request',id:record.id}}],states=[];
 const fakeReact={useId:()=> 'qa-id',useEffect(){},useRef:()=>refs[refIndex++],useState:initial=>{const index=stateIndex++;states[index]=index===0?'Conservar el fragmento confirmado':index===3?record.id:initial;return[states[index],v=>{states[index]=v}]}};
 const mod=load('components/documents/regeneration-panel.tsx',{react:fakeReact,'next/navigation':{useRouter:()=>({refresh(){}})},
  '@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:{...view,review:head,job}},refresh(){}})},'@/lib/validations/regeneration':schemas,
  '@/lib/validations/example':reviews,'@/components/documents/owner-review-panel':{OwnerReviewPanel:()=>null},'@/components/documents/quiz-panel':{QuizPanel:()=>null}}, {fetch:async()=>{requests++;throw Error('must not call AI')}});
 const tree=mod.RegenerationPanel({request:record,active:true,onChanged(){}}),all=[];
 function visit(n){if(!n||typeof n!=='object')return;if(n.type)all.push(n);for(const c of [n.props?.children].flat(Infinity))visit(c)}visit(tree);
 const submit=all.find(n=>n.type==='button'&&n.props.type==='submit');assert.equal(submit.props.disabled,true);
 all.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await Promise.resolve();assert.equal(requests,0);
 assert.ok(all.some(n=>n.type==='p'&&String(n.props.children).includes('Se recuperó la versión 3 ya guardada')));
 const next=all.find(n=>n.type==='button'&&n.props.children==='Preparar otro ajuste');assert.ok(next);next.props.onClick();assert.equal(refs[1].current,null);assert.equal(states[0],'');
});

test('HU045 a browser network error retains generation inputs and shows a recovery action instead of technical fetch text',async()=>{
 let stateIndex=0;const states=[],refs=[],instructions='Mantener las dos etapas del fragmento';
 const fakeReact={useId:()=> 'qa-id',useEffect(){},useRef:value=>{const ref={current:value};refs.push(ref);return ref},useState:initial=>{const index=stateIndex++;states[index]=index===0?instructions:initial;return[states[index],v=>{states[index]=v}]}};
 const mod=load('components/documents/regeneration-panel.tsx',{react:fakeReact,'next/navigation':{useRouter:()=>({refresh(){}})},
  '@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:{...view,review:{current_version:2,decision:'approved',approved_version_id:record.id}}},refresh(){}})},'@/lib/validations/regeneration':schemas,
  '@/lib/validations/example':reviews,'@/components/documents/owner-review-panel':{OwnerReviewPanel:()=>null},'@/components/documents/quiz-panel':{QuizPanel:()=>null}}, {fetch:async()=>{throw new TypeError('Failed to fetch')}});
 const tree=mod.RegenerationPanel({request:record,active:true,onChanged(){}}),all=[];function visit(n){if(!n||typeof n!=='object')return;if(n.type)all.push(n);for(const c of [n.props?.children].flat(Infinity))visit(c)}visit(tree);
 all.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await new Promise(r=>setTimeout(r,0));
 assert.equal(states[0],instructions);assert.match(states[2],/Se conserva lo guardado.*Actualiza antes de reintentar/);assert.doesNotMatch(states[2],/Failed to fetch|TypeError/);assert.ok(refs[1].current?.id);
});
