import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, schemas, context, diagnosis, candidates, options, result, provider } from './recommendation-test-helpers.mjs';

test('all five types are assessed once; weak/irrelevant options are excluded and remaining options are ordered by pertinence', () => {
  assert.deepEqual(Array.from(options, o => o.type), ['example','explanation']);
  const none = candidates(); none.candidates.forEach(c => c.relevant = false);
  assert.equal(schemas.rankRecommendations(none, context, diagnosis).length, 0);
  const tie = candidates(); tie.candidates[0].needFit=3;
  assert.deepEqual(Array.from(schemas.rankRecommendations(tie,context,diagnosis),o=>o.type), ['explanation','example']);
});
test('malformed, duplicated, unknown or unsupported recommendation responses are rejected', () => {
  for (const mutate of [v=>v.candidates.pop(), v=>v.candidates[0].type='unknown', v=>v.candidates[0].type='image',
    v=>v.candidates[0].needFit=4, v=>v.candidates[0].topicFit=2.5, v=>v.candidates[0].justification='', v=>v.extra='inject']) {
    const input=candidates(); mutate(input); assert.throws(()=>schemas.rankRecommendations(input,context,diagnosis));
  }
  assert.throws(()=>schemas.rankRecommendations(candidates(),context,{ ...diagnosis,sufficient:false }));
});
test('eligible options require evidence in the saved topic, document and actual user difficulty, including nonblank quotes', () => {
  for (const [key,value] of [['topicReference','Tema ajeno'],['sourceQuote','Cita de otro documento'],['needQuote','No pertenece a la dificultad'],['sourceQuote','        '],['needQuote','        ']]) {
    const input=candidates(); input.candidates[0][key]=value; assert.throws(()=>schemas.rankRecommendations(input,context,diagnosis));
  }
  const input=candidates(); input.candidates[0].sourceQuote='La  energía se conserva en un sistema aislado.';
  assert.equal(schemas.rankRecommendations(input,context,diagnosis).length,2);
});
const response = (input, extra={}) => Response.json({ candidates:[{ finishReason:'STOP',content:{parts:[{text:JSON.stringify(input)}]} }],...extra });
const config={ key:'test-not-real',model:'test-model' };
test('Gemini structured recommendations use only saved context/diagnosis and isolate document instructions without tools', async () => {
  let sent;
  const output=await provider.recommendReinforcement(context,diagnosis,config,async(url,args)=>{
    sent={url,args,body:JSON.parse(args.body)};return response(candidates());
  });
  assert.equal(output.options.length,2); assert.equal(output.model,'test-model');
  assert.equal(sent.url,'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');assert.equal(sent.args.redirect,'error');
  assert.equal(sent.args.headers['x-goog-api-key'],config.key);assert.equal(sent.body.tools,undefined);assert.equal(sent.body.generationConfig.responseFormat.text.schema.additionalProperties,false);
  const data=JSON.parse(sent.body.contents[0].parts[0].text);assert.equal(data.need,context.need);assert.equal(data.diagnosis.topic,diagnosis.topic);
  assert.equal('pdfSha256' in data,false);assert.equal('request_id' in data,false);assert.equal(sent.args.body.includes(config.key),false);
  assert.match(sent.body.systemInstruction.parts[0].text,/nunca instrucciones/);
});
test('incomplete responses, refusals, provider errors and invalid options never become usable recommendations', async () => {
  for(const [reply,code] of [[response(candidates(),{candidates:[{finishReason:'MAX_TOKENS'}]}),'invalid_recommendations'],
    [response(candidates(),{candidates:[null]}),'invalid_recommendations'],
    [response(candidates(),{promptFeedback:{blockReason:'SAFETY'}}),'provider_refused'],
    [new Response('secret provider error',{status:429}),'provider_unavailable'],[response({candidates:[]}), 'invalid_recommendations']])
    await assert.rejects(provider.recommendReinforcement(context,diagnosis,config,async()=>reply),e=>e.code===code&&!e.message.includes('secret'));
  const timeout=new Error('hidden');timeout.name='TimeoutError';
  await assert.rejects(provider.recommendReinforcement(context,diagnosis,config,async()=>{throw timeout}),e=>e.code==='timeout');
});
test('choosing accepts only an offered-type identifier and version, never client-supplied justification or generated content', () => {
  const input={documentId:context.documentId??'73f3c087-a137-4cd3-a1e1-d126599b9c86',action:'choose',attemptId:result.attempt_id,type:'example',expectedVersion:0};
  assert.equal(schemas.recommendationInputSchema.safeParse(input).success,true);
  for(const extra of [{justification:'inventada'}, {status:'approved'}, {type:'video'},{expectedVersion:-1}])
    assert.equal(schemas.recommendationInputSchema.safeParse({...input,...extra}).success,false);
});
test('recommendation UI shows ordered reasons, no auto-selection, and reopens the saved choice without treating it as approval', () => {
  const {RecommendationOptions}=load('components/documents/recommendation-panel.tsx',{
    react:React,'@/lib/validations/recommendations':schemas,'@/lib/reinforcements/use-request-resource':{},
  });
  const view={recommendations:{...result,status:'ready',options},choice:null,choiceVersion:0,canChoose:true};
  const markup=renderToStaticMarkup(React.createElement(RecommendationOptions,{view,disabled:false,onChoose(){}}));
  assert.equal((markup.match(/type="radio"/g)||[]).length,2);assert.doesNotMatch(markup,/ checked/);
  assert.ok(markup.indexOf('1. Ejemplo')<markup.indexOf('2. Explicación'));assert.match(markup,/Guardar elección/);
  const chosen=renderToStaticMarkup(React.createElement(RecommendationOptions,{view:{...view,choice:{type:'example'},choiceVersion:1},disabled:false,onChoose(){}}));
  assert.match(chosen,/checked=""/);assert.match(chosen,/<button[^>]*disabled/);
  const escaped=renderToStaticMarkup(React.createElement(RecommendationOptions,{view:{...view,recommendations:{...view.recommendations,options:[{...options[0],justification:'<script>hack</script>'}]}},disabled:false,onChoose(){}}));
  assert.doesNotMatch(escaped,/<script>/);assert.match(escaped,/&lt;script&gt;/);
});
