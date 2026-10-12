"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";

type ViewerProps = {
  projectId: string;
};

type ViewerStatus = "loading" | "ready" | "error";

export function PdfViewer({ projectId }: ViewerProps) {
  const [attempt, setAttempt] = useState(0);

  return (
    <PdfPages
      key={`${projectId}-${attempt}`}
      projectId={projectId}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function PdfPages({
  projectId,
  onRetry,
}: ViewerProps & { onRetry: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [totalPages, setTotalPages] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new AbortController();
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let renderTask: RenderTask | null = null;

    async function loadPages() {
      let failureMessage =
        "No fue posible visualizar el PDF. Inténtalo nuevamente.";

      try {
        const pdfjs = await import("pdfjs-dist");
        if (!active) return;

        pdfjs.GlobalWorkerOptions.workerSrc =
          `/pdfjs/pdf.worker.min.mjs?v=${pdfjs.version}`;

        const response = await fetch(
          `/api/projects/${projectId}/pdf`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          failureMessage = body?.message || failureMessage;
          throw new Error(failureMessage);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!active) return;

        loadingTask = pdfjs.getDocument({
          data: bytes,
          cMapUrl: `${window.location.origin}/pdfjs/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl:
            `${window.location.origin}/pdfjs/standard_fonts/`,
          wasmUrl: `${window.location.origin}/pdfjs/wasm/`,
        });

        const pdf = await loadingTask.promise;
        if (!active) return;

        if (pdf.numPages < 1) {
          failureMessage = "El documento no contiene páginas.";
          throw new Error(failureMessage);
        }

        setTotalPages(pdf.numPages);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (!active) return;

          const page = await pdf.getPage(pageNumber);
          if (!active) return;

          const viewport = page.getViewport({ scale: 1.5 });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);

          const figure = document.createElement("figure");
          figure.className = "min-w-0";
          figure.dataset.pageNumber = String(pageNumber);

          const caption = document.createElement("figcaption");
          caption.className = "mb-2 text-center text-sm text-slate-600";
          caption.textContent =
            `Página ${pageNumber} de ${pdf.numPages}`;

          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width * outputScale);
          canvas.height = Math.ceil(viewport.height * outputScale);
          canvas.className =
            "mx-auto block rounded border border-slate-200 bg-white";
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.maxWidth = `${viewport.width}px`;
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `Página ${pageNumber} del PDF original`,
          );

          figure.append(caption, canvas);
          container!.append(figure);

          renderTask = page.render({
            canvas,
            viewport,
            transform: [outputScale, 0, 0, outputScale, 0, 0],
          });

          await renderTask.promise;
          renderTask = null;

          if (!active) return;

          page.cleanup();
          setRenderedPages(pageNumber);
        }

        if (active) setStatus("ready");
      } catch (error) {
        if (!active) return;

        console.error("Error visualizando PDF:", error);
        setErrorMessage(failureMessage);
        setStatus("error");
      }
    }

    void loadPages();

    return () => {
      active = false;
      controller.abort();
      renderTask?.cancel();

      if (loadingTask) {
        void loadingTask.destroy().catch(() => {});
      }

      container.replaceChildren();
    };
  }, [projectId]);

  return (
    <section
      aria-busy={status === "loading"}
      className="mt-8 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <h2 className="text-xl font-semibold text-slate-900">
        PDF original
      </h2>

      {totalPages > 0 && (
        <p className="mt-2 text-sm text-slate-600">
          Total de páginas: {totalPages}
        </p>
      )}

      {status === "loading" && (
        <p role="status" className="my-4 text-sm text-slate-600">
          {totalPages === 0
            ? "Cargando PDF..."
            : `Renderizando páginas: ${renderedPages} de ${totalPages}...`}
        </p>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={
          status === "error" ? "hidden" : "mt-4 space-y-6"
        }
      />

      {status === "ready" && (
        <p role="status" className="mt-4 text-sm text-green-700">
          Se visualizaron las {totalPages} páginas correctamente.
        </p>
      )}
    </section>
  );
}
