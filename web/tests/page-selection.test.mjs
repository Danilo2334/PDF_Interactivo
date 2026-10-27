import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const viewer = () => null, draftForm = () => null;
const difficultyCode = ts.transpileModule(readFileSync(new URL('../lib/validations/difficulty.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const difficulty = {};
runInNewContext(difficultyCode, { exports: difficulty, structuredClone });
function fixture(path, exportedName, initialProps) {
  const states = [], callbacks = []; let cursor = 0, callbackCursor = 0, props = initialProps, tree;
  const react = {
    useId: () => 'draft-page',
    useRef: () => ({ current: null }),
    useEffect: () => {},
    useState(initial) {
      const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useCallback(callback, dependencies) {
      const index = callbackCursor++, previous = callbacks[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) callbacks[index] = { callback, dependencies };
      return callbacks[index].callback;
    },
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/components/documents/pdf-viewer') return { PdfViewer: viewer };
    if (name === '@/components/documents/reinforcement-request-draft') return { ReinforcementRequestDraft: draftForm };
    if (name === '@/lib/validations/difficulty') return difficulty;
    throw Error(`Unexpected dependency ${name}`);
  } });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children, node.props?.requestDraft].flat(Infinity).flatMap(nodes)];
  }
  const render = (nextProps = props) => { props = nextProps; cursor = 0; callbackCursor = 0; tree = exports[exportedName](props); };
  render();
  return { render, find: predicate => nodes(tree).find(predicate), get props() { return props; } };
}
const props = { projectId: 'project', documentId: 'document-a', documentName: 'original.pdf', canRequestReinforcement: true, reinforcements: [], reinforcementsError: false };

test('one shared draft captures document and page, replaces the previous page and keeps the viewer callback stable', () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const callback = f.find(n => n.type === viewer).props.onPageSelect;
  callback(3); f.render();
  assert.equal(f.find(n => n.type === draftForm).props.selection.documentId, 'document-a');
  assert.equal(f.find(n => n.type === draftForm).props.selection.pageNumber, 3);
  assert.equal(f.find(n => n.type === viewer).props.onPageSelect, callback);
  callback(4); f.render(); assert.equal(f.find(n => n.type === draftForm).props.selection.pageNumber, 4);
  callback(null); f.render(); assert.equal(f.find(n => n.type === draftForm).props.selection, null);
});

test('another document cannot inherit the old selection or reuse the open draft component', () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const oldCallback = f.find(n => n.type === viewer).props.onPageSelect;
  oldCallback(3); f.render(); const oldKey = f.find(n => n.type === draftForm).key;
  f.render({ ...props, documentId: 'document-b' });
  assert.equal(f.find(n => n.type === draftForm).props.selection, null);
  assert.notEqual(f.find(n => n.type === draftForm).key, oldKey);
  assert.equal(f.find(n => n.type === viewer).props.initialPage, 1);
  oldCallback(4); f.render(); assert.equal(f.find(n => n.type === draftForm).props.selection, null);
});

test('a role without private document management cannot open the request draft', () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', { ...props, canRequestReinforcement: false });
  assert.equal(f.find(n => n.type === draftForm), undefined);
  assert.equal(f.find(n => n.type === viewer).props.onPageSelect, undefined);
});

test('closing and reopening the real draft component preserves page and document, and a foreign selection is rejected', () => {
  const initial = { ...props, selection: { documentId: props.documentId, pageNumber: 3 } };
  const f = fixture('components/documents/reinforcement-request-draft.tsx', 'ReinforcementRequestDraft', initial);
  const openButton = () => f.find(n => n.type === 'button' && n.props.children === 'Abrir solicitud de refuerzo');
  const closeButton = () => f.find(n => n.type === 'button' && n.props.children === 'Cerrar borrador');
  openButton().props.onClick(); f.render();
  assert.equal(f.find(n => n.type === 'input' && n.props.name === 'pageNumber').props.value, 3);
  assert.equal(f.find(n => n.type === 'input' && n.props.name === 'documentId').props.value, props.documentId);
  closeButton().props.onClick(); f.render(); openButton().props.onClick(); f.render();
  assert.equal(f.find(n => n.type === 'input' && n.props.name === 'pageNumber').props.value, 3);
  f.render({ ...initial, selection: { documentId: 'another-document', pageNumber: 4 } });
  assert.equal(f.find(n => n.type === 'input' && n.props.name === 'pageNumber').props.value, '');
  closeButton().props.onClick(); f.render(); assert.equal(openButton().props.disabled, true);
});

