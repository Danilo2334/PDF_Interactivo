import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";

type PageSlot = {
  figure: HTMLElement;
  caption: HTMLElement;
  body: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  naturalWidth: number;
};

export type PageRenderer = {
  goToPage: (number: number) => boolean;
  setZoom: (percentage: number) => boolean;
  dispose: () => void;
};

export function renderVisiblePages(
  pdf: PDFDocumentProxy,
  container: HTMLElement,
  onReady: () => void,
  onError: (error: unknown) => void,
  onPageChange: (number: number) => void,
  getViewportTop: () => number = () => 0,
): PageRenderer {
  const slots = new Map<number, PageSlot>();
  const requested = new Set<number>([1]);

  let stopped = false;
  let busy = false;
  let renderingPage = 0;
  let renderTask: RenderTask | null = null;
  let currentPage = 1;
  let priorityPage: number | null = null;
  let frameId: number | null = null;
  let firstPageRendered = false;
  let zoom = 100;
  let revision = 0;
  let layoutWidth = container.clientWidth || 900;

  function displayWidth(slot: PageSlot) {
    return Math.min(layoutWidth, slot.naturalWidth) * zoom / 100;
  }

  function sizeSlot(slot: PageSlot) {
    slot.body.style.width = `${displayWidth(slot)}px`;
    slot.body.style.maxWidth = "none";
  }

  function scrollToPage(number: number) {
    const slot = slots.get(number)!;
    window.scrollTo({
      top: window.scrollY + slot.figure.getBoundingClientRect().top - Math.max(0, getViewportTop()),
      behavior: "instant",
    });
  }

  function refreshLayout(width: number) {
    layoutWidth = width;
    revision++;
    renderTask?.cancel();
    for (const [number, slot] of slots) {
      if (number !== renderingPage) release(slot);
      sizeSlot(slot);
    }
    requested.add(currentPage);
    priorityPage = currentPage;
    if (firstPageRendered) scrollToPage(currentPage);
    releaseDistantPages();
    schedulePageUpdate();
    void renderRequested();
  }

  function releaseDistantPages() {
    if (!firstPageRendered) return;
    for (const number of requested) {
      const slot = slots.get(number)!;
      const rect = slot.figure.getBoundingClientRect();
      if (rect.bottom >= -200 && rect.top <= window.innerHeight + 200) continue;
      requested.delete(number);
      if (renderingPage === number) renderTask?.cancel();
      else release(slot);
    }
  }

  function reportCurrentPage(number: number) {
    if (currentPage === number) return;
    highlightPage(number);
    currentPage = number;
    onPageChange(number);
  }

  const pageBodyClass = "mx-auto w-full overflow-hidden rounded border bg-white";
  function highlightPage(number: number) {
    const previous = slots.get(currentPage);
    if (previous) {
      previous.figure.dataset.activePage = "false";
      previous.figure.removeAttribute("aria-current");
      previous.body.className = `${pageBodyClass} border-slate-200`;
    }
    const selected = slots.get(number);
    if (selected) {
      selected.figure.dataset.activePage = "true";
      selected.figure.setAttribute("aria-current", "page");
      selected.body.className = `${pageBodyClass} border-blue-700 ring-2 ring-blue-700`;
    }
  }

  function updateCurrentPage() {
    const top = Math.max(0, getViewportTop());
    const bottom = window.innerHeight;
    if (top >= bottom) return;

    // Buscar la primera página visible sin recorrer todo el documento al hacer scroll.
    let first = 1;
    let last = pdf.numPages;
    while (first <= last) {
      const middle = Math.floor((first + last) / 2);
      if (slots.get(middle)!.figure.getBoundingClientRect().bottom <= top) {
        first = middle + 1;
      } else {
        last = middle - 1;
      }
    }

    let selected = currentPage;
    let bestScore = 0;
    for (let number = first; number <= pdf.numPages; number++) {
      const rect = slots.get(number)!.figure.getBoundingClientRect();
      if (rect.top >= bottom) break;
      if (rect.height <= 0) continue;

      const visible = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
      // Comparar proporciones también permite reconocer páginas cortas al final.
      const available = Math.min(rect.height, bottom - top);
      // El scroll puede redondearse y ocultar una fracción de píxel del destino.
      const score = visible >= available - 1 ? 1 : visible / available;
      if (score > bestScore || (score === bestScore && number === currentPage)) {
        selected = number;
        bestScore = score;
      }
    }

    if (bestScore > 0) reportCurrentPage(selected);
  }

  function schedulePageUpdate() {
    if (stopped || frameId !== null) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      // Un salto rápido puede pasar por una página antes de que el observer la detecte.
      releaseDistantPages();
      updateCurrentPage();
    });
  }

  function release(slot: PageSlot) {
    if (slot.canvas) {
      slot.canvas.remove();
      slot.canvas.width = 0;
      slot.canvas.height = 0;
      slot.canvas = null;
    }

    slot.figure.dataset.renderState = "waiting";
    delete slot.figure.dataset.renderZoom;
    slot.figure.setAttribute("aria-busy", "false");
    slot.caption.textContent =
      `Página ${slot.figure.dataset.pdfPage} de ${pdf.numPages}`;
  }

  // Reservar espacio no implica leer ni dibujar todas las páginas.
  for (let number = 1; number <= pdf.numPages; number++) {
    const figure = document.createElement("figure");
    figure.className = "min-w-0 overflow-x-auto";
    figure.dataset.pdfPage = String(number);
    figure.dataset.renderState = "waiting";

    const caption = document.createElement("figcaption");
    caption.className = "mb-2 text-center text-sm text-slate-600";
    caption.textContent = `Página ${number} de ${pdf.numPages}`;

    const body = document.createElement("div");
    body.className =
      `${pageBodyClass} border-slate-200`;
    body.style.maxWidth = "900px";
    body.style.aspectRatio = "210 / 297";

    figure.append(caption, body);
    container.append(figure);

    const slot = { figure, caption, body, canvas: null, naturalWidth: 900 };
    slots.set(number, slot);
    sizeSlot(slot);
  }
  highlightPage(1);

  const observer = new IntersectionObserver(
    (entries) => {
      if (stopped) return;

      for (const entry of entries) {
        const figure = entry.target as HTMLElement;
        const number = Number(figure.dataset.pdfPage);
        const slot = slots.get(number);

        if (!slot) continue;

        if (entry.isIntersecting) {
          requested.add(number);
        } else {
          requested.delete(number);

          if (renderingPage === number) {
            renderTask?.cancel();
          } else {
            release(slot);
          }
        }
      }

      void renderRequested();
      schedulePageUpdate();
    },
    { rootMargin: "200px 0px" },
  );

  const resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth || 900;
    if (width !== layoutWidth) refreshLayout(width);
    else schedulePageUpdate();
  });
  resizeObserver.observe(container);
  window.addEventListener("scroll", schedulePageUpdate, { passive: true, capture: true });
  window.addEventListener("resize", schedulePageUpdate);

  async function renderRequested() {
    if (busy || stopped) return;
    busy = true;

    try {
      while (!stopped) {
        const preferred = priorityPage !== null && requested.has(priorityPage) &&
          slots.get(priorityPage)?.figure.dataset.renderState === "waiting"
          ? priorityPage : undefined;
        const number = preferred ?? [...requested].find(
          (value) =>
            slots.get(value)?.figure.dataset.renderState === "waiting",
        );

        if (number === undefined) break;
        if (number === priorityPage) priorityPage = null;

        const slot = slots.get(number)!;
        let page: PDFPageProxy | null = null;
        let completed = false;
        const renderRevision = revision;
        const renderZoom = zoom;

        renderingPage = number;
        slot.figure.dataset.renderState = "rendering";
        slot.figure.setAttribute("aria-busy", "true");
        slot.caption.textContent =
          `Página ${number} de ${pdf.numPages} — Preparando página...`;

        try {
          page = await pdf.getPage(number);

          if (stopped || !requested.has(number) || renderRevision !== revision) continue;

          const original = page.getViewport({ scale: 1 });
          slot.naturalWidth = original.width * 1.5;
          sizeSlot(slot);
          const viewport = page.getViewport({ scale: displayWidth(slot) / original.width });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);

          slot.body.style.aspectRatio =
            `${viewport.width} / ${viewport.height}`;
          schedulePageUpdate();

          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width * outputScale);
          canvas.height = Math.ceil(viewport.height * outputScale);
          canvas.className = "block h-auto w-full";
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `Página ${number} del PDF original`,
          );

          slot.canvas = canvas;
          slot.body.append(canvas);

          renderTask = page.render({
            canvas,
            viewport,
            transform: [outputScale, 0, 0, outputScale, 0, 0],
          });

          await renderTask.promise;

          if (stopped || !requested.has(number) || renderRevision !== revision) continue;

          completed = true;
          slot.figure.dataset.renderState = "ready";
          slot.figure.dataset.renderZoom = String(renderZoom);
          slot.figure.setAttribute("aria-busy", "false");
          slot.caption.textContent =
            `Página ${number} de ${pdf.numPages}`;
          firstPageRendered = true;
          onReady();
        } catch (error) {
          if (stopped) break;

          if (
            error instanceof Error &&
            error.name === "RenderingCancelledException"
          ) {
            continue;
          }

          throw error;
        } finally {
          renderTask = null;
          renderingPage = 0;
          page?.cleanup();

          if (!completed) release(slot);
        }
      }
    } catch (error) {
      if (!stopped) {
        requested.clear();
        observer.disconnect();
        onError(error);
      }
    } finally {
      busy = false;
    }
  }

  // Primero dibujar la portada; después atender el desplazamiento.
  void renderRequested().then(() => {
    if (stopped) return;

    for (const slot of slots.values()) {
      observer.observe(slot.figure);
    }
  });

  function dispose() {
    if (stopped) return;
    stopped = true;
    observer.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("scroll", schedulePageUpdate, true);
    window.removeEventListener("resize", schedulePageUpdate);
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    requested.clear();
    renderTask?.cancel();

    for (const [number, slot] of slots) {
      // El render cancelado libera su canvas al terminar su promesa.
      if (number !== renderingPage) release(slot);
    }

    container.replaceChildren();
  }

  return {
    goToPage(number) {
      if (stopped || !Number.isInteger(number) || number < 1 || number > pdf.numPages) {
        return false;
      }

      // El espacio ya existe aunque su canvas todavía no se haya renderizado.
      scrollToPage(number);
      requested.add(number);
      releaseDistantPages();
      priorityPage = number;
      reportCurrentPage(number);
      schedulePageUpdate();
      void renderRequested();
      return true;
    },
    setZoom(percentage) {
      if (stopped || !Number.isInteger(percentage) || percentage < 50 || percentage > 200) return false;
      if (percentage === zoom) return true;
      zoom = percentage;
      refreshLayout(container.clientWidth || 900);
      return true;
    },
    dispose,
  };
}
