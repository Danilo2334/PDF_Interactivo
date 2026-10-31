import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText,{exports,...globals,require(name){if(name in dependencies)return dependencies[name];throw Error(name);}});
  return exports;
}
const math = load('lib/pdf/fragment-selection.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const bounds={left:100,top:200,width:800,height:1000};
function nearRect(actual,expected){for(const key of ['x','y','width','height'])assert.ok(Math.abs(actual[key]-expected[key])<1e-12, key);}

test('rectangle coordinates are proportional, direction independent and unchanged by proportional zoom',()=>{
  const expected={x:.25,y:.2,width:.5,height:.4};
  nearRect(math.proportionalRect(300,400,700,800,bounds),expected);
  nearRect(math.proportionalRect(700,800,300,400,bounds),expected);
  nearRect(math.proportionalRect(350,450,850,950,{left:100,top:200,width:1000,height:1250}),expected);
});
test('outside drags clip to the page and empty or invalid geometry never creates a selection',()=>{
  assert.deepEqual(plain(math.proportionalRect(0,0,2000,2000,bounds)),{x:0,y:0,width:1,height:1});
  for(const [x,y,x2,y2,b] of [[100,200,100,400,bounds],[0,0,10,10,bounds],[NaN,200,400,600,bounds],[100,200,400,600,{...bounds,width:0}]]){
    assert.equal(math.proportionalRect(x,y,x2,y2,b),null);
  }
});
test('movement and resize stay within page bounds including a narrow selection at its edge',()=>{
  const rect={x:.2,y:.3,width:.4,height:.2};
  assert.deepEqual(plain(math.moveRect(rect,1,-1)),{...rect,x:.6,y:0});
  assert.deepEqual(plain(math.resizeRect(rect,2,2)),{...rect,width:.8,height:.7});
  const edge=math.resizeRect({x:.999,y:.998,width:.001,height:.002},-1,-1);
  assert.ok(edge.x+edge.width<=1 && edge.y+edge.height<=1);
});
function textFixture({foreign=false,collapsed=false,text='idea. Segunda idea.'}={}){
  const start={},end={},all='Primera idea. Segunda idea.';
  const prefix={offset:0,selectNodeContents(){},setEnd(node,offset){this.offset=offset;},toString(){return all.slice(0,this.offset);}};
  const range={startContainer:start,endContainer:foreign?{}:end,startOffset:8,endOffset:26,
    cloneRange:()=>prefix,toString:()=>text,getClientRects:()=>[
      {left:300,top:400,right:700,bottom:430},{left:300,top:450,right:600,bottom:480},{left:0,top:0,right:0,bottom:0},
    ]};
  return {layer:{contains:node=>node===start||node===end},surface:{getBoundingClientRect:()=>bounds},selection:{isCollapsed:collapsed,rangeCount:1,getRangeAt:()=>range,toString:()=>text}};
}
test('native text selection supplies reading-order text, serializable range and proportional line rectangles',()=>{
  const f=textFixture(); const value=math.readTextFragment(f.layer,f.surface,2,f.selection);
  assert.equal(value.kind,'text');assert.equal(value.pageNumber,2);assert.equal(value.text,'idea. Segunda idea.');
  assert.deepEqual(plain(value.range),{start:8,end:26});assert.equal(value.rects.length,2);
  assert.equal(value.rects[0].x,.25);
});
test('cross-page, collapsed and whitespace selections cannot leak a foreign range into the draft',()=>{
  for(const options of [{foreign:true},{collapsed:true},{text:'  '}]){
    const f=textFixture(options);assert.equal(math.readTextFragment(f.layer,f.surface,2,f.selection),null);
  }
});

function controllerFixture({ failRead = false, failRender = false } = {}){
  class Element{
    children=[];dataset={};style={setProperty(){}};attributes={};captures=new Set();
    append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
    replaceChildren(){this.children=[];}
    remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
    setAttribute(name,value){this.attributes[name]=value;}
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:1000};}
    setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
    closest(){return this.dataset.selectedZone?this:null;}
    querySelector(selector){return this.children.flatMap(c=>[c,...c.children]).find(c=>selector.includes('resize')?c.dataset.resizeHandle:c.dataset.selectedZone);}
    focus(){}
  }
  const listeners=new Map(),changes=[],cancelled=[];let cleared=0;
  class TextLayer{constructor({container}){this.container=container;}async render(){if(failRender)throw Error('text render unavailable');}cancel(){cancelled.push(this);}}
  const {createPageFragments}=load('lib/pdf/page-fragments.ts',{'./fragment-selection':math},{
    structuredClone,
    document:{createElement:()=>new Element(),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)},
    window:{getSelection:()=>({removeAllRanges(){cleared++;}})},
  });
  const controller=createPageFragments(TextLayer,value=>changes.push(value));const body=new Element();
  const event=(x,y,target=new Element())=>({button:0,pointerId:1,clientX:x,clientY:y,target,preventDefault(){}});
  return {controller,body,changes,listeners,cancelled,event,get cleared(){return cleared;},async ready(){await controller.decorate({pageNumber:2,getTextContent:async()=>{if(failRead)throw Error('unreadable text');return {items:[]};}},body,{scale:1});return body.children[1];}};
}
test('a real controller gesture draws, moves and resizes one area then cancellation removes temporary data',async()=>{
  const f=controllerFixture(),surface=await f.ready();f.controller.setMode('area');
  surface.onpointerdown(f.event(100,200));surface.onpointermove(f.event(400,500));surface.onpointerup(f.event(400,500));
  nearRect(f.changes.at(-1).rect,{x:.1,y:.2,width:.3,height:.3});
  const marks=surface.children[0],zone=marks.children[0];
  surface.onpointerdown(f.event(200,300,zone));surface.onpointermove(f.event(300,400));surface.onpointerup(f.event(300,400));
  assert.equal(f.changes.at(-1).rect.x,.2);
  const handle=marks.children[0].children[0];
  surface.onpointerdown(f.event(500,600,handle));surface.onpointermove(f.event(600,700));surface.onpointerup(f.event(600,700));
  assert.ok(f.changes.at(-1).rect.width>.39);
  f.controller.clear();assert.equal(f.changes.at(-1),null);assert.equal(marks.children.length,0);assert.equal(marks.dataset.selection,undefined);
  f.controller.dispose();assert.equal(f.listeners.size,0);assert.ok(f.cancelled.length>0);
});

