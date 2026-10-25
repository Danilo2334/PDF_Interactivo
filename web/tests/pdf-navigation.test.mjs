import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadModule(path, dependencies = {}, globals = {}) {
  const filename = fileURLToPath(new URL(`../${path}`, import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, Error, console, AbortController, ...globals,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === "react/jsx-runtime") return require(name);
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  return exports;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

function rendererFixture({ count = 20, heights = {}, held = [], fail = [], viewportHeight = 800, viewportTop = 70, roundScroll = false, thumbnails = false } = {}) {
  const reads = [], cleanups = [], changes = [], errors = [], canvases = [];
  const frames = new Map(), listeners = new Map(), pending = new Map();
  let nextFrame = 0, renderer, intersection, resize;
  const pageHeight = (number) => heights[number] ?? 1000;
  const pageTop = (number) => {
    let top = 300;
    for (let i = 1; i < number; i++) top += pageHeight(i) + 24;
    return top;
  };

  class Element {
    children = []; dataset = {}; style = {}; attributes = {};
    constructor(tag) { this.tag = tag; }
    append(...children) {
      for (const child of children) { child.parent = this; this.children.push(child); }
    }
    replaceChildren() { this.children = []; }
    remove() { this.parent.children = this.parent.children.filter((child) => child !== this); }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelectorAll() { return this.children.filter((child) => child.dataset.thumbnailPage); }
    getBoundingClientRect() {
      const number = Number(this.dataset.pdfPage || this.dataset.thumbnailPage);
      const top = pageTop(number || 1) - browser.scrollY;
      const height = number ? pageHeight(number) : pageTop(count) + pageHeight(count) - 300;
      return { top, bottom: top + height, height };
    }
  }
  const container = new Element("div");
  if (thumbnails) {
    for (let number = 1; number <= count; number++) {
      const slot = new Element("span"); slot.dataset.thumbnailPage = String(number); container.append(slot);
    }
  }
  const browser = {
    scrollY: 0, innerHeight: viewportHeight, devicePixelRatio: 1,
    scrollTo({ top }) {
      const max = pageTop(count) + pageHeight(count) + 80 - this.innerHeight;
      this.scrollY = Math.max(0, Math.min(top, max));
      if (roundScroll) this.scrollY = Math.ceil(this.scrollY);
      listeners.get("scroll")?.();
    },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
  };
  const { renderVisiblePages, renderThumbnails } = loadModule(thumbnails ? "lib/pdf/render-thumbnails.ts" : "lib/pdf/render-visible-pages.ts", {}, {
    window: browser,
    document: { createElement(tag) {
      const element = new Element(tag);
      if (tag === "canvas") canvases.push(element);
      return element;
    } },
    IntersectionObserver: function (callback) {
      intersection = {
        callback, targets: [], disconnected: false,
        observe(target) { this.targets.push(target); },
        disconnect() { this.disconnected = true; },
      };
      return intersection;
    },
    ResizeObserver: function (callback) {
      resize = {
        callback, disconnected: false,
        observe() {},
        disconnect() { this.disconnected = true; },
      };
      return resize;
    },
  });
  const pdf = {
    numPages: count,
    async getPage(number) {
      reads.push(number);
      return {
        getViewport: ({ scale }) => ({ width: 600 * scale, height: pageHeight(number) * scale / 1.5 }),
        cleanup: () => cleanups.push(number),
        render() {
          if (fail.includes(number)) return { promise: Promise.reject(new Error("render failed")) };
          if (!held.includes(number) || pending.has(number)) return { promise: Promise.resolve(), cancel() {} };
          let resolve, reject;
          const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
          const task = { promise, resolve, cancelled: false, cancel() {
            this.cancelled = true;
            const error = new Error("cancelled");
            error.name = "RenderingCancelledException";
            reject(error);
          } };
          pending.set(number, task);
          return task;
        },
      };
    },
  };
  renderer = thumbnails ? { dispose: renderThumbnails(pdf, container, () => errors.push(new Error("thumbnail render failed"))) } : renderVisiblePages(pdf, container, () => {}, (error) => {
    errors.push(error);
    renderer.dispose();
  }, (number) => changes.push(number), () => viewportTop);

  return {
    renderer, container, reads, cleanups, changes, errors, canvases, pending, browser,
    listeners, frames, get intersection() { return intersection; }, get resize() { return resize; },
    page(number) { return container.children[number - 1]; },
    scrollToPage(number) { browser.scrollTo({ top: pageTop(number) - 70 }); },
    flush() {
      const callbacks = [...frames.values()]; frames.clear();
      for (const callback of callbacks) callback();
    },
    observeVisible() {
      intersection.callback(intersection.targets.map((target) => {
        const rect = target.getBoundingClientRect();
        return { target, isIntersecting: rect.bottom >= -200 && rect.top <= browser.innerHeight + 200 };
      }));
    },
    visible(numbers) {
      intersection.callback(intersection.targets.map((target) => ({
        target, isIntersecting: numbers.includes(Number(target.dataset.thumbnailPage)),
      })));
    },
  };
}

test("thumbnails render only requested previews and release canvases when leaving the panel", async (t) => {
  const f = rendererFixture({ thumbnails: true }); t.after(() => f.renderer.dispose());
  await settle(); assert.deepEqual(f.reads, []); assert.equal(f.canvases.length, 0);
  f.visible([1, 2]); await settle(); assert.deepEqual(f.reads, [1, 2]);
  assert.equal(f.page(2).dataset.renderState, "ready");
  assert.ok(f.canvases.every((canvas) => canvas.width <= 96 && canvas.height <= 112));
  const old = [...f.canvases];
  f.visible([15]); await settle(); assert.equal(f.page(15).dataset.renderState, "ready");
  assert.ok(old.every((canvas) => canvas.width === 0 && canvas.height === 0));
  f.visible([1]); await settle(); assert.deepEqual(f.reads, [1, 2, 15, 1]);
});

test("closing thumbnails cancels pending rendering and releases preview resources", async () => {
  const f = rendererFixture({ thumbnails: true, held: [2] });
  f.visible([2]); await settle(); f.renderer.dispose(); await settle();
  assert.equal(f.intersection.disconnected, true); assert.equal(f.pending.get(2).cancelled, true);
  assert.ok(f.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0));
  assert.deepEqual(f.cleanups, [2]); assert.deepEqual(f.errors, []);
});

test("one failed thumbnail does not stop the remaining previews", async (t) => {
  const f = rendererFixture({ thumbnails: true, fail: [1] }); t.after(() => f.renderer.dispose());
  f.visible([1, 2]); await settle();
  assert.equal(f.errors.length, 1); assert.equal(f.page(1).dataset.renderState, "error");
  assert.equal(f.page(2).dataset.renderState, "ready");
});

test("navigation reuses the loaded document and renders a distant placeholder on demand", async (t) => {
  const f = rendererFixture(); t.after(() => f.renderer.dispose());
  await settle();
  assert.deepEqual(f.reads, [1]);
  assert.equal(f.page(15).dataset.renderState, "waiting");
  const firstCanvas = f.canvases[0];
  assert.equal(f.renderer.goToPage(15), true);
  f.flush(); await settle();
  assert.deepEqual(f.reads, [1, 15]);
  assert.equal(f.page(15).dataset.renderState, "ready");
  assert.equal(f.changes.at(-1), 15);
  assert.equal(firstCanvas.width, 0);
  assert.equal(firstCanvas.height, 0);
  assert.deepEqual(f.cleanups, [1, 15]);
  f.renderer.goToPage(14); f.flush(); await settle();
  assert.equal(f.changes.at(-1), 14);
  assert.equal(f.page(14).dataset.renderState, "ready");
});

test("invalid numeric destinations keep the position and do not read another page", async (t) => {
  const f = rendererFixture(); t.after(() => f.renderer.dispose()); await settle();
  const position = f.browser.scrollY;
  for (const number of [0, -1, 21, 1.5, NaN, Infinity]) {
    assert.equal(f.renderer.goToPage(number), false);
  }
  assert.equal(f.browser.scrollY, position);
  assert.deepEqual(f.reads, [1]); assert.deepEqual(f.changes, []);
});

test("zoom redraws the active page at the applied scale without reading distant pages", async (t) => {
  const f = rendererFixture(); t.after(() => f.renderer.dispose()); await settle();
  f.renderer.goToPage(15); f.flush(); await settle();
  const original = f.canvases.at(-1);
  const width = original.width;
  assert.equal(f.renderer.setZoom(200), true); f.flush(); await settle();
  assert.equal(f.page(15).dataset.renderZoom, "200");
  assert.equal(f.canvases.at(-1).width, width * 2);
  assert.equal(original.width, 0); assert.equal(f.changes.at(-1), 15);
  assert.equal(f.renderer.setZoom(50), true); f.flush(); await settle();
  assert.equal(f.canvases.at(-1).width, width / 2);
  assert.equal(f.page(15).dataset.renderZoom, "50");
  assert.deepEqual(f.reads, [1, 15, 15, 15]);
  for (const value of [49, 201, 100.5, NaN, Infinity]) assert.equal(f.renderer.setZoom(value), false);
  assert.equal(f.renderer.setZoom(50), true); await settle();
  assert.deepEqual(f.reads, [1, 15, 15, 15]); assert.deepEqual(f.errors, []);
});

test("changing zoom during rendering cancels the stale canvas and renders the latest scale", async (t) => {
  const f = rendererFixture({ held: [8] }); t.after(() => f.renderer.dispose()); await settle();
  f.renderer.goToPage(8); await settle(); const stale = f.canvases.at(-1);
  f.renderer.setZoom(125); f.renderer.setZoom(175); f.flush(); await settle();
  assert.equal(f.pending.get(8).cancelled, true); assert.equal(stale.width, 0);
  assert.equal(f.page(8).dataset.renderState, "ready");
  assert.equal(f.page(8).dataset.renderZoom, "175");
  assert.equal(f.canvases.at(-1).width, 1575);
  assert.equal(f.changes.at(-1), 8); assert.deepEqual(f.errors, []);
});

test("resizing redraws at the selected zoom and preserves the active page", async (t) => {
  const f = rendererFixture(); t.after(() => f.renderer.dispose()); await settle();
  f.renderer.goToPage(12); f.flush(); await settle();
  f.renderer.setZoom(150); await settle();
  f.container.clientWidth = 400; f.resize.callback(); f.flush(); await settle();
  assert.equal(f.page(12).dataset.renderZoom, "150");
  assert.equal(f.canvases.at(-1).width, 600);
  assert.equal(f.changes.at(-1), 12); assert.deepEqual(f.errors, []);
});

test("manual scrolling and resizing update the page counter", async (t) => {
  const f = rendererFixture(); t.after(() => f.renderer.dispose()); await settle();
  f.scrollToPage(8); f.flush();
  assert.equal(f.changes.at(-1), 8);
  f.observeVisible(); await settle();
  assert.equal(f.page(8).dataset.renderState, "ready");
  f.scrollToPage(2); f.listeners.get("resize")(); f.resize.callback(); f.flush();
  assert.equal(f.changes.at(-1), 2);
});

test("the last short page and a single-page document remain valid destinations", async (t) => {
  const f = rendererFixture({ count: 3, heights: { 3: 120 } });
  t.after(() => f.renderer.dispose()); await settle();
  f.renderer.goToPage(3); f.flush(); await settle();
  assert.equal(f.changes.at(-1), 3);
  const single = rendererFixture({ count: 1, heights: { 1: 120 } });
  t.after(() => single.renderer.dispose()); await settle();
  assert.equal(single.renderer.goToPage(1), true);
  single.flush(); assert.deepEqual(single.changes, []);
  assert.equal(single.renderer.goToPage(2), false);
});

test("fractional scroll rounding preserves a short destination when the next page is fully visible", async (t) => {
  const f = rendererFixture({
    count: 4, heights: { 2: 190, 3: 350 },
    viewportHeight: 844, viewportTop: 174.4, roundScroll: true,
  });
  t.after(() => f.renderer.dispose()); await settle();
  f.renderer.goToPage(2); f.flush(); await settle();
  assert.equal(f.changes.at(-1), 2);
  assert.equal(f.page(2).dataset.renderState, "ready");
});

test("rapid jumps cancel a page even when IntersectionObserver has not seen it", async (t) => {
  const f = rendererFixture({ held: [10] }); t.after(() => f.renderer.dispose());
  await settle(); f.renderer.goToPage(10); await settle();
  const abandonedCanvas = f.canvases.at(-1);
  f.renderer.goToPage(18); f.flush(); await settle();
  assert.equal(f.pending.get(10).cancelled, true);
  assert.equal(f.page(10).dataset.renderState, "waiting");
  assert.equal(abandonedCanvas.width, 0);
  assert.equal(f.page(18).dataset.renderState, "ready");
  assert.equal(f.changes.at(-1), 18); assert.deepEqual(f.errors, []);
});

test("leaving a pending destination by manual scroll releases its canvas", async (t) => {
  const f = rendererFixture({ held: [10] }); t.after(() => f.renderer.dispose());
  await settle(); f.renderer.goToPage(10); await settle();
  f.scrollToPage(18); f.flush(); await settle();
  assert.equal(f.pending.get(10).cancelled, true);
  assert.equal(f.page(10).dataset.renderState, "waiting");
  assert.equal(f.changes.at(-1), 18);
});

test("dispose cancels rendering, disconnects observers and removes listeners and canvases", async () => {
  const f = rendererFixture({ held: [10] });
  await settle(); f.renderer.goToPage(10); await settle();
  f.renderer.dispose(); await settle();
  assert.equal(f.pending.get(10).cancelled, true);
  assert.equal(f.intersection.disconnected, true);
  assert.equal(f.resize.disconnected, true);
  assert.equal(f.listeners.size, 0); assert.equal(f.frames.size, 0);
  assert.equal(f.container.children.length, 0);
  assert.ok(f.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0));
  assert.equal(f.renderer.goToPage(3), false); assert.deepEqual(f.errors, []);
});