test('Escape closes the draft and reopening retains the selection without replacing the viewer', () => {
  const initial = { ...props, selection: { documentId: props.documentId, pageNumber: 4 } };
  const f = fixture('components/documents/reinforcement-request-draft.tsx', 'ReinforcementRequestDraft', initial);
  const open = () => { f.find(n => n.type === 'button').props.onClick(); f.render(); };
  open(); f.find(n => n.type === 'dialog').props.onCancel(); f.render();
  assert.equal(f.find(n => n.type === 'form'), undefined);
  open(); assert.equal(f.find(n => n.type === 'input' && n.props.name === 'pageNumber').props.value, 4);
});

test('shared fragment follows its page and document and a new document cannot inherit text or coordinates',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props);
  let v=f.find(n=>n.type===viewer);
  v.props.onPageSelect(3); f.render();v=f.find(n=>n.type===viewer);
  v.props.onFragmentSelect({kind:'area',pageNumber:3,rect:{x:.1,y:.2,width:.3,height:.4}});f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.fragment.documentId,props.documentId);
  f.render({...props,documentId:'another-document'});
  assert.equal(f.find(n=>n.type===draftForm).props.fragment,null);
});
test('clearing the shared draft discards its fragment and tells the viewer to clear temporary marks',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props);
  f.find(n=>n.type===viewer).props.onPageSelect(2); f.render();
  f.find(n=>n.type===viewer).props.onFragmentSelect({kind:'text',pageNumber:2,text:'Original text',range:{start:0,end:13},rects:[]});f.render();
  const before=f.find(n=>n.type===viewer).props.fragmentResetKey;
  f.find(n=>n.type===draftForm).props.onClearSelection();f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.fragment,null);
  assert.equal(f.find(n=>n.type===viewer).props.fragmentResetKey,before+1);
});
test('draft preview carries selected text and range and becomes empty after cancellation',()=>{
  const initial={...props,selection:{documentId:props.documentId,pageNumber:2},fragment:{documentId:props.documentId,kind:'text',pageNumber:2,text:'First line\nSecond line',range:{start:0,end:22},rects:[]}};
  const f=fixture('components/documents/reinforcement-request-draft.tsx','ReinforcementRequestDraft',initial);
  f.find(n=>n.type==='button').props.onClick();f.render();
  assert.equal(f.find(n=>n.type==='blockquote').props.children,'First line\nSecond line');
  assert.ok(f.find(n=>n.type==='input'&&n.props.name==='fragment').props.value.includes('range'));
  f.render({...initial,fragment:null});
  assert.equal(f.find(n=>n.type==='blockquote'),undefined);
  assert.equal(f.find(n=>n.type==='input'&&n.props.name==='fragment').props.value,'');
});

test('difficulty category and observation live in the shared workspace across form/section reopening and temporary loading',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props);
  const page=f.find(n=>n.type===viewer).props.onPageSelect;
  page(2);f.render();
  f.find(n=>n.type===draftForm).props.onDifficultyChange({category:'vocabulary',observation:'No entiendo el significado de esta palabra.'});f.render();
  f.find(n=>n.type==='button'&&n.props.children==='Refuerzos').props.onClick();f.render();
  f.find(n=>n.type==='button'&&n.props.children==='PDF original').props.onClick();f.render();
  page(null);f.render();page(2);f.render();
  const input=f.find(n=>n.type===draftForm).props.difficultyInput;
  assert.equal(input.category,'vocabulary');assert.equal(input.observation,'No entiendo el significado de esta palabra.');
  assert.equal(f.find(n=>n.type===viewer).props.onPageSelect,page);
});

test('confirming difficulty snapshots the current text or area and edits invalidate the confirmed association',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props);
  f.find(n=>n.type===viewer).props.onPageSelect(3);f.render();
  const fragments=[{kind:'text',pageNumber:3,text:'Un concepto',range:{start:4,end:15},rects:[]},
    {kind:'area',pageNumber:3,rect:{x:.1,y:.2,width:.3,height:.4}}];
  for(const fragment of fragments){
    f.find(n=>n.type===viewer).props.onFragmentSelect(fragment);f.render();
    f.find(n=>n.type===draftForm).props.onDifficultyChange({category:'concept',observation:'  No entiendo cómo se obtiene este resultado.  '});f.render();
    f.find(n=>n.type===draftForm).props.onConfirmDifficulty();f.render();
    const saved=f.find(n=>n.type===draftForm).props.difficultyDraft;
    assert.equal(saved.documentId,props.documentId);assert.equal(saved.pageNumber,3);assert.equal(saved.fragment.kind,fragment.kind);
    assert.equal(saved.observation,'No entiendo cómo se obtiene este resultado.');
  }
  f.find(n=>n.type===draftForm).props.onDifficultyChange({category:'other',observation:'Cambio mi explicación de la dificultad.'});f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.difficultyDraft,null);
  f.find(n=>n.type===draftForm).props.onConfirmDifficulty();f.render();
  f.find(n=>n.type===draftForm).props.onClearSelection();f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.difficultyDraft,null);
});

