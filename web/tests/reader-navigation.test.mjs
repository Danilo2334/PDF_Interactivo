import assert from 'node:assert/strict';
import test from 'node:test';
import {load} from './reinforcement-test-helpers.mjs';

function fixture(wide=false){
  class Element {
    isConnected=true;scrollLeft=72;focused=0;scrolled=0;
    focus(){this.focused++;document.activeElement=this;}
    scrollIntoView(){this.scrolled++;window.scrollY=0;}
    querySelector(){return this.button??this;}
  }
  const trigger=new Element(),figure=new Element(),first=new Element(),other=new Element(),root=new Element(),panel=new Element();
  first.button=new Element();other.button=new Element();panel.button=new Element();
  root.querySelector=selector=>selector.includes('data-pdf-page')?figure:trigger;
  panel.querySelector=selector=>selector.includes('"first"')?first:selector.includes('"other"')?other:panel.button;
  const window={scrollX:8,scrollY:630,scrollTo({left,top}){this.scrollX=left;this.scrollY=top;}};
  const document={activeElement:trigger},states=[],refs=[];let cursor=0,refCursor=0,effects=[],tree;
  function PdfViewer(){}
  const opens=[];
  const api=load('components/readers/reader-experience.tsx',{
    react:{useId:()=> 'reader-nav',useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},
      useRef(initial){return refs[refCursor++]??=( {current:initial} );},useCallback:f=>f,useMemo:f=>f(),useLayoutEffect:f=>effects.push(f),useEffect(){}},
    'next/image':{default:()=>null},'@/components/documents/pdf-viewer':{PdfViewer},'@/components/documents/visual-resource':{VisualResource:()=>null},
    '@/components/documents/summary-resource':{SummaryResource:()=>null},'@/lib/validations/reader':{},'@/components/readers/reader-quiz':{ReaderQuiz:()=>null},
    '@/lib/readers/layout':{useWideReader:()=>wide},
    '@/components/readers/reader-open-reporter':{ReaderOpenReporter:()=>null},
    '@/components/readers/use-reinforcement-opens':{useReinforcementOpens:()=>({opened:items=>opens.push(...items),acceptedVisit(){}})},
  },{window,document,HTMLElement:Element,CSS:{escape:x=>x}});
  const view={name:'QA',version:1,privateTest:true,items:[{id:'first',title:'Energía',pageNumber:1,initialExpanded:false,selection:null},{id:'second',title:'Péndulo',pageNumber:1,initialExpanded:true,selection:null},{id:'other',title:'Agua',pageNumber:2,initialExpanded:false,selection:null}]};
  function nodes(n){if(!n||typeof n!=='object')return [];return[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
  function render(){cursor=0;refCursor=0;effects=[];tree=api.Reading({view,endpoint:'/private-qa'});for(const n of nodes(tree)){if(n.type==='div'&&n.props.ref)n.props.ref.current=root;if(n.type==='section'&&n.props.ref)n.props.ref.current=panel;}for(const f of effects)f();}
  render();return {render,window,trigger,figure,first,other,panel,opens,pdf:()=>nodes(tree).find(n=>n.type===PdfViewer),cards:()=>nodes(tree).filter(n=>n.type?.name==='ReaderCard'),button:name=>nodes(tree).find(n=>n.type==='button'&&n.props.children===name),nodes:()=>nodes(tree)};
}

test('HU038 only explicit opening reports visible content, not indicators, render, collapse, passive page changes or the already open panel',()=>{
  const f=fixture();assert.equal(f.opens.length,0);
  f.button('Refuerzos').props.onClick();f.render();assert.deepEqual(f.opens.map(x=>x.id),['second']);
  f.button('Refuerzos').props.onClick();f.render();assert.equal(f.opens.length,1);
  f.cards().find(x=>x.props.item.id==='first').props.onToggle();f.render();assert.equal(f.opens.at(-1).id,'first');
  f.cards().find(x=>x.props.item.id==='first').props.onToggle();f.render();assert.equal(f.opens.length,2);
  f.pdf().props.onVisiblePageChange(2);f.render();assert.equal(f.opens.length,2);
  f.pdf().props.onReinforcementActivate('other',2);f.render();assert.equal(f.opens.at(-1).id,'other');assert.equal(f.opens.at(-1).pageNumber,2);
  f.pdf().props.onReinforcementActivate('other',2);f.render();assert.equal(f.opens.length,3);
  f.button('PDF original').props.onClick();f.render();f.button('Refuerzos').props.onClick();f.render();assert.equal(f.opens.length,4);
});

test('HU034 active page drives the exact list and indicator identity without changing the PDF source',()=>{
  const f=fixture(),source=f.pdf().props.sourceUrl;
  assert.deepEqual(f.cards().map(n=>n.props.item.title),['Energía','Péndulo']);
  f.pdf().props.onVisiblePageChange(2);f.render();assert.deepEqual(f.cards().map(n=>n.props.item.title),['Agua']);
  f.pdf().props.onReinforcementActivate('other',2);f.render();assert.equal(f.cards()[0].props.expanded,true);assert.equal(f.other.scrolled,1);assert.equal(f.other.button.focused,1);
  assert.equal(f.pdf().props.sourceUrl,source);f.pdf().props.onVisiblePageChange(3);f.render();assert.equal(f.cards().length,0);
});

test('HU034 selecting a marker expands and focuses its own card; closing restores both scroll axes, page offset and focus',()=>{
  const f=fixture();f.pdf().props.onReinforcementActivate('first',1);f.render();
  assert.equal(f.cards().find(n=>n.props.item.id==='first').props.expanded,true);assert.equal(f.first.button.focused,1);
  f.figure.scrollLeft=0;f.window.scrollX=0;f.window.scrollY=0;
  f.button('Cerrar refuerzos y volver al PDF').props.onClick();f.render();
  assert.equal(f.window.scrollX,8);assert.equal(f.window.scrollY,630);assert.equal(f.figure.scrollLeft,72);assert.equal(f.trigger.focused,1);
  assert.equal(f.pdf().props.visible,true);
});

test('HU034 opening the already selected panel cannot overwrite the saved reading position; source navigation is explicit',()=>{
  const f=fixture();f.button('Refuerzos').props.onClick();f.render();f.window.scrollY=15;
  f.button('Refuerzos').props.onClick();f.render();f.button('PDF original').props.onClick();f.render();assert.equal(f.window.scrollY,630);
  f.pdf().props.onVisiblePageChange(2);f.render();f.button('Refuerzos').props.onClick();f.render();f.cards()[0].props.onSource();f.render();
  assert.equal(f.pdf().props.initialPage,2);assert.equal(f.pdf().props.navigationKey,1);assert.equal(f.pdf().props.visible,true);
});

test('HU035 wide screens keep the PDF active beside the panel and narrow screens retain page controls with paused canvases',()=>{
  for(const wide of [false,true]){
    const f=fixture(wide);f.button('Refuerzos').props.onClick();f.render();
    assert.equal(f.pdf().props.visible,wide);assert.equal(f.pdf().props.pagesHidden,!wide);assert.equal(f.pdf().props.floatingReinforcements,false);
    assert.ok(f.nodes().filter(n=>n.props?.ref).every(n=>n.type!=='div'||n.props.hidden!==true));
    f.pdf().props.onHiddenNavigate(2);f.render();assert.deepEqual(f.cards().map(n=>n.props.item.title),['Agua']);
    f.window.scrollY=130;f.button('Cerrar refuerzos y volver al PDF').props.onClick();f.render();
    assert.equal(f.pdf().props.visible,true);assert.equal(f.pdf().props.initialPage,2);assert.equal(f.pdf().props.navigationKey,1);assert.equal(f.window.scrollY,130);
  }
});
