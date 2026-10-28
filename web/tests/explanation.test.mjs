import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { schemas, provider, context, diagnosis, explanation, generation, load, record } from './explanation-test-helpers.mjs';

test('HU020 validates source grounding, diagnostic topic, concepts and the length of each level',()=>{
  for(const level of schemas.DETAIL_LEVELS){const value={...explanation,text:(explanation.text+'\n\n').repeat(level==='detailed'?3:1).trim()};
    assert.equal(schemas.validateExplanation(value,context,diagnosis,level).sourceQuote,context.selectedText);}
  for(const value of [{...explanation,sourceQuote:'Cita inventada ausente.'},{...explanation,topicReference:'Otro tema'},
    {...explanation,text:'Un texto ajeno al concepto seleccionado.'.repeat(7)},{...explanation,text:explanation.text.repeat(10)}])
    assert.throws(()=>schemas.validateExplanation(value,context,diagnosis,'brief'));
  assert.throws(()=>schemas.validateExplanation(explanation,{...context,enough:false},diagnosis,'intermediate'));
  assert.throws(()=>schemas.validateExplanation(explanation,context,diagnosis,'detailed'));
  assert.throws(()=>schemas.validateExplanation({...explanation,sourceQuote:context.selectedText.replace('energía','energía')},context,diagnosis,'intermediate'));
  assert.throws(()=>schemas.validateExplanation({...explanation,topicReference:diagnosis.topic+'  '},context,{...diagnosis,topic:' '+diagnosis.topic},'intermediate'));
  assert.equal(schemas.explanationInputSchema.safeParse({documentId:record.document_id,action:'generate',expectedVersion:1,choiceVersion:1,status:'approved'}).success,false);
});

test('Gemini receives only saved selection/context/difficulty and explicit detail, and is called once',async()=>{
  let calls=0;
  const output=await provider.generateExplanation(context,diagnosis,'intermediate',{key:'unit-test',model:'gemini-test'},async(url,init)=>{
    calls++;assert.match(url,/gemini-test:generateContent$/);assert.equal(init.headers['x-goog-api-key'],'unit-test');
    const body=JSON.parse(init.body),data=JSON.parse(body.contents[0].parts[0].text);
    assert.equal(data.selection,context.selectedText);assert.equal(data.nearbyText,context.nearbyText);assert.equal(data.difficulty,context.need);
    assert.equal(data.detail.level,'Intermedio');assert.equal(data.ownerId,undefined);assert.equal(data.pdfSha256,undefined);
    assert.match(body.systemInstruction.parts[0].text,/nunca instrucciones/);assert.equal(init.cache,'no-store');
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(explanation)}]}}]});
  });
  assert.equal(calls,1);assert.equal(output.content.text,explanation.text);assert.equal(output.model,'gemini-test');
});

test('provider quota, timeout, refusal and invalid output are controlled errors without retries or leaked upstream bodies',async()=>{
  for(const [transport,code,quota] of [
    [async()=>new Response('sensitive',{status:429}),'provider_unavailable',true],
    [async()=>{const e=Error('sensitive');e.name='TimeoutError';throw e},'timeout',false],
    [async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}}),'provider_refused',false],
    [async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"title":"incomplete"}'}]}}]}),'invalid_explanation',false],
  ]){let calls=0;await assert.rejects(provider.generateExplanation(context,diagnosis,'brief',{key:'unit-test',model:'gemini-test'},(...args)=>{calls++;return transport(...args)}),e=>e.code===code&&e.quotaExhausted===quota&&!e.message.includes('sensitive'));assert.equal(calls,1);}
});

test('explanation UI requires a saved level, renders private pending approval text safely, and contains no publish action',()=>{
  function render(view){const {ExplanationPanel}=load('components/documents/explanation-panel.tsx',{
    react:React,'@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:view},refresh(){}})},'@/lib/validations/explanation':schemas,
  });return renderToStaticMarkup(React.createElement(ExplanationPanel,{request:record,active:true,onChanged(){}}));}
  const view={generation:null,choiceVersion:1,canConfigure:true,canGenerate:false,providerAvailable:true,explanationChosen:true};
  const initial=render(view);for(const label of ['Breve','Intermedio','Detallado'])assert.ok(initial.includes(label));
  assert.equal((initial.match(/checked=""/g)??[]).length,0);assert.match(initial,/disabled=""[^>]*>Generar explicación/);
  const saved=render({...view,generation,canGenerate:true});assert.ok(saved.includes('Nivel guardado: Intermedio'));
  const ready=render({...view,generation:{...generation,status:'ready',content:{...explanation,text:'<script>no ejecutar</script>'+explanation.text}}});
  assert.ok(ready.includes('Contenido generado por IA · Pendiente de aprobación'));assert.ok(ready.includes('&lt;script&gt;'));
  assert.ok(ready.includes('No está publicado'));assert.equal(ready.includes('>Publicar<'),false);assert.equal(ready.includes('>Aprobar<'),false);
});