test('incomplete difficulty cannot be confirmed and a different page or document never inherits it',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props);
  f.find(n=>n.type===viewer).props.onPageSelect(2);f.render();
  f.find(n=>n.type===draftForm).props.onDifficultyChange({category:'concept',observation:'   corta   '});f.render();
  f.find(n=>n.type===draftForm).props.onConfirmDifficulty();f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.difficultyDraft,null);
  f.find(n=>n.type===viewer).props.onPageSelect(3);f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.difficultyInput.observation,'');
  const oldChange=f.find(n=>n.type===draftForm).props.onDifficultyChange;
  f.render({...props,documentId:'new-document'});
  oldChange({category:'concept',observation:'Una explicación válida para el documento viejo.'});f.render();
  assert.equal(f.find(n=>n.type===draftForm).props.difficultyInput.category,'');
  assert.equal(f.find(n=>n.type===draftForm).props.difficultyDraft,null);
});

test('the real draft form reports missing category and short explanation without confirming or submitting a request',()=>{
  let confirmations=0,prevented=0;
  const initial={...props,selection:{documentId:props.documentId,pageNumber:2},difficultyInput:{category:'',observation:'   '},onConfirmDifficulty:()=>confirmations++};
  const f=fixture('components/documents/reinforcement-request-draft.tsx','ReinforcementRequestDraft',initial);
  f.find(n=>n.type==='button').props.onClick();f.render();
  f.find(n=>n.type==='form').props.onSubmit({preventDefault(){prevented++;}});f.render();
  assert.equal(confirmations,0);assert.equal(prevented,1);
  assert.equal(f.find(n=>n.type==='select').props['aria-invalid'],true);
  assert.equal(f.find(n=>n.type==='textarea').props['aria-invalid'],true);
  assert.equal(f.find(n=>n.type==='input'&&n.props.name==='difficulty').props.value,'');
  f.render({...initial,difficultyInput:{category:'concept',observation:'x'.repeat(difficulty.DIFFICULTY_MIN_LENGTH-1)}});
  f.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});f.render();assert.equal(confirmations,0);
});

test('the form accepts the configured minimum and preserves its controlled fields after close and Escape',()=>{
  let confirmations=0;
  const initial={...props,selection:{documentId:props.documentId,pageNumber:2},difficultyInput:{category:'procedure',observation:'x'.repeat(difficulty.DIFFICULTY_MIN_LENGTH)},onConfirmDifficulty:()=>confirmations++};
  const f=fixture('components/documents/reinforcement-request-draft.tsx','ReinforcementRequestDraft',initial);
  const open=()=>{f.find(n=>n.type==='button').props.onClick();f.render();};
  open();f.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});f.render();assert.equal(confirmations,1);
  assert.equal(f.find(n=>n.type==='select').props.multiple,undefined);
  f.find(n=>n.type==='button'&&n.props.children==='Cerrar borrador').props.onClick();f.render();open();
  assert.equal(f.find(n=>n.type==='select').props.value,'procedure');
  f.find(n=>n.type==='dialog').props.onCancel();f.render();open();
  assert.equal(f.find(n=>n.type==='textarea').props.value,initial.difficultyInput.observation);
});

test('the draft payload includes the document, page and selected fragment and rejects foreign context',()=>{
  const context={documentId:props.documentId,pageNumber:2,fragment:{documentId:props.documentId,pageNumber:2,kind:'area',rect:{x:.1,y:.2,width:.3,height:.4}}};
  const saved=difficulty.createDifficultyDraft(context,{category:'connection',observation:'No entiendo la relación entre estas dos ideas.'});
  const initial={...props,selection:{documentId:props.documentId,pageNumber:2},difficultyDraft:saved};
  const f=fixture('components/documents/reinforcement-request-draft.tsx','ReinforcementRequestDraft',initial);
  f.find(n=>n.type==='button').props.onClick();f.render();
  assert.deepEqual(JSON.parse(f.find(n=>n.type==='input'&&n.props.name==='difficulty').props.value),JSON.parse(JSON.stringify(saved)));
  f.render({...initial,selection:{documentId:props.documentId,pageNumber:3}});
  assert.equal(f.find(n=>n.type==='input'&&n.props.name==='difficulty').props.value,'');
  f.render({...initial,documentId:'another-document'});
  assert.equal(f.find(n=>n.type==='input'&&n.props.name==='difficulty').props.value,'');
});
