import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { validation as requestValidation, submission as requestSubmission } from './reinforcement-test-helpers.mjs';

const require = createRequire(import.meta.url);
const viewer = () => null, draftForm = () => null, requestPanel = () => null;
const difficultyCode = ts.transpileModule(readFileSync(new URL('../lib/validations/difficulty.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const difficulty = {};
runInNewContext(difficultyCode, { exports: difficulty, structuredClone });
function loadTextModule(path) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../lib/pdf/${path}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, { exports, structuredClone });
  return exports;
}
const textDraft = loadTextModule('selection-text-draft');
const textExtraction = loadTextModule('extract-selection-text');
const textEditor = () => null;
function fixture(path, exportedName, initialProps) {
  const states = [], callbacks = [], refs = []; let cursor = 0, callbackCursor = 0, refCursor = 0, props = initialProps, tree;
  const react = {
    useId: () => 'draft-page',
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useEffect: () => {}, useLayoutEffect: () => {},
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
  runInNewContext(outputText, { exports, window: { scrollX: 12, scrollY: 345 }, performance: { now: () => 0 }, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/components/documents/reinforcement-card') return { ReinforcementCard: 'article' };
    if (name === '@/components/documents/experience-preview') return { ExperiencePreview: 'preview' };
    if (name === '@/components/documents/publication-panel') return { PublicationPanel: 'publication' };
    if (name === '@/components/documents/pdf-viewer') return { PdfViewer: viewer };
    if (name === '@/components/documents/reinforcement-request-draft') return { ReinforcementRequestDraft: draftForm };
    if (name === '@/lib/validations/difficulty') return difficulty;
    if (name === '@/lib/pdf/selection-text-draft') return textDraft;
    if (name === '@/lib/pdf/extract-selection-text') return textExtraction;
    if (name === '@/components/documents/selection-text-editor') return { SelectionTextEditor: textEditor };
    if (name === '@/components/documents/reinforcement-submit') return { ReinforcementSubmit: () => null };
    if (name === '@/components/documents/request-list-panel') return { RequestListPanel: requestPanel };
    if (name === '@/components/documents/visual-resource') return { VisualResource: () => null };
    if (name === '@/components/documents/summary-resource') return { SummaryResource: () => null };
    if (name === '@/lib/validations/reinforcement-request') return requestValidation;
    if (name === '@/lib/reinforcements/submission') return requestSubmission;
    throw Error(`Unexpected dependency ${name}`);
  } });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children, node.props?.requestDraft].flat(Infinity).flatMap(nodes)];
  }
  const render = (nextProps = props) => { props = nextProps; cursor = 0; callbackCursor = 0; refCursor = 0; tree = exports[exportedName](props); };
  render();
  return { render, find: predicate => nodes(tree).find(predicate), get props() { return props; } };
}
const props = { projectId: 'project', documentId: 'document-a', documentName: 'original.pdf', canRequestReinforcement: true, reinforcements: [], reinforcementsError: false };

test('HU032 hides the floating PDF action while reviewing publication without losing the viewer, and scopes the suppression to this document',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props),original=f.find(n=>n.type===viewer);
  assert.equal(typeof original.props.onOpenReinforcements,'function');
  f.find(n=>n.type==='publication').props.onOpenChange(true);f.render();
  assert.equal(f.find(n=>n.type===viewer).key,original.key);assert.equal(f.find(n=>n.type===viewer).props.onOpenReinforcements,undefined);
  f.find(n=>n.type==='publication').props.onOpenChange(false);f.render();assert.equal(typeof f.find(n=>n.type===viewer).props.onOpenReinforcements,'function');
  f.find(n=>n.type==='publication').props.onOpenChange(true);f.render({...props,documentId:'document-b'});assert.equal(typeof f.find(n=>n.type===viewer).props.onOpenReinforcements,'function');
});

test('HU031 entering and leaving preview retains the original viewer identity, selection and unsubmitted difficulty input',()=>{
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',props),original=f.find(n=>n.type===viewer);
  original.props.onPageSelect(3);original.props.onVisiblePageChange(3);f.render();
  const form=()=>f.find(n=>n.type===draftForm),input={category:'concept',need:'Este texto sin guardar debe seguir al regresar al editor.'};
  form().props.onDifficultyChange(input);f.render();
  const fragment={kind:'area',pageNumber:3,rect:{x:.1,y:.2,width:.3,height:.4}};f.find(n=>n.type===viewer).props.onFragmentSelect(fragment);f.render();
  const before=JSON.stringify({selection:form().props.selection,fragment:form().props.fragment,input:form().props.difficultyInput});
  f.find(n=>n.type===viewer).props.onOpenPreview();f.render();
  const preview=f.find(n=>n.type==='preview');assert.equal(preview.props.initialPage,3);assert.equal(f.find(n=>n.type===viewer).key,original.key);assert.equal(f.find(n=>n.type===viewer).props.visible,false);
  assert.equal(JSON.stringify({selection:form().props.selection,fragment:form().props.fragment,input:form().props.difficultyInput}),before);
  preview.props.onClose();f.render();assert.equal(f.find(n=>n.type==='preview'),undefined);assert.equal(f.find(n=>n.type===viewer).props.visible,true);
  assert.equal(JSON.stringify({selection:form().props.selection,fragment:form().props.fragment,input:form().props.difficultyInput}),before);
});

