import assert from 'node:assert/strict';
import test from 'node:test';
import { load, record } from './summary-test-helpers.mjs';
import { schemas as reviews } from './example-test-helpers.mjs';
const schemas=load('lib/validations/quiz.ts',{'@/lib/validations/example':reviews});
const gemini=load('lib/reinforcements/ai-provider.ts');
const provider=load('lib/reinforcements/quiz-provider.ts',{'@/lib/reinforcements/ai-provider':gemini,'@/lib/validations/quiz':schemas});
const source={versionId:record.id,requestId:record.id,documentId:record.document_id,pageNumber:1,title:'Conservación de la energía',
  text:'En un sistema aislado la energía total se conserva. La energía no desaparece cuando cambia de forma; se transforma entre energía potencial y cinética.',concepts:['energía'],hash:'a'.repeat(64)};
const content=count=>({title:'Comprueba la conservación de la energía',allowRetries:false,questions:Array.from({length:count},(_,i)=>({
  prompt:`Pregunta ${i+1}: ¿qué ocurre con la energía total de un sistema aislado?`,options:['Se conserva.','No se conserva.','La energía desaparece.'],correctIndex:0,
  explanation:'El refuerzo indica que la energía total del sistema aislado se conserva.',sourceQuote:'En un sistema aislado la energía total se conserva.'}))});
test('HU028 validates one to three distinct questions, one correct index, non-empty distinct options and literal evidence from this reinforcement',()=>{
  for(const count of [1,2,3])assert.equal(schemas.validateQuiz(content(count),source,count).questions.length,count);
  for(const count of [0,4])assert.throws(()=>schemas.validateQuiz(content(count),source));
  for(const mutate of [c=>c.questions[0].options=['','Otro'],c=>c.questions[0].options=['Igual',' igual '],c=>c.questions[0].correctIndex=3,c=>c.questions[0].sourceQuote='Texto de otro refuerzo diferente',c=>c.questions[1]={...c.questions[0]}]){
    const value=content(2);mutate(value);assert.throws(()=>schemas.validateQuiz(value,source));
  }
  assert.equal(schemas.quizInputSchema.safeParse({action:'approve',documentId:record.document_id,sourceVersionId:record.id,operationId:record.id,expectedVersion:1,confirmed:false}).success,false);
});
test('HU028 sends only the selected reinforcement context and requests the exact bounded question count without approving or publishing',async()=>{
  for(const count of [1,2,3]){const calls=[];const transport=async(url,init)=>{calls.push({url,init});if(calls.length===2)return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({questions:content(count).questions.map(q=>({valid:true,correctIndex:q.correctIndex,reason:'La respuesta corresponde a la fuente.'}))})}]}}]});return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({sufficient:true,reason:'',quiz:content(count)})}]}}]})};
    const result=await provider.generateQuiz(source,count,{provider:'gemini',key:'isolated-key',model:'gemini-test'},transport);assert.equal(result.content.questions.length,count);assert.equal(calls.length,2);
    const body=JSON.parse(calls[0].init.body),data=JSON.parse(body.contents[0].parts[0].text);assert.deepEqual(data,{source:{title:source.title,text:source.text,concepts:source.concepts}});
    assert.equal(body.generationConfig.responseFormat.text.schema.properties.quiz.anyOf[0].properties.questions.minItems,count);assert.equal(body.generationConfig.responseFormat.text.schema.properties.quiz.anyOf[0].properties.questions.maxItems,count);
    assert.match(body.systemInstruction.parts[0].text,/Nunca|nunca/);assert.equal('tools' in body,false);
  }
});
test('HU028 invalid outputs, quota and timeout fail once and never invent a fallback result',async()=>{
  for(const [status,expected]of [[429,'provider_unavailable'],[503,'provider_unavailable']]){let calls=0;await assert.rejects(provider.generateQuiz(source,1,{provider:'gemini',key:'isolated-key',model:'gemini-test'},async()=>{calls++;return new Response('{}',{status})}),e=>e.code===expected);assert.equal(calls,1);}
  await assert.rejects(provider.generateQuiz(source,1,{provider:'gemini',key:'isolated-key',model:'gemini-test'},async()=>{throw new DOMException('timeout','TimeoutError')}),e=>e.code==='timeout');
  const invalid=content(1);invalid.questions[0].sourceQuote='Una cita ajena al refuerzo';
  await assert.rejects(provider.generateQuiz(source,1,{provider:'gemini',key:'isolated-key',model:'gemini-test'},async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({sufficient:true,reason:'',quiz:invalid})}]}}]})),e=>e.code==='invalid_quiz');
  await assert.rejects(provider.generateQuiz(source,3,{provider:'gemini',key:'isolated-key',model:'gemini-test'},async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({sufficient:false,reason:'No hay datos suficientes para tres preguntas distintas.',quiz:null})}]}}]})),e=>e.code==='insufficient_quiz');
});

test('HU028 rejects AI distractors that introduce external vocabulary even with a correct answer and a valid literal quote',async()=>{
  for(const option of ['Se transforma en materia.','La precipitación y la filtración.']){
    const value=content(1);value.questions[0].options[1]=option;let calls=0;
    await assert.rejects(provider.generateQuiz(source,1,{provider:'gemini',key:'isolated-key',model:'gemini-test'},async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({sufficient:true,reason:'',quiz:value})}]}}]})}),e=>e.code==='invalid_quiz');
    assert.equal(calls,1);
  }
  // Owner edits remain possible; this AI-only guard does not claim semantic proof.
  const edited=content(1);edited.questions[0].options[1]='No se mantiene constante.';assert.doesNotThrow(()=>schemas.validateQuiz(edited,source));
});

 test('HU028 separate semantic assessment rejects inverted negations and wrong answer keys without repair or retries',async()=>{
  for(const verdict of [{valid:false,correctIndex:null,reason:'El enunciado invierte la negación de la fuente.'},{valid:true,correctIndex:1,reason:'La opción marcada no es la correcta.'}]){
    let calls=0;await assert.rejects(provider.generateQuiz(source,1,{provider:'gemini',key:'isolated-key',model:'gemini-test'},async(url,init)=>{
      calls++;const payload=calls===1?{sufficient:true,reason:'',quiz:content(1)}:{questions:[verdict]};
      if(calls===2){const body=JSON.parse(init.body);assert.deepEqual(JSON.parse(body.contents[0].parts[0].text),{source:{title:source.title,text:source.text,concepts:source.concepts},quiz:content(1)});assert.equal(body.tools,undefined);assert.match(body.systemInstruction.parts[0].text,/negación/);}
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(payload)}]}}]});
    }),e=>e.code==='invalid_quiz');assert.equal(calls,2);
  }
 });
