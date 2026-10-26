import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const viewer = () => null, draftForm = () => null;
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
