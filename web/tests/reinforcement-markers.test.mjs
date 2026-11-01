import assert from 'node:assert/strict';
import test from 'node:test';
import {load} from './reinforcement-test-helpers.mjs';
const layout=load('lib/pdf/reinforcement-markers.ts');
const placeReinforcementMarkers=(...args)=>structuredClone(layout.placeReinforcementMarkers(...args));
const rect={x:.2,y:.3,width:.4,height:.08};
const area=(id='a',pageNumber=1)=>({id,title:'Concepto '+id,pageNumber,selection:{kind:'area',pageNumber,rect}});

test('HU034 anchors area and text markers to their own page and preserves proportional selections across zoom and resize',()=>{
  const markers=[area(),{...area('text'),selection:{kind:'text',pageNumber:1,rects:[rect,{...rect,y:.4}]}},area('foreign',2)];
  for(const [width,height] of [[300,450],[600,900],[1200,1800]]){
    const placed=placeReinforcementMarkers(markers,1,width,height);
    assert.deepEqual(placed.map(x=>x.id),['a','text']);assert.deepEqual(placed[0].rects,[rect]);assert.equal(placed[1].rects.length,2);
    assert.ok(Math.abs(placed[0].left-.6*width)<.000001);assert.equal(placed[0].top,.3*height-44);
    assert.ok(placed.every(x=>x.left>=0&&x.left+44<=width&&x.top>=0&&x.top+44<=height));
  }
  assert.deepEqual(placeReinforcementMarkers(markers,3,600,900),[]);
});

test('HU034 overlapping selections keep distinct 44px controls and dense pages safely retain their list fallback',()=>{
  const markers=Array.from({length:40},(_,i)=>area(String(i)));
  const placed=placeReinforcementMarkers(markers,1,300,450);
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)assert.ok(Math.abs(placed[i].left-placed[j].left)>=44||Math.abs(placed[i].top-placed[j].top)>=44);
  assert.equal(placed.length,40);
  assert.ok(placeReinforcementMarkers(markers,1,44,44).length<=1);
  assert.equal(markers.length,40); // Layout never removes items from the authoritative list.
  assert.deepEqual(placeReinforcementMarkers(markers,1,NaN,900),[]);
});

test('HU034 malformed or foreign coordinates do not create misleading indicators; page-wide reinforcement remains usable',()=>{
  const malformed=[null,{},'invalid',{kind:'text',pageNumber:1,rects:'bad'},{kind:'area',pageNumber:2,rect},{kind:'area',pageNumber:1,rect:{...rect,x:.9}}];
  const results=malformed.map((selection,i)=>({id:String(i),title:'QA',pageNumber:1,selection}));
  const placed=placeReinforcementMarkers([...results,results[0]],1,600,900);
  assert.deepEqual(placed.map(x=>x.id),['0']);assert.equal(placed[0].rects.length,0);
});

test('HU034 decoration exposes safe accessible labels, exact reinforcement IDs and releases callbacks on redraw/disposal',()=>{
  class Element {children=[];style={};dataset={};attributes={};append(...children){for(const c of children){c.parent=this;this.children.push(c);}}setAttribute(k,v){this.attributes[k]=v;}remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}}
  const document={createElement:()=>new Element()},decorator=load('lib/pdf/reinforcement-markers.ts',{}, {document});
  const body=new Element(),events=[],markers=[{...area(),title:'<img src=x onerror=alert(1)>'}];
  const clear=decorator.decorateReinforcementMarkers(1,body,{width:600,height:900},markers,(...args)=>events.push(args));
  const layer=body.children[0],group=layer.children[0],highlight=group.children[0],button=group.children[1];
  assert.equal(highlight.style.left,'20%');assert.equal(highlight.style.width,'40%');assert.equal(button.dataset.reinforcementId,'a');
  assert.match(button.attributes['aria-label'],/Abrir refuerzo 1: <img/);assert.equal(button.children.length,0);
  button.onclick({stopPropagation(){}});assert.deepEqual(events,[['a',1]]);clear();assert.equal(button.onclick,null);assert.equal(body.children.length,0);
  const clearAgain=decorator.decorateReinforcementMarkers(1,body,{width:300,height:450},markers,()=>{});
  assert.equal(body.children[0].children[0].children[0].style.left,'20%');clearAgain();
});
