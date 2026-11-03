import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import ts from 'typescript';

function load(name) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../lib/pdf/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, { exports, structuredClone });
  return exports;
}
const extraction = load('extract-selection-text'), drafts = load('selection-text-draft');
const standardFontDataUrl = fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)).replaceAll('\\', '/');
const viewport = { transform: [1, 0, 0, -1, 0, 800], width: 600, height: 800, scale: 1 };
const styles = { font: { ascent: .8, descent: -.2, vertical: false, fontFamily: 'sans-serif' } };
const item = (str, x, y, width, extras = {}) => ({ str, transform: [20, 0, 0, 20, x, y], width, height: 20, fontName: 'font', dir: 'ltr', hasEOL: false, ...extras });

test('positioned elements are ordered by line and location, with spaces only between separated runs', () => {
  const content = { styles, items: [item('Segunda', 40, 650, 80), item('ción', 80, 700, 30),
    item('más', 130, 700, 30), item('Extrac', 40, 700, 40), { type: 'endMarkedContent' }] };
  assert.equal(extraction.textFromPageContent(content, viewport), 'Extracción más\nSegunda');
});

test('a rectangular selection includes complete in-bounds items and skips outside or partly clipped text', () => {
  const content = { styles, items: [item('dentro', 40, 700, 70), item('fuera', 320, 700, 80), item('recortado', 260, 650, 100)] };
  const rect = { x: .04, y: .08, width: .46, height: .15 };
  assert.equal(extraction.textFromPageContent(content, viewport, rect), 'dentro');
  const zoomed = { transform: [2, 0, 0, -2, 0, 1600], width: 1200, height: 1600, scale: 2 };
  assert.equal(extraction.textFromPageContent(content, zoomed, rect), 'dentro');
  assert.throws(() => extraction.textFromPageContent(content, viewport, { ...rect, width: -1 }));
});

test('Unicode, RTL runs and line breaks survive extraction without reversing individual strings', () => {
  const content = { styles, items: [item('عالم', 40, 700, 70, { dir: 'rtl' }), item('مرحبا', 140, 700, 80, { dir: 'rtl' }), item('áéñ Ω ≠', 40, 650, 100)] };
  assert.equal(extraction.textFromPageContent(content, viewport), 'مرحبا عالم\náéñ Ω ≠');
});

test('a native text range retains exactly the selected characters without rereading or broadening to whole elements', async () => {
  let reads = 0;
  const pdf = { numPages: 3, getPage() { reads++; throw Error('not needed'); } };
  const result = await extraction.extractSelectionText(pdf, 2, { kind: 'text', pageNumber: 2, text: '  trozo de pala\r\nsegunda línea  ', range: { start: 2, end: 31 }, rects: [] });
  assert.equal(result.status, 'ready'); assert.equal(result.text, 'trozo de pala\nsegunda línea');
  assert.equal(reads, 0);
});

test('real PDF.js extracts from a generated digital PDF without changing its bytes or requiring browser mocks', async () => {
  const original = await PDFDocument.create(), font = await original.embedFont(StandardFonts.Helvetica);
  const page = original.addPage([600, 800]);
  for (const [text, x, y] of [['Segunda línea.', 40, 650], ['mundo.', 110, 700], ['Hola', 40, 700], ['Fuera de zona.', 320, 700]]) {
    page.drawText(text, { x, y, size: 20, font });
  }
  const bytes = await original.save();
  const hash = createHash('sha256').update(bytes).digest('hex');
  const loading = getDocument({ data: new Uint8Array(bytes), standardFontDataUrl });
  const pdf = await loading.promise;
  try {
    assert.equal((await extraction.extractSelectionText(pdf, 1, null)).text, 'Hola mundo. Fuera de zona.\nSegunda línea.');
    const result = await extraction.extractSelectionText(pdf, 1, { kind: 'area', pageNumber: 1, rect: { x: .04, y: .08, width: .46, height: .15 } });
    assert.equal(result.status, 'ready'); assert.equal(result.text, 'Hola mundo.\nSegunda línea.');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
    assert.equal(pdf.numPages, 1);
  } finally { await loading.destroy(); }
});

