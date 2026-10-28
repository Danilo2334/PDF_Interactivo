import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {schemas,provider,context,diagnosis,summary,load,generation,record} from './summary-test-helpers.mjs';
test('summary removes empty and accent/case duplicate concepts while rejecting fabricated evidence, unrelated concepts, topics and excessive length',()=>{
 const dirty={...summary,concepts:[...summary.concepts,{name:'  ENERGIA ',sourceQuote:context.selectedText},{name:' ',sourceQuote:''}]};
 assert.equal(schemas.validateSummary(dirty,context,diagnosis,'compact').concepts.length,2);
 for(const invalid of [{...summary,sourceQuote:'Texto inventado.'},{...summary,topicReference:'Tema ajeno'},{...summary,consistentWithSource:false},
 {...summary,text:'a'.repeat(351)},{...summary,concepts:[]},{...summary,concepts:[{name:'temperatura',sourceQuote:context.selectedText}]},
 {...summary,concepts:[{name:'energía',sourceQuote:'La energía inventada de otra página.'}]}])assert.throws(()=>schemas.validateSummary(invalid,context,diagnosis,'compact'));
 assert.equal(schemas.validateSummary({...summary,text:'a'.repeat(351)},context,diagnosis,'brief').text.length,351);
 assert.throws(()=>schemas.validateSummary(summary,{...context,enough:false},diagnosis,'brief'));
});
test('provider has a configured character cap, sends only saved source and makes one call; invalid, quota, refusal and timeout are bounded',async()=>{
 let calls=0;await provider.generateSummary(context,diagnosis,'compact',{key:'test',model:'test-model'},async(url,init)=>{
 calls++;const body=JSON.parse(init.body),data=JSON.parse(body.contents[0].parts[0].text);assert.equal(data.selection,context.selectedText);assert.equal(data.ownerId,undefined);assert.equal(init.cache,'no-store');assert.equal(body.generationConfig.responseFormat.text.schema.properties.text.maxLength,350);
 return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(summary)}]}}]});});assert.equal(calls,1);
 for(const [transport,code,quota] of [[async()=>new Response('sensitive',{status:429}),'provider_unavailable',true],[async()=>{const e=Error('sensitive');e.name='TimeoutError';throw e},'timeout',false],
 [async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}}),'provider_refused',false],[async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...summary,concepts:[]})}]}}]}),'invalid_summary',false]]){
 let count=0;await assert.rejects(provider.generateSummary(context,diagnosis,'brief',{key:'test',model:'test'},(...args)=>{count++;return transport(...args)}),e=>e.code===code&&e.quotaExhausted===quota&&!e.message.includes('sensitive'));assert.equal(count,1);}
});
const {SummaryResource}=load('components/documents/summary-resource.tsx',{'@/lib/validations/summary':schemas});
const {SummaryReviewPanel}=load('components/documents/summary-review-panel.tsx',{react:React,'@/lib/validations/summary':schemas});
test('summary UI isolates source from preview, escapes content and cannot publish without explicit owner confirmation',()=>{
 const html=renderToStaticMarkup(React.createElement(SummaryResource,{value:{...summary,text:summary.text+' <script>alert(1)</script>'}}));assert.match(html,/&lt;script&gt;/);assert.equal(html.includes('<script>'),false);assert.match(html,/Cita que sustenta el concepto/);
 const version={id:record.id,request_id:record.id,version:1,title:summary.title,text:summary.text,summary_content:summary,origin:'ai',actor_id:record.owner_id,created_at:record.created_at};
 const view={generation:{...generation,status:'ready',content:summary},summaryChosen:true,choiceVersion:1,providerAvailable:true,canConfigure:false,canGenerate:false,versions:[version],events:[],review:{request_id:record.id,current_version:1,decision:'pending',approved_version_id:null,approved_by:null,approved_at:null,updated_at:record.created_at}};
 const editor=renderToStaticMarkup(React.createElement(SummaryReviewPanel,{view,disabled:false,onReview:async()=>null}));assert.match(editor,/Agregar concepto/);assert.match(editor,/Eliminar concepto 1/);assert.match(editor,/disabled=""[^>]*>Aprobar resumen/);assert.match(editor,/350 caracteres/);
 const {SummaryPanel}=load('components/documents/summary-panel.tsx',{react:React,'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/reinforcements/use-request-resource':{useRequestResource:()=>({result:{value:{...view,summaryChosen:false}},refresh(){}})},'@/lib/validations/summary':schemas,'@/lib/validations/example':{},'@/components/documents/summary-resource':{SummaryResource},'@/components/documents/summary-review-panel':{SummaryReviewPanel}});
 const unrelated=renderToStaticMarkup(React.createElement(SummaryPanel,{request:record,active:true,onChanged(){}}));assert.equal(unrelated.includes('Revisar resumen y conceptos'),false);
});