test('restored text and area paint on the correct page before or after decoration without retaining caller references', async () => {
  for (const value of [
    { kind: 'area', pageNumber: 2, rect: { x: .1, y: .2, width: .3, height: .4 } },
    { kind: 'text', pageNumber: 2, text: 'Texto guardado', range: { start: 2, end: 16 }, rects: [{ x: .1, y: .2, width: .3, height: .04 }] },
  ]) {
    const f = controllerFixture(), expected = structuredClone(value);
    assert.equal(f.controller.restore(value), true);
    const surface = await f.ready(), marks = surface.children[0];
    assert.deepEqual(JSON.parse(marks.dataset.selection), expected);
    assert.equal(marks.children[0].style.left, '10%');
    (value.rect ?? value.rects[0]).x = .7;
    f.controller.setMode(value.kind);
    assert.equal(marks.children[0].style.left, '10%');
    assert.equal(f.controller.restore({ kind: 'area', pageNumber: 2, rect: { x: .9, y: 0, width: .5, height: 1 } }), false);
    assert.deepEqual(JSON.parse(marks.dataset.selection), expected);
    f.controller.clearOtherPage(3); assert.equal(marks.children.length, 0);
    f.controller.dispose(); assert.equal(f.controller.restore(expected), false);
  }
});
test('keyboard area creation, correction and changing page obey the same single-selection model',async()=>{
  const f=controllerFixture(),surface=await f.ready();f.controller.setMode('area');
  const key=(key,shiftKey=false)=>surface.onkeydown({key,shiftKey,target:surface,preventDefault(){}});
  key('Enter');assert.equal(f.changes.at(-1).rect.x,.25);
  key('ArrowRight');assert.equal(f.changes.at(-1).rect.x,.26);
  key('ArrowDown',true);assert.equal(f.changes.at(-1).rect.height,.26);
  f.controller.clearOtherPage(3);assert.equal(f.changes.at(-1),null);f.controller.dispose();
});
test('a text read/render failure keeps the page and area selection available for manual transcription', async () => {
  for (const options of [{ failRead: true }, { failRender: true }]) {
    const f = controllerFixture(options), surface = await f.ready();
    assert.equal(f.body.children[0].dataset.textUnavailable, 'true');
    f.controller.setMode('area');
    surface.onkeydown({ key: 'Enter', target: surface, preventDefault() {} });
    assert.equal(f.changes.at(-1).kind, 'area');
    assert.equal(f.changes.at(-1).pageNumber, 2);
    f.controller.dispose(); assert.equal(f.listeners.size, 0);
  }
});
