import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { schemas, provider, context, diagnosis, visual, generation, load, record } from './visual-test-helpers.mjs';
import { schemas as exampleSchemas } from './example-test-helpers.mjs';
test('visual contracts reject fabricated citations, wrong kind, executable content, duplicate/orphan/self references and invalid compositions',()=>{
  assert.equal(schemas.validateVisual(visual,context,diagnosis,'diagram').title,visual.title);
  for(const invalid of [{...visual,sourceQuote:'Cita inexistente en el PDF.'},{...visual,topicReference:'Otro tema'},{...visual,consistentWithSource:false},
    {...visual,svg:'<script/>'},{...visual,scene:{...visual.scene,edges:[{from:'n1',to:'n6',label:'Desconocido'}]}},
    {...visual,scene:{...visual.scene,nodes:[visual.scene.nodes[0],visual.scene.nodes[0]]}},
    {...visual,scene:{...visual.scene,edges:[{from:'n1',to:'n1',label:'Bucle'}]}}])assert.throws(()=>schemas.validateVisual(invalid,context,diagnosis,'diagram'));
  assert.throws(()=>schemas.validateVisual(visual,context,diagnosis,'image'));
  assert.throws(()=>schemas.validateVisual(visual,{...context,enough:false},diagnosis,'diagram'));
});
test('provider sends only persisted context, mode, brief and bounded instructions in one call; quote schema never splits a surrogate pair',async()=>{
  const unicodeContext={...context,selectedText:'a'.repeat(499)+'😀 al final'};let calls=0;
  await provider.generateVisual(unicodeContext,diagnosis,'diagram',generation.visual_brief,'Aclarar la transformación.',{key:'test',model:'test-model'},async(url,init)=>{
    calls++;const body=JSON.parse(init.body),input=JSON.parse(body.contents[0].parts[0].text);assert.equal(input.modality,'Diagrama');assert.equal(input.brief,generation.visual_brief);
    assert.equal(input.additionalInstructions,'Aclarar la transformación.');assert.equal(input.ownerId,undefined);assert.equal(init.cache,'no-store');
    assert.equal(body.generationConfig.responseFormat.text.schema.properties.sourceQuote.enum[0],'a'.repeat(499));
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...visual,sourceQuote:'a'.repeat(499)})}]}}]});
  });assert.equal(calls,1);
});
test('invalid provider output, quota, refusal and timeout remain controlled and never retry automatically',async()=>{
  for(const [transport,code,quota] of [
    [async()=>new Response('sensitive upstream body',{status:429}),'provider_unavailable',true],
    [async()=>{const e=Error('sensitive');e.name='TimeoutError';throw e},'timeout',false],
    [async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}}),'provider_refused',false],
    [async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...visual,consistentWithSource:false})}]}}]}),'invalid_visual',false],
  ]){let calls=0;await assert.rejects(provider.generateVisual(context,diagnosis,'diagram',generation.visual_brief,'',{key:'test',model:'test-model'},(...args)=>{calls++;return transport(...args)}),
    e=>e.code===code&&e.quotaExhausted===quota&&!e.message.includes('sensitive'));assert.equal(calls,1);}
});
const {VisualResource}=load('components/documents/visual-resource.tsx',{react:React,'@/lib/validations/visual':schemas});
test('safe visual renderer has an accessible title/description and escaped labels, without accepting SVG markup or remote assets',()=>{
  const value={...visual,scene:{...visual.scene,nodes:[{...visual.scene.nodes[0],label:'<script>alert(1)</script>'},visual.scene.nodes[1]]}};
  const html=renderToStaticMarkup(React.createElement(VisualResource,{value}));assert.match(html,/role="img"/);assert.match(html,/<title/);assert.match(html,/<desc/);
  assert.match(html,/&lt;script&gt;/);assert.equal(html.includes('<script>'),false);assert.equal(html.includes('<image'),false);assert.equal(html.includes('foreignObject'),false);
  assert.match(html,/aria-expanded="false"/);assert.match(html,/Ampliar recurso visual/);assert.match(html,/aria-label="Vista del recurso visual"/);
  assert.match(renderToStaticMarkup(React.createElement(VisualResource,{value:{svg:'<script/>'}})),/no pudo verificarse/);
});
test('visual UI starts unselected, blocks generation until saved and requires a new explicit approval for a preview',()=>{
  const {OwnerReviewPanel}=load('components/documents/owner-review-panel.tsx',{react:React});
  function render(view){const {VisualPanel}=load('components/documents/visual-panel.tsx',{react:React,'next/navigation':{useRouter:()=>({refresh(){}})},
    '@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:view},refresh(){}})},'@/lib/validations/visual':schemas,
    '@/lib/validations/example':exampleSchemas,'@/components/documents/owner-review-panel':{OwnerReviewPanel},'@/components/documents/visual-resource':{VisualResource}});
    return renderToStaticMarkup(React.createElement(VisualPanel,{request:record,active:true,onChanged(){}}));}
  const initial={generation:null,choiceVersion:1,visualChosen:true,providerAvailable:true,canConfigure:true,canGenerate:false,canRegenerate:false,review:null,versions:[],events:[]};
  const html=render(initial);assert.match(html,/Imagen/);assert.match(html,/Diagrama/);assert.equal((html.match(/checked=""/g)??[]).length,0);assert.match(html,/disabled=""[^>]*>Generar recurso visual/);
  const version={id:record.id,request_id:record.id,version:1,origin:'ai',title:visual.title,text:visual.text,actor_id:record.owner_id,created_at:record.created_at,visual_content:visual};
  const ready=render({...initial,generation:{...generation,status:'ready',content:visual},review:{request_id:record.id,current_version:1,decision:'pending',approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.created_at},versions:[version],canRegenerate:true});
  assert.match(ready,/Pendiente de aprobación/);assert.match(ready,/disabled=""[^>]*>Aprobar esta versión/);assert.match(ready,/Descripción accesible/);
  const unrelated=render({...initial,visualChosen:false,review:{request_id:record.id,current_version:1,decision:'pending'},versions:[version]});
  assert.equal(unrelated.includes('>Tu revisión<'),false);assert.equal(unrelated.includes('>Solicitar otro resultado<'),false);
});
