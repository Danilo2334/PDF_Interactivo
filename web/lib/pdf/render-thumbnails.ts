import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

export function renderThumbnails(
  pdf: PDFDocumentProxy,
  container: HTMLElement,
  onError: () => void,
) {
  const slots = new Map<number, HTMLElement>();
  const canvases = new Map<number, HTMLCanvasElement>();
  const requested = new Set<number>();
  let stopped = false;
  let busy = false;
  let renderingPage = 0;
  let renderTask: RenderTask | null = null;

  function release(number: number) {
    const canvas = canvases.get(number);
    if (canvas) {
      canvas.remove();
      canvas.width = 0;
      canvas.height = 0;
      canvases.delete(number);
    }
    const slot = slots.get(number)!;
    slot.dataset.renderState = "waiting";
    slot.setAttribute("aria-busy", "false");
  }

  const observer = new IntersectionObserver((entries) => {
    if (stopped) return;
    for (const entry of entries) {
      const slot = entry.target as HTMLElement;
      const number = Number(slot.dataset.thumbnailPage);
      if (entry.isIntersecting) requested.add(number);
      else {
        requested.delete(number);
        if (renderingPage === number) renderTask?.cancel();
        else release(number);
      }
    }
    void renderRequested();
  }, { root: container, rootMargin: "80px", threshold: 0 });

  async function renderRequested() {
    if (busy || stopped) return;
    busy = true;
    try {
      while (!stopped) {
        const number = [...requested].find((n) => slots.get(n)?.dataset.renderState === "waiting");
        if (number === undefined) break;
        const slot = slots.get(number)!;
        let page: PDFPageProxy | null = null;
        let completed = false;
        let failed = false;
        renderingPage = number;
        slot.dataset.renderState = "rendering";
        slot.setAttribute("aria-busy", "true");
        try {
          page = await pdf.getPage(number);
          if (stopped || !requested.has(number)) continue;
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(96 / original.width, 112 / original.height) });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width * outputScale);
          canvas.height = Math.ceil(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "block max-h-full max-w-full";
          canvas.setAttribute("aria-hidden", "true");
          canvases.set(number, canvas);
          slot.append(canvas);
          renderTask = page.render({ canvas, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] });
          await renderTask.promise;
          if (stopped || !requested.has(number)) continue;
          completed = true;
          slot.dataset.renderState = "ready";
          slot.setAttribute("aria-busy", "false");
        } catch (error) {
          if (stopped) break;
          if (error instanceof Error && error.name === "RenderingCancelledException") continue;
          failed = true;
          onError();
        } finally {
          renderTask = null;
          renderingPage = 0;
          page?.cleanup();
          if (!completed) release(number);
          if (failed) slot.dataset.renderState = "error";
        }
      }
    } finally {
      busy = false;
    }
  }

  for (const slot of container.querySelectorAll<HTMLElement>("[data-thumbnail-page]")) {
    const number = Number(slot.dataset.thumbnailPage);
    slots.set(number, slot);
    slot.dataset.renderState = "waiting";
    observer.observe(slot);
  }

  return () => {
    stopped = true;
    observer.disconnect();
    requested.clear();
    renderTask?.cancel();
    for (const number of slots.keys()) {
      if (number !== renderingPage) release(number);
    }
  };
}
