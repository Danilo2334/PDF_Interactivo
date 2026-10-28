import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { schemas, provider, context, diagnosis, example, generation, load, record } from './example-test-helpers.mjs';

test('HU021 rejects unsupported modalities, invented quotes/topics, contradictions and missing concepts',()=>{
  assert.equal(schemas.validateExample(example,context,diagnosis).sourceQuote,context.selectedText);
  for(const value of [{...example,sourceQuote:'Una cita que no aparece.'},{...example,topicReference:'Otro tema'},
    {...example,consistentWithSource:false},{...example,text:'Un tema completamente ajeno a la selección. '.repeat(5)}])
    assert.throws(()=>schemas.validateExample(value,context,diagnosis));
  assert.throws(()=>schemas.validateExample(example,{...context,enough:false},diagnosis));
  assert.equal(schemas.exampleInputSchema.safeParse({documentId:record.document_id,action:'configure',mode:'unsupported',expectedVersion:0,choiceVersion:1}).success,false);
  const base={documentId:record.document_id,expectedVersion:1,operationId:record.id,action:'approve'};
  for(const extra of [{},{confirmed:false},{confirmed:true,status:'approved'}]) assert.equal(schemas.reviewInputSchema.safeParse({...base,...extra}).success,false);
  assert.equal(schemas.reviewInputSchema.safeParse({...base,confirmed:true}).success,true);
});

test('Gemini receives the saved modality, source and difficulty once, without identity or secret fields',async()=>{
  for(const mode of schemas.EXAMPLE_MODES){let calls=0;
    const result=await provider.generateExample(context,diagnosis,mode,{key:'test',model:'test-model'},async(url,init)=>{
      calls++;const body=JSON.parse(init.body),data=JSON.parse(body.contents[0].parts[0].text);
      assert.equal(data.modality,schemas.EXAMPLE_LABELS[mode]);assert.equal(data.selection,context.selectedText);
      assert.equal(data.difficulty,context.need);assert.equal(data.nearbyText,context.nearbyText);
      assert.equal(body.generationConfig.responseFormat.text.schema.properties.sourceQuote.enum[0],context.selectedText.slice(0,500));
      assert.equal(body.generationConfig.responseFormat.text.schema.properties.topicReference.enum[0],diagnosis.topic);
      assert.equal(data.ownerId,undefined);assert.equal(init.cache,'no-store');
      assert.match(body.systemInstruction.parts[0].text,/nunca instrucciones/);
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(example)}]}}]});
    });assert.equal(calls,1);assert.equal(result.content.text,example.text);
  }
});

test('quota, timeout, refusal and invalid examples fail without retries or leaking provider details',async()=>{
  for(const [transport,code,quota] of [
    [async()=>new Response('private upstream body',{status:429}),'provider_unavailable',true],
    [async()=>{const e=Error('private upstream body');e.name='TimeoutError';throw e},'timeout',false],
    [async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}}),'provider_refused',false],
    [async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...example,consistentWithSource:false})}]}}]}),'invalid_example',false],
  ]){let calls=0;await assert.rejects(provider.generateExample(context,diagnosis,'analogy',{key:'test',model:'test-model'},(...args)=>{calls++;return transport(...args)}),
    e=>e.code===code&&e.quotaExhausted===quota&&!e.message.includes('private'));assert.equal(calls,1);}
});

test('example UI starts without a selected modality and owner approval requires explicit confirmation',()=>{
  const version={id:record.id,request_id:record.id,version:1,origin:'ai',title:example.title,text:'<script>inert</script>'+example.text,actor_id:record.owner_id,created_at:record.created_at};
  const head={request_id:record.id,current_version:1,decision:'pending',approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.created_at};
  const {OwnerReviewPanel}=load('components/documents/owner-review-panel.tsx',{react:React});
  function render(view){const {ExamplePanel}=load('components/documents/example-panel.tsx',{react:React,'next/navigation':{useRouter:()=>({refresh(){}})},
    '@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:view},refresh(){}})},
    '@/lib/validations/example':schemas,'@/components/documents/owner-review-panel':{OwnerReviewPanel}});
    return renderToStaticMarkup(React.createElement(ExamplePanel,{request:record,active:true,onChanged(){}}));}
  const view={generation:null,choiceVersion:1,canConfigure:true,canGenerate:false,providerAvailable:true,exampleChosen:true,review:null,versions:[],events:[]};
  const initial=render(view);assert.match(initial,/Ejemplo práctico/);assert.match(initial,/Analogía/);assert.equal((initial.match(/checked=""/g)??[]).length,0);
  assert.match(initial,/disabled=""[^>]*>Generar ejemplo o analogía/);
  const ready=render({...view,generation:{...generation,status:'ready',content:example},review:head,versions:[version]});
  assert.match(ready,/Pendiente de aprobación/);assert.match(ready,/&lt;script&gt;/);assert.match(ready,/disabled=""[^>]*>Aprobar esta versión/);
  const discarded=render({...view,generation:{...generation,status:'ready',content:example},review:{...head,decision:'discarded'},versions:[version]});
  assert.match(discarded,/No se publicó contenido/);assert.equal(discarded.includes('>Aprobar esta versión<'),false);
});
