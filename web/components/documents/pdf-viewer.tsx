"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { renderVisiblePages } from "@/lib/pdf/render-visible-pages";
import type { PageRenderer } from "@/lib/pdf/render-visible-pages";
import { ViewTiming } from "@/components/diagnostics/view-timing";
import { PdfThumbnails } from "@/components/documents/pdf-thumbnails";

type ViewerProps = {
  projectId: string;
  initialPage?: number;
  onPageSelect?: (number: number | null) => void;
  requestDraft?: ReactNode;
};

type ViewerStatus =
  | "downloading"
  | "processing"
  | "rendering"
  | "ready"
  | "error";

const viewerMessages = {
  downloading: "Descargando PDF...",
  processing: "Procesando el documento...",
  rendering: "Preparando la primera página...",
  ready: "PDF disponible. Usa los controles o desplázate para consultar sus páginas.",
};

export function PdfViewer({ projectId, initialPage = 1, onPageSelect, requestDraft }: ViewerProps) {
  const [attempt, setAttempt] = useState(0);
  // Only restore on mount; changing the selection must not reload the PDF.
  const [startingPage] = useState(initialPage);

  return (
    <PdfPages
      key={`${projectId}-${attempt}`}
      projectId={projectId}
      initialPage={startingPage}
      onPageSelect={onPageSelect}
      requestDraft={requestDraft}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function PdfPages({
  projectId,
  initialPage = 1,
  onPageSelect,
  requestDraft,
  onRetry,
}: ViewerProps & { onRetry: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PageRenderer | null>(null);
  const pageInputId = useId();
  const [status, setStatus] = useState<ViewerStatus>("downloading");
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [pageInputError, setPageInputError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isLoading =
    status === "downloading" ||
    status === "processing" ||
    status === "rendering";

  function navigateToPage(number: number) {
    if (status !== "ready" || !rendererRef.current?.goToPage(number)) return;
    setPageInput(String(number));
    setPageInputError("");
  }

  function changeZoom(percentage: number) {
    if (status !== "ready" || !rendererRef.current?.setZoom(percentage)) return;
    setZoom(percentage);
  }

  function submitPage(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = pageInput.trim();
    const number = Number(input);

    if (!/^\d+$/.test(input) || !Number.isInteger(number) || number < 1 || number > totalPages) {
      setPageInputError(`Introduce un número entero entre 1 y ${totalPages}.`);
      return;
    }

    navigateToPage(number);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new AbortController();
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let renderer: PageRenderer | null = null;
    let restoredSelection = false;

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

        setStatus("processing");

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
        setPdfDocument(pdf);
        setStatus("rendering");

        renderer = renderVisiblePages(
          pdf,
          container!,
          () => {
            if (!active) return;
            setStatus("ready");
            if (!restoredSelection) {
              restoredSelection = true;
              const page = Number.isInteger(initialPage) && initialPage >= 1 && initialPage <= pdf.numPages ? initialPage : 1;
              if (page === 1) onPageSelect?.(1);
              else renderer?.goToPage(page);
            }
          },
          (error) => {
            if (!active) return;

            console.error("Error renderizando página:", error);
            renderer?.dispose();
            rendererRef.current = null;

            setErrorMessage(
              "No fue posible visualizar una página. Inténtalo nuevamente.",
            );
            setStatus("error");
            onPageSelect?.(null);

            void loadingTask?.destroy().catch(() => {});
          },
          (number) => {
            if (!active) return;
            setCurrentPage(number);
            setPageInput(String(number));
            setPageInputError("");
            onPageSelect?.(number);
          },
          () => navigationRef.current?.getBoundingClientRect().height ?? 0,
        );
        rendererRef.current = renderer;
      } catch (error) {
        if (!active) return;

        console.error("Error visualizando PDF:", error);
        setErrorMessage(failureMessage);
        setStatus("error");
        onPageSelect?.(null);
      }
    }

    void loadPages();

    return () => {
      active = false;
      controller.abort();
      rendererRef.current = null;
      renderer?.dispose();

      if (loadingTask) {
        void loadingTask.destroy().catch(() => {});
      }

      container.replaceChildren();
    };
  }, [projectId, initialPage, onPageSelect]);

  return (
    <section
      data-viewer-state={status}
      className="mt-8 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      {status === "ready" && (
        <ViewTiming metric="primera-pagina-pdf" items={totalPages} />
      )}

      <h2 className="text-xl font-semibold text-slate-900">
        PDF original
      </h2>

      {totalPages > 0 && (
        <p className="mt-2 text-sm text-slate-600">
          Total de páginas: {totalPages}
        </p>
      )}

      {status !== "error" && (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`my-4 text-sm ${
            status === "ready" ? "text-green-700" : "text-slate-600"
          }`}
        >
          {viewerMessages[status]}
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

      {totalPages > 0 && (
        <div
          ref={navigationRef}
          role="group"
          aria-label="Navegación por páginas del PDF"
          className="sticky top-0 z-10 mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-slate-900">
              Página {currentPage} de {totalPages}
            </p>
            <button
              type="button"
              disabled={status !== "ready" || currentPage <= 1}
              onClick={() => navigateToPage(currentPage - 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={status !== "ready" || currentPage >= totalPages}
              onClick={() => navigateToPage(currentPage + 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
            <form onSubmit={submitPage} noValidate className="flex flex-wrap items-center gap-2">
              <label htmlFor={pageInputId} className="text-sm text-slate-700">
                Ir a página
              </label>
              <input
                id={pageInputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={pageInput}
                disabled={status !== "ready"}
                aria-invalid={Boolean(pageInputError)}
                aria-describedby={pageInputError ? `${pageInputId}-error` : undefined}
                onChange={(event) => {
                  setPageInput(event.target.value);
                  setPageInputError("");
                }}
                className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status !== "ready"}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ir
              </button>
            </form>
            <button
              type="button"
              disabled={status !== "ready"}
              aria-expanded={showThumbnails}
              aria-controls={`${pageInputId}-thumbnails`}
              onClick={() => setShowThumbnails((value) => !value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              {showThumbnails ? "Ocultar miniaturas" : "Mostrar miniaturas"}
            </button>
            <div role="group" aria-label="Zoom del PDF" className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Reducir zoom"
                disabled={status !== "ready" || zoom <= 50}
                onClick={() => changeZoom(zoom - 25)}
                className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                −
              </button>
              <output aria-label="Porcentaje de zoom" className="min-w-14 text-center text-sm font-semibold text-slate-900">
                {zoom} %
              </output>
              <button
                type="button"
                aria-label="Aumentar zoom"
                disabled={status !== "ready" || zoom >= 200}
                onClick={() => changeZoom(zoom + 25)}
                className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
          {requestDraft}
          {pageInputError && (
            <p id={`${pageInputId}-error`} role="alert" className="mt-2 text-sm text-red-700">
              {pageInputError}
            </p>
          )}
          {showThumbnails && status === "ready" && pdfDocument && (
            <div id={`${pageInputId}-thumbnails`}>
              <PdfThumbnails pdf={pdfDocument} currentPage={currentPage} onNavigate={navigateToPage} />
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        aria-busy={isLoading}
        className={
          status === "error" ? "hidden" : "mt-4 space-y-6"
        }
      />

    </section>
  );
}
