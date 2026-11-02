import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { schemas, context, diagnosis, visual, load, provider, generation } from './visual-test-helpers.mjs';

const copy=()=>structuredClone(visual);
const validate=value=>schemas.validateVisual(value,context,diagnosis,'diagram');

test('the actual OpenAI request uses supported strict schema unions for the drawing primitives',async()=>{
 let calls=0;
 await provider.generateVisual(context,diagnosis,'diagram',generation.visual_brief,'',{provider:'openai',key:'test',model:'test'},async(url,init)=>{
  calls++;const body=JSON.parse(init.body),schema=body.text.format.schema;
  assert.equal(body.text.format.strict,true);assert.equal(body.store,false);
  assert.ok(schema.properties.scene.properties.artwork.properties.figures.items.properties.marks.items.anyOf.length===4);
  assert.equal(JSON.stringify(schema).includes('"oneOf"'),false);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(visual)}]}]});
 });assert.equal(calls,1);
});

test('opt-in rejection diagnostics never log source data, model output or arbitrary exception text',async()=>{
 const logs=[],isolated=load('lib/reinforcements/visual-provider.ts',{'@/lib/validations/visual':schemas},{process:{env:{AI_USAGE_LOG:'1'}},console:{info:line=>logs.push(line)}});
 const bad=copy();bad.text='DOCUMENTO_PRIVADO_NO_REGISTRAR. '.repeat(4);bad.scene.artwork.legend[0].label='Vapor de_v而';
 await assert.rejects(isolated.generateVisual(context,diagnosis,'diagram',generation.visual_brief,'',{provider:'openai',key:'test',model:'test'},async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(bad)}]}]})),e=>e.code==='invalid_visual');
 assert.equal(logs.length,1);assert.deepEqual(JSON.parse(logs[0]),{event:'reinforcement_visual_rejected',reasons:['corrupted_text']});
 assert.doesNotMatch(logs[0],/DOCUMENTO_PRIVADO|de_v|Bearer|sourceQuote/);
});

test('new illustrations reject unsafe geometry, unknown fields, missing annotations and ambiguous references',()=>{
 for(const change of [
  art=>{art.figures[0].marks[0].x=339;},
  art=>{art.figures[0].marks[2].rx=300;},
  art=>{art.figures[0].marks[1].points[0].x=NaN;},
  art=>{art.figures[0].marks[0].onclick='alert(1)';},
  art=>{art.figures[0].marks[0].fill='url(https://example.com/image)';},
  art=>{art.figures[0].marks[1].id='m1';},
  art=>{art.figures[0].annotations[0].targetId='m16';},
  art=>{art.figures[0].annotations=[];},
  art=>{art.figures[0].marks=art.figures[0].marks.map(m=>({...art.figures[0].marks[0],id:m.id}));},
  art=>{art.layout='process';},
  art=>{art.figures.push(structuredClone(art.figures[0]));},
 ]){const value=copy();change(value.scene.artwork);assert.throws(()=>validate(value));}
});

test('illustrations must cover persisted concepts and cite the actual PDF for figures and annotations',()=>{
 for(const change of [
  art=>{art.figures[0].conceptIds=['n6'];},
  art=>{art.figures[0].conceptIds=['n1'];},
  art=>{art.figures[0].evidence='Esta afirmación no aparece en el contexto.';},
  art=>{art.figures[0].annotations[0].evidence='La flecha demuestra una temperatura inventada.';},
  art=>{art.figures[0].annotations[0].label='Transformació…';},
  art=>{art.legend[0].label='Agua en estado de_v而';},
  art=>{art.figures[0].annotations[0].explanation='La energía se conserva en los';},
 ]){const value=copy();change(value.scene.artwork);assert.throws(()=>validate(value));}
 const legacy=copy();delete legacy.scene.artwork;
 assert.equal(schemas.visualContentSchema.safeParse(legacy).success,true);
 assert.throws(()=>validate(legacy));
});

test('a visual process needs a supported directional relationship while comparison does not invent an order',()=>{
 const value=copy(),art=value.scene.artwork;
 art.figures[0].conceptIds=['n1'];art.figures.push({...structuredClone(art.figures[0]),id:'f2',conceptIds:['n2']});
 art.layout='process';assert.doesNotThrow(()=>validate(value));
 value.scene.edges[0].relationType='comparison';assert.throws(()=>validate(value));
 art.layout='comparison';assert.doesNotThrow(()=>validate(value));
});

test('the rich resource exposes drawings, explanations, legend and conclusion with escaped source text',()=>{
 const {VisualResource}=load('components/documents/visual-resource.tsx',{react:React,'@/lib/validations/visual':schemas});
 const value=copy(),art=value.scene.artwork;
 art.figures[0].annotations[0].label='<script>atacar</script>';
 art.figures[0].evidence='Cita literal <script> de prueba.';
 const html=renderToStaticMarkup(React.createElement(VisualResource,{value}));
 for(const text of [art.objective,art.takeaway,art.scopeNote,art.figures[0].explanation,'Leyenda del gráfico','Ver respaldo en el PDF'])assert.ok(html.includes(text));
 assert.match(html,/<ellipse/);assert.match(html,/<polyline/);assert.match(html,/<figcaption/);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<image|foreignObject|onclick=/);
 const two=renderToStaticMarkup(React.createElement('div',null,React.createElement(VisualResource,{value}),React.createElement(VisualResource,{value})));
 const ids=[...two.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