test("a render error is reported and can be retried with a fresh renderer", async () => {
  const f = rendererFixture({ fail: [12] });
  await settle(); f.renderer.goToPage(12); await settle();
  assert.equal(f.errors.length, 1); assert.match(f.errors[0].message, /render failed/);
  assert.equal(f.container.children.length, 0); assert.equal(f.listeners.size, 0);
  const retry = rendererFixture(); await settle();
  retry.renderer.goToPage(12); await settle();
  assert.equal(retry.page(12).dataset.renderState, "ready");
  retry.renderer.dispose();
});

// Ejercitar los eventos reales del componente con estado y efectos controlados,
// sin sustituir las pruebas visuales del navegador ni necesitar credenciales.
function viewerFixture(total = 20) {
  const states = [], refs = [], effects = [], calls = [], requests = [], zooms = [];
  let cursor = 0, refCursor = 0, effectStarted = false, callbacks, tree;
  const dependencies = {
    react: {
      useId: () => "page-number",
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => {
          states[index] = typeof value === "function" ? value(states[index]) : value;
        }];
      },
      useRef(initial) {
        const index = refCursor++;
        return refs[index] ??= { current: initial };
      },
      useEffect(effect) { if (!effectStarted) effects.push(effect); },
    },
    "pdfjs-dist": {
      GlobalWorkerOptions: {}, version: "test",
      getDocument: () => ({ promise: Promise.resolve({ numPages: total }), destroy: async () => {} }),
    },
    "@/components/diagnostics/view-timing": { ViewTiming: () => null },
    "@/components/documents/pdf-thumbnails": { PdfThumbnails: () => null },
    "@/lib/pdf/render-visible-pages": {
      renderVisiblePages(_pdf, _container, ready, error, changed) {
        callbacks = { ready, error, changed }; ready();
        return { dispose() {}, goToPage(number) { calls.push(number); changed(number); return true; }, setZoom(value) { zooms.push(value); return true; } };
      },
    },
  };
  const { PdfViewer } = loadModule("components/documents/pdf-viewer.tsx", dependencies, {
    window: { location: { origin: "http://localhost" } },
    fetch: async (url) => {
      requests.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
    },
    console: { error() {} },
  });
  const outer = PdfViewer({ projectId: "test-project" });
  states.length = 0;
  const Pages = outer.type;
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap((child) => nodes(child))];
  }
  function render() {
    cursor = 0; refCursor = 0;
    tree = Pages(outer.props);
    for (const node of nodes(tree)) {
      if (node.props?.ref) node.props.ref.current = {
        replaceChildren() {}, getBoundingClientRect: () => ({ height: 70 }),
      };
    }
  }
  render(); const cleanups = effects.map((effect) => effect()); effectStarted = true;
  return {
    calls, requests, zooms, render,
    get callbacks() { return callbacks; },
    button(label) { return nodes(tree).find((node) => node.type === "button" && node.props.children === label); },
    labelled(label) { return nodes(tree).find((node) => node.props?.["aria-label"] === label); },
    input() { return nodes(tree).find((node) => node.type === "input"); },
    alert() { return nodes(tree).find((node) => node.props?.role === "alert"); },
    counter() { return nodes(tree).find((node) => node.type === "p" && Array.isArray(node.props.children) && node.props.children[0] === "Página ").props.children.join(""); },
    enter(value) {
      this.input().props.onChange({ target: { value } }); render();
      nodes(tree).find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); render();
    },
    dispose() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test("viewer validates text, preserves the current page and supports button and Enter navigation", async (t) => {
  const f = viewerFixture(); t.after(() => f.dispose()); await settle(); f.render();
  assert.equal(f.counter(), "Página 1 de 20");
  assert.equal(f.button("Anterior").props.disabled, true);
  f.button("Siguiente").props.onClick(); f.render();
  assert.equal(f.counter(), "Página 2 de 20");
  f.enter("15"); assert.equal(f.counter(), "Página 15 de 20");
  for (const value of ["", " ", "0", "-1", "21", "1.5", "abc", "1e1", "Infinity"]) {
    f.enter(value);
    assert.match(f.alert().props.children, /entero entre 1 y 20/);
    assert.equal(f.input().props["aria-invalid"], true);
    assert.equal(f.counter(), "Página 15 de 20");
  }
  assert.deepEqual(f.calls, [2, 15]);
  f.enter("20"); assert.equal(f.button("Siguiente").props.disabled, true);
  assert.equal(f.alert(), undefined);
  f.button("Anterior").props.onClick(); f.render();
  assert.equal(f.counter(), "Página 19 de 20");
  f.callbacks.changed(5); f.render();
  assert.equal(f.counter(), "Página 5 de 20"); assert.equal(f.input().props.value, "5");
  assert.deepEqual(f.requests, ["/api/projects/test-project/pdf"]);
});