test('HU025 keeps the same viewer while switching panels and scopes published content to the visible page and document', () => {
  const items=[{id:'one',document_id:'document-a',page_number:1,title:'Página uno',content:{}},
    {id:'two',document_id:'document-a',page_number:2,title:'Página dos',content:{}},
    {id:'foreign',document_id:'document-b',page_number:2,title:'Otro documento',content:{}}];
  const f=fixture('components/documents/project-workspace.tsx','ProjectWorkspace',{...props,reinforcements:items,canRequestReinforcement:false});
  const original=f.find(n=>n.type===viewer);assert.equal(original.props.visible,true);assert.equal(original.props.onPageSelect,undefined);
  assert.ok(f.find(n=>n.type==='article'&&n.props.reinforcement?.id==='one'));assert.equal(f.find(n=>n.type==='article'&&n.props.reinforcement?.id==='two'),undefined);
  original.props.onVisiblePageChange(2);f.render();assert.equal(f.find(n=>n.type==='article'&&n.props.reinforcement?.id==='one'),undefined);
  assert.ok(f.find(n=>n.type==='article'&&n.props.reinforcement?.id==='two'));assert.equal(f.find(n=>n.type==='article'&&n.props.reinforcement?.id==='foreign'),undefined);
  f.find(n=>n.type==='button'&&n.props.children==='Refuerzos').props.onClick();f.render();
  assert.equal(f.find(n=>n.type===viewer).key,original.key);assert.equal(f.find(n=>n.type===viewer).props.visible,false);
  f.find(n=>n.type==='button'&&n.props.children==='Cerrar refuerzos y volver al PDF').props.onClick();f.render();
  assert.equal(f.find(n=>n.type===viewer).key,original.key);assert.equal(f.find(n=>n.type===viewer).props.visible,true);
  original.props.onVisiblePageChange(3);f.render();assert.equal(f.find(n=>n.type==='article'),undefined);
});

test('opening a saved request restores its page and area without confirming or submitting new content', () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const panel = () => f.find(n => n.type === requestPanel);
  const saved = { id: 'saved-request', project_id: props.projectId, document_id: props.documentId, page_number: 4,
    selection: { documentId: props.documentId, kind: 'area', pageNumber: 4, rect: { x: .1, y: .2, width: .3, height: .4 } },
    selected_text: 'Texto previamente confirmado', need: 'Explicación guardada en la solicitud.' };
  assert.equal(panel().props.active, false);
  f.find(n => n.type === 'button' && n.props.children === 'Solicitudes').props.onClick(); f.render();
  const key = panel().key; assert.equal(panel().props.active, true);
  panel().props.onOpen(saved); f.render();
  assert.equal(f.find(n => n.type === viewer).props.initialPage, 4);
  assert.deepEqual(f.find(n => n.type === viewer).props.initialFragment, saved.selection);
  assert.equal(f.find(n => n.type === draftForm).props.difficultyDraft, null);
  assert.equal(f.find(n => n.type === draftForm).props.selectionText, null);
  assert.equal(panel().key, key); assert.equal(panel().props.active, false);
  f.find(n => n.type === 'button' && n.props.children === 'Volver a solicitudes').props.onClick(); f.render();
  assert.equal(panel().key, key); assert.equal(panel().props.active, true);
  panel().props.onOpen({ ...saved, document_id: 'foreign-document' }); f.render();
  assert.equal(panel().props.active, true);
});

test('request list is unavailable to a read-only account and remounts when the document changes', () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const previous = f.find(n => n.type === requestPanel).key;
  f.render({ ...props, documentId: 'document-b' });
  assert.notEqual(f.find(n => n.type === requestPanel).key, previous);
  f.render({ ...props, canRequestReinforcement: false });
  assert.equal(f.find(n => n.type === requestPanel), undefined);
  assert.equal(f.find(n => n.type === 'button' && n.props.children === 'Solicitudes'), undefined);
});

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

