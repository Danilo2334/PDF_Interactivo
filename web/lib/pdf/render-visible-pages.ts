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
};

export function renderVisiblePages(
  pdf: PDFDocumentProxy,
  container: HTMLElement,
  onReady: () => void,
  onError: (error: unknown) => void,
) {
  const slots = new Map<number, PageSlot>();
  const requested = new Set<number>([1]);

  let stopped = false;
  let busy = false;
  let renderingPage = 0;
  let renderTask: RenderTask | null = null;

  function release(slot: PageSlot) {
    if (slot.canvas) {
      slot.canvas.remove();
      slot.canvas.width = 0;
      slot.canvas.height = 0;
      slot.canvas = null;
    }

    slot.figure.dataset.renderState = "waiting";
    slot.figure.setAttribute("aria-busy", "false");
    slot.caption.textContent =
      `Página ${slot.figure.dataset.pdfPage} de ${pdf.numPages}`;
  }

  // Reservar espacio no implica leer ni dibujar todas las páginas.
  for (let number = 1; number <= pdf.numPages; number++) {
    const figure = document.createElement("figure");
    figure.className = "min-w-0";
    figure.dataset.pdfPage = String(number);
    figure.dataset.renderState = "waiting";

    const caption = document.createElement("figcaption");
    caption.className = "mb-2 text-center text-sm text-slate-600";
    caption.textContent = `Página ${number} de ${pdf.numPages}`;

    const body = document.createElement("div");
    body.className =
      "mx-auto w-full overflow-hidden rounded border border-slate-200 bg-white";
    body.style.maxWidth = "900px";
    body.style.aspectRatio = "210 / 297";

    figure.append(caption, body);
    container.append(figure);

    slots.set(number, { figure, caption, body, canvas: null });
  }

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
    },
    { rootMargin: "200px 0px" },
  );

  async function renderRequested() {
    if (busy || stopped) return;
    busy = true;

    try {
      while (!stopped) {
        const number = [...requested].find(
          (value) =>
            slots.get(value)?.figure.dataset.renderState === "waiting",
        );

        if (number === undefined) break;

        const slot = slots.get(number)!;
        let page: PDFPageProxy | null = null;
        let completed = false;

        renderingPage = number;
        slot.figure.dataset.renderState = "rendering";
        slot.figure.setAttribute("aria-busy", "true");
        slot.caption.textContent =
          `Página ${number} de ${pdf.numPages} — Preparando página...`;

        try {
          page = await pdf.getPage(number);

          if (stopped || !requested.has(number)) continue;

          const viewport = page.getViewport({ scale: 1.5 });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);

          slot.body.style.aspectRatio =
            `${viewport.width} / ${viewport.height}`;
          slot.body.style.maxWidth = `${viewport.width}px`;

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

          if (stopped || !requested.has(number)) continue;

          completed = true;
          slot.figure.dataset.renderState = "ready";
          slot.figure.setAttribute("aria-busy", "false");
          slot.caption.textContent =
            `Página ${number} de ${pdf.numPages}`;
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

  return () => {
    stopped = true;
    observer.disconnect();
    requested.clear();
    renderTask?.cancel();

    for (const [number, slot] of slots) {
      // El render cancelado libera su canvas al terminar su promesa.
      if (number !== renderingPage) release(slot);
    }

    container.replaceChildren();
  };
}
