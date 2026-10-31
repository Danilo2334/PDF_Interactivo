import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,record} from './summary-test-helpers.mjs';
import {validation} from './reinforcement-test-helpers.mjs';
import {schemas as reviews} from './example-test-helpers.mjs';
const cards=load('lib/validations/reinforcement-card.ts'),media=load('lib/validations/reinforcement-media.ts');
const schemas=load('lib/validations/experience-preview.ts',{'@/lib/validations/reinforcement-card':cards,'@/lib/validations/reinforcement-media':media,'@/lib/validations/reinforcement-request':validation});
const quizzes=load('lib/validations/quiz.ts',{'@/lib/validations/example':reviews});
const model=load('lib/previews/model.ts',{'@/lib/validations/example':reviews,'@/lib/validations/quiz':quizzes,'@/lib/validations/experience-preview':schemas,'@/lib/validations/reinforcement-request':validation});
const project={id:record.project_id,document_id:record.document_id,name:'QA preview'},sourceId=randomUUID(),quizId=randomUUID(),approvedQuizId=randomUUID();
const source={versionId:sourceId,requestId:record.id,documentId:record.document_id,pageNumber:1,title:'Energía',text:'La energía total se conserva en un sistema aislado. No se crea ni se destruye; cambia de forma entre energía potencial y energía cinética.',concepts:['energía'],hash:'a'.repeat(64)};
const content={title:'Pregunta privada de energía',allowRetries:true,questions:[{prompt:'Según el refuerzo, ¿qué ocurre con la energía total?',options:['Se conserva.','Desaparece.'],correctIndex:0,explanation:'EXPLICACION_RESERVADA: la fuente indica que la energía se conserva.',sourceQuote:'La energía total se conserva en un sistema aislado.'}]};
const version={id:sourceId,request_id:record.id,version:1,origin:'ai',title:source.title,text:source.text,actor_id:record.owner_id,created_at:record.created_at};
const head={request_id:record.id,current_version:1,decision:'approved',approved_version_id:sourceId,approved_by:record.owner_id,approved_at:record.created_at,updated_at:record.created_at};
const qVersion={id:quizId,request_id:record.id,version:2,source_version_id:sourceId,source,content,origin:'owner',actor_id:record.owner_id,created_at:record.created_at,model:null};
const row={...record,recommended_type:'explanation',review:head,versions:[version],quizHead:{...head,current_version:2,decision:'pending',choice:'generate',choice_version:1,target_source_version_id:sourceId,approved_version_id:approvedQuizId},
  quizVersions:[qVersion,{...qVersion,id:approvedQuizId,version:1,content:{...content,title:'Quiz aprobado'}}],generation:null};
const published=[{id:randomUUID(),document_id:record.document_id,page_number:1,title:source.title,content:{type:'explanation',text:source.text,generatedByAI:true},source_request_id:record.id,approved_version_id:sourceId,source:record,card:null,media:[]}];

test('HU031 private preview projects current draft quizzes without answer keys and grades only on the server',()=>{
  const result=model.buildPreview(project,published,[row]);assert.equal(result.view.items[0].quiz.id,quizId);assert.equal(result.view.items[0].quizState,'draft');
  const json=JSON.stringify(result.view);assert.doesNotMatch(json,/correctIndex|EXPLICACION_RESERVADA/);assert.equal(result.grading.get(quizId).content.questions[0].correctIndex,0);
  const wrong=model.gradeQuiz(content,[1]);assert.equal(wrong.score,0);assert.equal(wrong.questions[0].correct,false);assert.equal(wrong.questions[0].correctOption,'Se conserva.');
  assert.equal(model.gradeQuiz(content,[0]).score,1);for(const answers of [[],[2],[-1],[0,0]])assert.throws(()=>model.gradeQuiz(content,answers));
});

test('HU031 preview excludes discarded versions, respects omission and prevents mixing a quiz from another source version',()=>{
  const discarded=model.buildPreview(project,published,[{...row,quizHead:{...row.quizHead,decision:'discarded'}}]);assert.equal(discarded.view.items[0].quiz.id,approvedQuizId);assert.equal(discarded.grading.has(quizId),false);
  assert.equal(model.buildPreview(project,published,[{...row,quizHead:{...row.quizHead,choice:'omit'}}]).view.items[0].quiz,null);
  const next=randomUUID(),draft={...version,id:next,version:2,title:'Cambio privado'};
  const different=model.buildPreview(project,published,[{...row,review:{...head,current_version:2,decision:'pending'},versions:[draft,version]}]);assert.equal(different.view.items[0].state,'draft');assert.equal(different.view.items[0].reinforcement.title,'Cambio privado');assert.equal(different.view.items[0].quiz,null);
  assert.throws(()=>model.buildPreview(project,published,[{...row,project_id:randomUUID()}]));
  assert.throws(()=>model.buildPreview(project,published,[{...row,document_id:randomUUID()}]));
});