test('extracted native text can be edited and confirmed in the shared workspace without changing the fragment', async () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const v = () => f.find(n => n.type === viewer).props;
  const form = () => f.find(n => n.type === draftForm).props;
  const sourceCallback = v().onTextSourceChange;
  v().onPageSelect(2); f.render();
  const fragment = { kind: 'text', pageNumber: 2, text: 'Texto original', range: { start: 0, end: 14 }, rects: [] };
  v().onFragmentSelect(fragment); f.render();
  await form().onExtractText(); f.render();
  assert.equal(form().selectionText.text, 'Texto original');
  form().onTextChange('  Texto corregido\nSegunda línea.  '); f.render();
  form().onConfirmText(); f.render();
  assert.equal(form().selectionText.text, 'Texto corregido\nSegunda línea.');
  assert.equal(form().selectionText.confirmed, true);
  assert.equal(form().fragment.text, 'Texto original');
  assert.equal(v().onTextSourceChange, sourceCallback);
  // Selecting the same range again must not destroy an already edited draft.
  v().onFragmentSelect(fragment); f.render();
  assert.equal(form().selectionText.confirmed, true);
  f.find(n => n.type === 'button' && n.props.children === 'Refuerzos').props.onClick(); f.render();
  f.find(n => n.type === 'button' && n.props.children === 'PDF original').props.onClick(); f.render();
  assert.equal(form().selectionText.text, 'Texto corregido\nSegunda línea.');
  form().onTextChange('Otra corrección'); f.render();
  assert.equal(form().selectionText.confirmed, false);
  v().onPageSelect(3); f.render(); assert.equal(form().selectionText, null);
  v().onPageSelect(2); f.render(); assert.equal(form().selectionText, null);
});

test('an obsolete async extraction cannot overwrite manual input, a new zone or another document', async () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const v = () => f.find(n => n.type === viewer).props;
  const form = () => f.find(n => n.type === draftForm).props;
  let finish;
  v().onTextSourceChange({ numPages: 3, getPage: () => new Promise(resolve => { finish = resolve; }) });
  v().onPageSelect(2); f.render();
  const pending = form().onExtractText(); f.render();
  form().onTextChange('Escrito mientras se extrae'); f.render();
  finish({ getTextContent: async () => ({ items: [], styles: {} }), getViewport: () => ({}) });
  await pending; f.render();
  assert.equal(form().selectionText.text, 'Escrito mientras se extrae');
  form().onConfirmText(); f.render(); assert.equal(form().selectionText.source, 'manual');
  v().onFragmentSelect({ kind: 'area', pageNumber: 2, rect: { x: 0, y: 0, width: .4, height: .2 } }); f.render();
  assert.equal(form().selectionText, null);
  const anotherPending = form().onExtractText(); f.render();
  v().onPageSelect(3); f.render();
  finish({ getTextContent: async () => { throw Error('unreadable'); } });
  await anotherPending; f.render(); assert.equal(form().selectionText, null);
  form().onTextChange('Texto de la página 3'); f.render();
  f.render({ ...props, documentId: 'document-b' });
  assert.equal(form().selectionText, null);
});

test('failed extraction preserves the zone, supports manual confirmation and clearing removes the content', async () => {
  const f = fixture('components/documents/project-workspace.tsx', 'ProjectWorkspace', props);
  const v = () => f.find(n => n.type === viewer).props;
  const form = () => f.find(n => n.type === draftForm).props;
  v().onPageSelect(2); f.render();
  v().onFragmentSelect({ kind: 'area', pageNumber: 2, rect: { x: .1, y: .2, width: .3, height: .4 } }); f.render();
  await form().onExtractText(); f.render();
  assert.equal(form().selectionText.status, 'error');
  assert.equal(form().fragment.rect.x, .1);
  form().onTextChange('Transcripción de la zona escaneada.'); f.render();
  form().onConfirmText(); f.render();
  assert.equal(form().selectionText.documentId, props.documentId);
  assert.equal(form().selectionText.pageNumber, 2);
  assert.equal(form().selectionText.fragment.rect.width, .3);
  assert.equal(form().selectionText.confirmed, true);
  form().onClearSelection(); f.render(); assert.equal(form().selectionText, null);
});

test('the real text editor disables empty confirmation and serializes only a confirmed snapshot', () => {
  const context = { documentId: props.documentId, pageNumber: 2, fragment: null };
  const initial = { draft: null, hasPage: true, onExtract() {}, onChange() {}, onConfirm() {} };
  const f = fixture('components/documents/selection-text-editor.tsx', 'SelectionTextEditor', initial);
  const confirmation = () => f.find(n => n.type === 'button' && n.props.children === 'Confirmar texto en borrador');
  assert.equal(confirmation().props.disabled, true);
  const draft = textDraft.editSelectionText(context, null, 'Texto manual.');
  f.render({ ...initial, draft });
  assert.ok(f.find(n => n.type === 'p' && n.props.children === 'Texto escrito manualmente. Revísalo antes de confirmarlo.'));
  assert.equal(confirmation().props.disabled, false);
  assert.equal(f.find(n => n.type === 'input').props.value, '');
  f.render({ ...initial, draft: textDraft.confirmSelectionText(draft) });
  const saved = JSON.parse(f.find(n => n.type === 'input').props.value);
  assert.equal(saved.text, 'Texto manual.'); assert.equal(saved.source, 'manual');
  assert.equal(saved.documentId, context.documentId); assert.equal(saved.pageNumber, 2);
});
