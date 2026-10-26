import type { PDFPageProxy, TextLayer as PdfTextLayer } from "pdfjs-dist";
import type { PageViewport } from "pdfjs-dist/types/src/display/page_viewport";
import { moveRect, proportionalRect, readTextFragment, resizeRect, type FragmentSelection, type ProportionalRect } from "./fragment-selection";

type Surface = { layer: HTMLDivElement; surface: HTMLDivElement; marks: HTMLDivElement };
type Drag = { page: number; action: "draw" | "move" | "resize"; x: number; y: number; original: ProportionalRect | null; rect: ProportionalRect | null };
export function createPageFragments(TextLayer: typeof PdfTextLayer, onSelect: (value: FragmentSelection | null) => void) {
  const pages = new Map<number, Surface>(), layers = new Set<PdfTextLayer>();
  let mode: "text" | "area" = "text", selected: FragmentSelection | null = null, drag: Drag | null = null, disposed = false;
  function paint() {
    for (const [number, page] of pages) {
      page.marks.replaceChildren();
      delete page.marks.dataset.selection;
      page.surface.style.pointerEvents = mode === "area" ? "auto" : "none";
      page.surface.style.touchAction = mode === "area" ? "none" : "auto";
      page.layer.style.pointerEvents = mode === "text" ? "auto" : "none";
      const value = drag?.page === number && drag.rect ? { kind: "area" as const, pageNumber: number, rect: drag.rect } : selected;
      if (!value || value.pageNumber !== number) continue;
      for (const rect of value.kind === "area" ? [value.rect] : value.rects) {
        const mark = document.createElement("div");
        mark.className = value.kind === "area" ? "pdf-selected-zone" : "pdf-selected-text";
        Object.assign(mark.style, { left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` });
        if (value.kind === "area") {
          mark.style.pointerEvents = mode === "area" ? "auto" : "none";
          mark.dataset.selectedZone = "true";
          mark.tabIndex = 0; mark.setAttribute("role", "button");
          mark.setAttribute("aria-label", `Zona seleccionada en página ${number}. Flechas mueven; Mayús y flechas cambian tamaño.`);
          const handle = document.createElement("button");
          handle.type = "button"; handle.dataset.resizeHandle = "true"; handle.className = "pdf-zone-handle";
          handle.setAttribute("aria-label", `Redimensionar zona de página ${number}`); mark.append(handle);
        }
        page.marks.append(mark);
      }
      page.marks.dataset.selection = JSON.stringify(value);
    }
  }
  function emit(value: FragmentSelection | null) { selected = value; paint(); onSelect(value); }
  function clear() { drag = null; window.getSelection()?.removeAllRanges(); emit(null); }
  function captureText() {
    if (mode !== "text" || disposed) return;
    const selection = window.getSelection();
    for (const [number, page] of pages) {
      const value = readTextFragment(page.layer, page.surface, number, selection);
      if (value) { emit(value); break; }
    }
  }
  document.addEventListener("pointerup", captureText);
  document.addEventListener("keyup", captureText);
  return {
    clear,
    clearOtherPage(number: number) { if (selected && selected.pageNumber !== number) clear(); },
    setMode(value: "text" | "area") { mode = value; window.getSelection()?.removeAllRanges(); paint(); },
    async decorate(page: PDFPageProxy, body: HTMLElement, viewport: PageViewport) {
      const layer = document.createElement("div"), surface = document.createElement("div"), marks = document.createElement("div");
      layer.className = "pdf-page-text"; surface.className = "pdf-page-surface"; marks.className = "pdf-page-marks";
      surface.tabIndex = 0; surface.setAttribute("role", "group");
      surface.setAttribute("aria-label", `Zona de selección de página ${page.pageNumber}`);
      body.style.position = "relative";
      body.style.setProperty("--total-scale-factor", String(viewport.scale));
      surface.append(marks); body.append(layer, surface);
      let textLayer: PdfTextLayer | null = null;
      try {
        textLayer = new TextLayer({ textContentSource: await page.getTextContent(), container: layer, viewport });
        layers.add(textLayer);
        await textLayer.render();
      } catch {
        if (textLayer) { textLayer.cancel(); layers.delete(textLayer); }
        textLayer = null;
        layer.replaceChildren();
        // An unreadable text layer must not remove the PDF, its area tools or the manual fallback.
        layer.dataset.textUnavailable = "true";
      }
      if (disposed) { if (textLayer) { textLayer.cancel(); layers.delete(textLayer); } layer.remove(); surface.remove(); return () => {}; }
      pages.set(page.pageNumber, { layer, surface, marks }); paint();
      surface.onpointerdown = event => {
        if (mode !== "area" || event.button !== 0) return;
        event.preventDefault();
        const target = event.target as HTMLElement;
        const original = selected?.kind === "area" && selected.pageNumber === page.pageNumber ? selected.rect : null;
        const action = target.dataset.resizeHandle ? "resize" : target.closest("[data-selected-zone]") && original ? "move" : "draw";
        drag = { page: page.pageNumber, action, x: event.clientX, y: event.clientY, original, rect: original };
        surface.setPointerCapture(event.pointerId);
      };
      surface.onpointermove = event => {
        if (!drag || drag.page !== page.pageNumber) return;
        const bounds = surface.getBoundingClientRect(), dx = (event.clientX - drag.x) / bounds.width, dy = (event.clientY - drag.y) / bounds.height;
        drag.rect = drag.action === "draw" ? proportionalRect(drag.x, drag.y, event.clientX, event.clientY, bounds)
          : drag.action === "move" ? moveRect(drag.original!, dx, dy) : resizeRect(drag.original!, dx, dy);
        paint();
      };
      surface.onpointerup = event => {
        if (!drag || drag.page !== page.pageNumber) return;
        const value = drag.rect, bounds = surface.getBoundingClientRect(); drag = null;
        if (value && value.width * bounds.width >= 4 && value.height * bounds.height >= 4) emit({ kind: "area", pageNumber: page.pageNumber, rect: value });
        else paint();
        if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      };
      surface.onpointercancel = () => { drag = null; paint(); };
      surface.onkeydown = event => {
        if (mode !== "area") return;
        if (event.key === "Escape") { event.preventDefault(); clear(); return; }
        const own = selected?.kind === "area" && selected.pageNumber === page.pageNumber ? selected.rect : null;
        if (event.key === "Enter" && !own) { event.preventDefault(); emit({ kind: "area", pageNumber: page.pageNumber, rect: { x: .25, y: .25, width: .5, height: .25 } }); return; }
        const delta: Record<string, [number, number]> = { ArrowLeft: [-.01, 0], ArrowRight: [.01, 0], ArrowUp: [0, -.01], ArrowDown: [0, .01] };
        if (!own || !delta[event.key]) return;
        event.preventDefault();
        const resize = event.shiftKey || (event.target as HTMLElement).dataset.resizeHandle;
        const [dx, dy] = delta[event.key];
        emit({ kind: "area", pageNumber: page.pageNumber, rect: resize ? resizeRect(own, dx, dy) : moveRect(own, dx, dy) });
        marks.querySelector<HTMLElement>(resize ? "[data-resize-handle]" : "[data-selected-zone]")?.focus({ preventScroll: true });
      };
      return () => { if (drag?.page === page.pageNumber) drag = null; pages.delete(page.pageNumber); if (textLayer) { textLayer.cancel(); layers.delete(textLayer); } layer.remove(); surface.remove(); };
    },
    dispose() { disposed = true; document.removeEventListener("pointerup", captureText); document.removeEventListener("keyup", captureText); for (const layer of layers) layer.cancel(); layers.clear(); pages.clear(); drag = null; selected = null; },
  };
}
export type PageFragments = ReturnType<typeof createPageFragments>;
