import assert from 'node:assert/strict';
import test from 'node:test';
import {load} from './reinforcement-test-helpers.mjs';
const feedback={score:1,total:1,questions:[{correct:true,correctOption:'Se conserva',explanation:'La energía se conserva.'}]};
const quiz={title:'QA foco',allowRetries:true,questions:[{prompt:'¿Qué ocurre?',options:['Se conserva','Desaparece']}]};

function fixture({stored=false,fail=false}={}){
  const states=[],refs=[],focused=[],calls=[];let cursor=0,refCursor=0,effects=[],tree;
  const answer={focus:()=>focused.push('answer')},result={focus:()=>focused.push('result')},submit={focus:()=>focused.push('submit')},form={querySelector:()=>answer};
  const {QuizPlayer}=load('components/documents/quiz-player.tsx',{react:{useId:()=> 'quiz-focus',useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){return refs[refCursor++]??={current:initial};},useLayoutEffect:effect=>effects.push(effect)}});
  function nodes(n){if(!n||typeof n!=='object')return [];return[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
  function render(){cursor=0;refCursor=0;effects=[];tree=QuizPlayer({quiz,initialResult:stored?{answers:[0],feedback}:null,onRetry:()=>calls.push('retry'),onSubmit:async a=>{calls.push(a);if(fail)throw Error('Red no disponible');return feedback;}});for(const n of nodes(tree)){if(n.props?.ref)n.props.ref.current=n.type==='form'?form:n.type==='p'?result:submit;}for(const e of effects)e();}
  render();return{render,focused,calls,nodes:()=>nodes(tree),select(){nodes(tree).find(n=>n.type==='input').props.onChange();render();},send(){nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});},retry(){nodes(tree).find(n=>n.type==='button'&&n.props.children==='Reintentar mini quiz').props.onClick();render();}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('HU035 stored feedback does not steal focus and retry moves focus to the first answer',()=>{
  const f=fixture({stored:true});assert.deepEqual(f.focused,[]);f.retry();assert.deepEqual(f.focused,['answer']);assert.deepEqual(f.calls,['retry']);
  assert.ok(f.nodes().filter(n=>n.type==='input').every(n=>n.props.checked===false));
});
test('HU035 successful keyboard submission focuses the new result instead of leaving focus on a removed button',async()=>{
  const f=fixture();f.select();f.send();await settle();f.render();assert.deepEqual(f.focused,['result']);assert.deepEqual(f.calls,[[0]]);
  const result=f.nodes().find(n=>n.props?.role==='status');assert.equal(result.props.tabIndex,-1);
});
test('HU035 failed submission returns focus to the retryable submit control',async()=>{
  const f=fixture({fail:true});f.select();f.send();await settle();f.render();assert.deepEqual(f.focused,['submit']);
  assert.equal(f.nodes().find(n=>n.props?.role==='alert').props.children,'Red no disponible');
});