test("viewer disables navigation on render errors and offers retry", async (t) => {
  const f = viewerFixture(); t.after(() => f.dispose()); await settle(); f.render();
  f.callbacks.error(new Error("failed")); f.render();
  assert.equal(f.button("Anterior").props.disabled, true);
  assert.equal(f.button("Siguiente").props.disabled, true);
  assert.equal(f.input().props.disabled, true);
  assert.ok(f.button("Reintentar"));
});

test("zoom controls show the applied percentage and disable their respective limits", async (t) => {
  const f = viewerFixture(); t.after(() => f.dispose()); await settle(); f.render();
  f.enter("8");
  const percentage = () => f.labelled("Porcentaje de zoom").props.children.join("");
  assert.equal(percentage(), "100 %");
  for (let i = 0; i < 4; i++) { f.labelled("Aumentar zoom").props.onClick(); f.render(); }
  assert.equal(percentage(), "200 %"); assert.equal(f.labelled("Aumentar zoom").props.disabled, true);
  for (let i = 0; i < 6; i++) { f.labelled("Reducir zoom").props.onClick(); f.render(); }
  assert.equal(percentage(), "50 %"); assert.equal(f.labelled("Reducir zoom").props.disabled, true);
  assert.deepEqual(f.calls, [8]); assert.equal(f.counter(), "Página 8 de 20");
  assert.equal(f.zooms.at(-1), 50); assert.equal(f.requests.length, 1);
});

test("both viewer direction buttons are disabled for a single-page PDF", async (t) => {
  const f = viewerFixture(1); t.after(() => f.dispose()); await settle(); f.render();
  assert.equal(f.counter(), "Página 1 de 1");
  assert.equal(f.button("Anterior").props.disabled, true);
  assert.equal(f.button("Siguiente").props.disabled, true);
});