test('HU031 previews an unprepared explanation without creating review state, and retains the old approved reinforcement after discarding its draft',()=>{
  const native=model.buildPreview(project,[],[{...row,review:null,versions:[],quizHead:null,quizVersions:[],generation:{status:'ready',content:{title:source.title,text:source.text}}}]);assert.equal(native.view.items[0].state,'draft');assert.equal(native.view.items[0].sourceVersionId,null);
  const discarded=model.buildPreview(project,published,[{...row,review:{...head,current_version:2,decision:'discarded'},versions:[{...version,id:randomUUID(),version:2,title:'Rechazado'},version]}]);assert.equal(discarded.view.items[0].reinforcement.title,source.title);assert.equal(discarded.view.items[0].state,'approved');
});

function service(options={}){
  const queries=[],db={from(table){const query={table,filters:[]};queries.push(query);return {select(){return this},eq(...args){query.filters.push(args);return this},order(){return this},
    async maybeSingle(){return options.projectError?{error:{code:'network'}}:{data:options.foreign?null:{...project,status:'pending',document_id:options.documentId??project.document_id}}},
    async range(start,end){query.range=[start,end];if(options.readError)return{error:{code:'network'}};
      return{data:table==='reinforcements'?published:options.pagination?Array.from({length:start===0?200:1},()=>({...row,id:randomUUID(),review:null,quizHead:null,versions:[],quizVersions:[]})):[row]};}
  }}},api=load('lib/previews/service.ts',{'@/lib/auth/access':{checkPermission:async()=>options.denied?{ok:false,status:options.denied,message:'Denied'}:{ok:true,userId:record.owner_id}},
    '@/lib/supabase/server':{createClient:async()=>db},'@/lib/reinforcements/request-service':{reply:(data,status=200)=>Response.json(data,{status}),readSmallJson:async request=>({body:await request.json()})},
    '@/lib/documents/mutation-request':{isSameOriginMutation:r=>r.headers.get('origin')==='http://localhost'},'@/lib/validations/experience-preview':schemas,'@/lib/previews/model':model});
  const body={documentId:record.document_id,requestId:record.id,sourceVersionId:sourceId,quizVersionId:quizId,answers:[1]};
  return {queries,get:()=>api.getExperiencePreview(new Request('http://localhost/preview?documentId='+record.document_id),record.project_id),
    post:(input=body,origin='http://localhost')=>api.postPreviewGrade(new Request('http://localhost/preview',{method:'POST',headers:{origin},body:JSON.stringify(input)}),record.project_id),body};
}
test('HU031 preview and evaluation enforce session/ownership/current document and never invoke a mutation method',async()=>{
  for(const denied of [401,403]){const f=service({denied});assert.equal((await f.get()).status,denied);assert.equal((await f.post()).status,denied);assert.equal(f.queries.length,0);}
  for(const [options,status]of [[{foreign:true},404],[{documentId:randomUUID()},409],[{readError:true},503],[{projectError:true},503]])assert.equal((await service(options).get()).status,status);
  const f=service();assert.equal((await f.post(f.body,'https://foreign.invalid')).status,403);assert.equal(f.queries.length,0);
  const result=await(await f.get()).json();assert.doesNotMatch(JSON.stringify(result),/correctIndex|EXPLICACION_RESERVADA/);
  const feedback=await f.post();assert.equal(feedback.status,200);assert.equal((await feedback.json()).feedback.score,0);
  assert.equal((await f.post({...f.body,quizVersionId:randomUUID()})).status,409);assert.equal((await f.post({...f.body,answers:[]})).status,400);
  assert.equal((await f.post({...f.body,answers:[4]})).status,400);
  assert.ok(f.queries.some(q=>q.table==='reinforcement_requests'&&q.filters.some(([key,value])=>key==='owner_id'&&value===record.owner_id)));
  // Mock deliberately offers only select/eq/order/range: writes cannot pass unnoticed.
  const pages=service({pagination:true});assert.equal((await pages.get()).status,200);assert.deepEqual(pages.queries.filter(q=>q.table==='reinforcement_requests').map(q=>q.range),[[0,199],[200,399]]);
});

test('HU031 shared quiz player initially exposes options but no reserved feedback, and requires a selection before submission',()=>{
  const {QuizPlayer}=load('components/documents/quiz-player.tsx',{react:React});
  const html=renderToStaticMarkup(React.createElement(QuizPlayer,{quiz:model.projectQuiz(quizId,2,content),onSubmit:async()=>model.gradeQuiz(content,[0])}));
  assert.match(html,/type="radio"/);assert.match(html,/disabled=""[^>]*>Comprobar respuestas/);assert.doesNotMatch(html,/EXPLICACION_RESERVADA|Respuesta correcta:|Resultado:/);
});
