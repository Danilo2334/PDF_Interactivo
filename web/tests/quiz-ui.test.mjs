import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, record } from './summary-test-helpers.mjs';
import { schemas as reviews } from './example-test-helpers.mjs';
const schemas=load('lib/validations/quiz.ts',{'@/lib/validations/example':reviews});
const {OwnerReviewPanel}=load('components/documents/owner-review-panel.tsx',{react:React});
const editorState=load('lib/reinforcements/quiz-editor-state.ts');
const {QuizEditor}=load('components/documents/quiz-editor.tsx',{react:React,'@/lib/validations/quiz':schemas,'@/lib/reinforcements/quiz-editor-state':editorState});
const source={versionId:record.id,requestId:record.id,documentId:record.document_id,pageNumber:1,title:'La energía del péndulo',text:'La energía total se conserva en un sistema aislado; no se pierde cuando cambia entre energía potencial y cinética.',concepts:['energía'],hash:'a'.repeat(64)};
const content={title:'Quiz de energía',allowRetries:false,questions:[{prompt:'¿Qué ocurre con la energía del sistema aislado?',options:['Se conserva.','Se pierde.'],correctIndex:0,explanation:'El refuerzo indica que la cantidad total de energía se conserva.',sourceQuote:'La energía total se conserva en un sistema aislado'}]};
const version={id:record.id,request_id:record.id,version:1,source_version_id:record.id,source,content,origin:'ai',actor_id:record.owner_id,created_at:record.created_at,model:'isolated-test'};
const head={request_id:record.id,current_version:1,decision:'pending',approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.created_at,choice:'generate',choice_version:1,target_source_version_id:record.id};
const view={source,head,versions:[version],approvedVersion:null,events:[],job:null,providerAvailable:true};
function render(value){const {QuizPanel}=load('components/documents/quiz-panel.tsx',{react:React,'@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:value?{value}:null,refresh(){}})},
  '@/components/documents/owner-review-panel':{OwnerReviewPanel},'@/components/documents/quiz-editor':{QuizEditor},'@/lib/validations/example':reviews,'@/lib/validations/quiz':schemas});
  return renderToStaticMarkup(React.createElement(QuizPanel,{projectId:record.project_id,documentId:record.document_id,requestId:record.id,sourceVersionId:record.id}));}
test('HU028 choice is explicit and optional; unopened initial server markup contains no questions or correct answers',()=>{
  const initial=render(null);assert.match(initial,/Omitirlo no impide aprobar ni publicar/);assert.match(initial,/aria-expanded="false"/);assert.doesNotMatch(initial,/Respuesta correcta|Quiz de energía/);
  const undecided=render({...view,head:null,versions:[]});assert.match(undecided,/Quiero generar un mini quiz/);assert.match(undecided,/Continuar sin mini quiz/);assert.match(undecided,/Todavía no has elegido/);assert.doesNotMatch(undecided,/>Generar preguntas</);
  const omitted=render({...view,head:{...head,choice:'omit'}});assert.match(omitted,/continuar sin mini quiz/);assert.doesNotMatch(omitted,/Cantidad de preguntas/);
});
test('HU028 reuses owner review decisions without exposing a plaintext editor; approval starts disabled and generation is bounded',()=>{
  const html=render(view);assert.match(html,/Cantidad de preguntas/);assert.match(html,/<option value="1"/);assert.match(html,/<option value="3"/);assert.match(html,/Respuesta correcta/);assert.match(html,/Explicación reservada/);
  assert.match(html,/He revisado estas preguntas/);assert.match(html,/disabled=""[^>]*>Aprobar esta versión/);assert.doesNotMatch(html,/Título del ejemplo|Texto del ejemplo/);assert.match(html,/Editar preguntas del quiz/);
  const unavailable=render({...view,providerAvailable:false});assert.match(unavailable,/cuota/);assert.match(unavailable,/disabled=""[^>]*>Generar otra versión del quiz/);
});
test('HU028 discard and regeneration preserve the approved quiz in its private history',()=>{
  const html=render({...view,head:{...head,current_version:2,decision:'discarded',approved_version_id:record.id,approved_by:record.owner_id,approved_at:record.created_at},
    versions:[{...version,version:2,id:record.owner_id},version],approvedVersion:version});
  assert.match(html,/Borrador descartado/);assert.match(html,/historial privado del quiz/);assert.match(html,/Quiz aprobado anterior conservado/);
  assert.match(html,/Editar quiz aprobado conservado/);
});

test('HU029 option edits preserve the correct answer identity across reordering/removal and require an explicit replacement when deleting the correct option',()=>{
  const original={...content.questions[0],options:['A','B','C','D'],correctIndex:2};
  const moved=editorState.moveQuizOption(original,2,0);assert.deepEqual(moved.options,['C','A','B','D']);assert.equal(moved.correctIndex,0);assert.deepEqual(original.options,['A','B','C','D']);
  const earlier=editorState.removeQuizOption(original,0);assert.deepEqual(earlier.options,['B','C','D']);assert.equal(earlier.correctIndex,1);
  const removed=editorState.removeQuizOption(original,2);assert.equal(removed.correctIndex,-1);assert.equal(schemas.quizContentSchema.safeParse({...content,questions:[removed]}).success,false);
  const added=editorState.addQuizOption(original);assert.equal(added.options.length,5);assert.equal(added.options[4],'');assert.equal(added.correctIndex,2);assert.equal(editorState.addQuizOption(added),added);
  const minimum={...original,options:['A','B'],correctIndex:1};assert.equal(editorState.removeQuizOption(minimum,1),minimum);
  const unselected=editorState.moveQuizOption(removed,0,1);assert.equal(unselected.correctIndex,-1);
});

test('HU029 editor exposes private retry policy, option controls and blocks empty/duplicate options or missing correct answer',()=>{
  const renderEditor=value=>renderToStaticMarkup(React.createElement(QuizEditor,{content:value,version:3,disabled:false,onCancel(){},onSave:async()=>true}));
  const html=renderEditor(content);assert.match(html,/Permitir reintentos/);assert.match(html,/Agregar opción a pregunta 1/);assert.match(html,/Retirar opción 1 de pregunta 1/);assert.match(html,/Subir opción/);assert.match(html,/Explicación de respuesta 1/);
  const allowed=renderEditor({...content,allowRetries:true});assert.match(allowed,/type="checkbox"[^>]*checked=""/);
  for(const q of [{...content.questions[0],options:['A']},{...content.questions[0],options:['A',' ']},{...content.questions[0],options:['A','a']},{...content.questions[0],correctIndex:-1}]){
    const bad={...content,questions:[q]};assert.equal(schemas.quizContentSchema.safeParse(bad).success,false);assert.match(renderEditor(bad),/disabled=""[^>]*>Guardar nueva versión del quiz/);
  }
});