test('real PDF rotation and a nonzero CropBox retain extraction and proportional area coordinates', async () => {
  for (const rotation of [0, 90, 180, 270]) {
    const original = await PDFDocument.create(), page = original.addPage([600, 800]);
    page.setCropBox(20, 40, 560, 720); page.setRotation(degrees(rotation));
    page.drawText('Primera', { x: 60, y: 700, size: 20 });
    page.drawText('Segunda', { x: 60, y: 650, size: 20 });
    const loading = getDocument({ data: new Uint8Array(await original.save()), standardFontDataUrl });
    const pdf = await loading.promise;
    try {
      assert.equal((await extraction.extractSelectionText(pdf, 1, null)).text, 'Primera\nSegunda', `rotation ${rotation}`);
      const actualPage = await pdf.getPage(1), view = actualPage.getViewport({ scale: 1 });
      // Crop a padded region containing only the first line in PDF coordinates.
      const [x1, y1] = view.convertToViewportPoint(45, 690);
      const [x2, y2] = view.convertToViewportPoint(160, 725);
      const rect = { x: Math.min(x1, x2) / view.width, y: Math.min(y1, y2) / view.height,
        width: Math.abs(x2 - x1) / view.width, height: Math.abs(y2 - y1) / view.height };
      assert.equal((await extraction.extractSelectionText(pdf, 1, { kind: 'area', pageNumber: 1, rect })).text, 'Primera');
    } finally { await loading.destroy(); }
  }
});

test('a real PDF containing only an image returns empty and supports a manual draft with the original zone', async () => {
  const original = await PDFDocument.create(), page = original.addPage([600, 800]);
  const png = await original.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=', 'base64'));
  page.drawImage(png, { x: 40, y: 500, width: 400, height: 200 });
  const loading = getDocument({ data: new Uint8Array(await original.save()), standardFontDataUrl });
  const pdf = await loading.promise;
  const context = { documentId: 'image-document', pageNumber: 1, fragment: { kind: 'area', documentId: 'image-document', pageNumber: 1, rect: { x: .04, y: .08, width: .8, height: .4 } } };
  try {
    const result = await extraction.extractSelectionText(pdf, 1, context.fragment);
    assert.equal(result.status, 'empty'); assert.equal(result.text, '');
    let draft = drafts.finishTextExtraction(drafts.beginTextExtraction(context, 1), 1, result);
    draft = drafts.editSelectionText(context, draft, 'Texto transcrito manualmente.');
    draft = drafts.confirmSelectionText(draft);
    assert.equal(draft.source, 'manual'); assert.equal(draft.confirmed, true);
    assert.equal(draft.documentId, context.documentId); assert.equal(draft.fragment.rect.width, .8);
  } finally { await loading.destroy(); }
});

test('invalid page, foreign selection or unreadable text fail without throwing or destroying the viewer PDF', async () => {
  const pdf = { numPages: 2, getPage: async () => ({ getTextContent: async () => { throw Error('broken content'); } }) };
  for (const [source, page, fragment] of [[pdf, 1, null], [pdf, 0, null], [pdf, 3, null], [pdf, 1, { kind: 'text', pageNumber: 2, text: 'foreign' }], [null, 1, null]]) {
    assert.equal((await extraction.extractSelectionText(source, page, fragment)).status, 'error');
  }
});

const context = { documentId: 'document-a', pageNumber: 2, fragment: { documentId: 'document-a', pageNumber: 2, kind: 'area', rect: { x: .1, y: .2, width: .3, height: .4 } } };
test('drafts snapshot their selection and confirmation trims only outer whitespace, preserving user corrections', () => {
  const local = structuredClone(context);
  let draft = drafts.beginTextExtraction(local, 1);
  local.fragment.rect.x = .7;
  assert.equal(draft.fragment.rect.x, .1);
  draft = drafts.finishTextExtraction(draft, 1, { status: 'ready', text: 'Original' });
  draft = drafts.editSelectionText(context, draft, '  Edición con  espacios\nsalto.  ');
  draft = drafts.confirmSelectionText(draft);
  assert.equal(draft.text, 'Edición con  espacios\nsalto.'); assert.equal(draft.originalText, 'Original');
  assert.equal(draft.confirmed, true);
  draft = drafts.editSelectionText(context, draft, '   \n ');
  assert.equal(drafts.confirmSelectionText(draft).confirmed, false);
});

test('late results never override newer extraction, manual edits or a cleared context', () => {
  const older = drafts.beginTextExtraction(context, 1), newer = drafts.beginTextExtraction(context, 2);
  const result = { status: 'ready', text: 'Respuesta vieja' };
  assert.equal(drafts.finishTextExtraction(newer, 1, result), newer);
  assert.equal(drafts.finishTextExtraction(null, 1, result), null);
  const edited = drafts.editSelectionText(context, older, 'No reemplazar');
  assert.equal(drafts.finishTextExtraction(edited, 1, result), edited);
  assert.equal(drafts.confirmSelectionText(older).confirmed, false);
});
