import assert from 'node:assert/strict';
import test from 'node:test';
import {load} from './reinforcement-test-helpers.mjs';

test('ABCD waits for every answer, sends indexes once and displays only the server score and explanations',async()=>{
  const states=[],refs=[],calls=[];let cursor=0,refCursor=0,tree,release;
  const pending=new Promise(resolve=>{release=resolve;});
  const {QuizPlayer}=load('components/documents/quiz-player.tsx',{react:{
    useId:()=> 'abcd',useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},
    useRef(initial){return refs[refCursor++]??={current:initial};},useLayoutEffect(){},
  }});
  const quiz={title:'Comprueba lo aprendido',allowRetries:false,questions:[
    {prompt:'Primera pregunta de prueba',options:['Uno','Dos','Tres','Cuatro']},
    {prompt:'Segunda pregunta de prueba',options:['Primero','Segundo','Tercero','Cuarto']},
  ]};
  function nodes(n){return !n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];}
  function render(){cursor=0;refCursor=0;tree=QuizPlayer({quiz,onSubmit:async answers=>{calls.push(answers);return pending;}});}
  const elements=()=>nodes(tree),radios=()=>elements().filter(n=>n.type==='input');
  const submit=()=>elements().find(n=>n.type==='button'&&n.props.type==='submit');
  render();assert.equal(submit().props.disabled,true);assert.equal(radios().length,8);
  assert.deepEqual(elements().filter(n=>n.type==='strong').map(n=>n.props.children.flat().join('')),['A. ','B. ','C. ','D. ','A. ','B. ','C. ','D. ']);
  radios()[3].props.onChange();render();assert.equal(submit().props.disabled,true);
  radios()[5].props.onChange();render();assert.equal(submit().props.disabled,false);
  const send=elements().find(n=>n.type==='form').props.onSubmit;
  send({preventDefault(){}});send({preventDefault(){}});assert.deepEqual(calls,[[3,1]]);
  render();assert.equal(submit().props.disabled,true);assert.equal(elements().some(n=>n.props?.role==='status'),false);
  release({score:1,total:2,questions:[{correct:true,correctOption:'Cuatro',explanation:'Explicación uno del servidor.'},{correct:false,correctOption:'Primero',explanation:'Explicación dos del servidor.'}]});
  await new Promise(resolve=>setImmediate(resolve));render();
  assert.equal(submit(),undefined);assert.ok(elements().filter(n=>n.type==='fieldset').every(n=>n.props.disabled));
  const result=elements().find(n=>n.props?.role==='status');assert.equal(Array.from(result.props.children).join(''),'Resultado: 1 de 2');
  assert.ok(elements().some(n=>n.type==='p'&&JSON.stringify(n.props.children).includes('50')));
  assert.ok(elements().some(n=>n.type==='p'&&n.props.children==='Explicación dos del servidor.'));
  assert.equal(elements().some(n=>n.type==='button'&&n.props.children==='Reintentar mini quiz'),false);
});
