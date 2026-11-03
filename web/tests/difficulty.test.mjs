import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const {outputText}=ts.transpileModule(readFileSync(new URL('../lib/validations/difficulty.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
});
const api={};runInNewContext(outputText,{exports:api,structuredClone});
const valid={category:'concept',observation:'No entiendo cómo se obtiene este resultado.'};
const context={documentId:'own-document',pageNumber:4,fragment:null};

test('a difficulty accepts exactly one known category and refuses missing or unrecognized values',()=>{
  for(const item of api.DIFFICULTY_CATEGORIES)assert.equal(api.validateDifficulty({...valid,category:item.value}).success,true);
  for(const category of ['',null,[],['concept','other'],'unknown','concept,other']){
    const result=api.validateDifficulty({...valid,category});assert.equal(result.success,false);assert.ok(result.errors.category);
  }
});
test('the configured explanation boundaries apply after trimming and whitespace cannot satisfy the minimum',()=>{
  const min=api.DIFFICULTY_MIN_LENGTH,max=api.DIFFICULTY_MAX_LENGTH;
  for(const observation of [null,{},'', ' '.repeat(min+10),'  '+ 'x'.repeat(min-1)+'  ','x'.repeat(max+1)]){
    const result=api.validateDifficulty({...valid,observation});assert.equal(result.success,false);assert.ok(result.errors.observation);
  }
  for(const length of [min,max])assert.equal(api.validateDifficulty({...valid,observation:'  '+'á'.repeat(length)+'  '}).value.observation.length,length);
});
test('confirmation copies a text/area selection and supports a whole page without modifying its source',()=>{
  for(const fragment of [null,{documentId:'own-document',pageNumber:4,kind:'text',text:'Idea',range:{start:0,end:4},rects:[]},
    {documentId:'own-document',pageNumber:4,kind:'area',rect:{x:.1,y:.2,width:.3,height:.4}}]){
    const saved=api.createDifficultyDraft({...context,fragment},{...valid,observation:'  '+valid.observation+'  '});
    assert.equal(saved.documentId,context.documentId);assert.equal(saved.pageNumber,4);assert.equal(saved.observation,valid.observation);
    if(fragment){assert.notEqual(saved.fragment,fragment);if(fragment.kind==='area'){fragment.rect.x=.9;assert.equal(saved.fragment.rect.x,.1);}}
  }
});
test('confirmation rejects an invalid page, document, foreign fragment or incomplete observation',()=>{
  for(const value of [{...context,pageNumber:0},{...context,pageNumber:1.5},{...context,documentId:''},
    {...context,fragment:{documentId:'foreign-document',pageNumber:4}}, {...context,fragment:{documentId:'own-document',pageNumber:3}}]){
    assert.equal(api.createDifficultyDraft(value,valid),null);
  }
  assert.equal(api.createDifficultyDraft(context,{...valid,observation:'Muy corto'}),null);
});
