"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import { renderVisiblePages } from "@/lib/pdf/render-visible-pages";

type ViewerProps = {
  projectId: string;
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
  ready: "PDF disponible. Desplázate para consultar sus páginas.",
};

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
  const [status, setStatus] = useState<ViewerStatus>("downloading");
  const [totalPages, setTotalPages] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const isLoading =
    status === "downloading" ||
    status === "processing" ||
    status === "rendering";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new AbortController();
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let disposePages: (() => void) | null = null;

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
        setStatus("rendering");

        disposePages = renderVisiblePages(
          pdf,
          container!,
          () => {
            if (active) setStatus("ready");
          },
          (error) => {
            if (!active) return;

            console.error("Error renderizando página:", error);
            disposePages?.();

            setErrorMessage(
              "No fue posible visualizar una página. Inténtalo nuevamente.",
            );
            setStatus("error");

            void loadingTask?.destroy().catch(() => {});
          },
        );
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
      disposePages?.();

      if (loadingTask) {
        void loadingTask.destroy().catch(() => {});
      }

      container.replaceChildren();
    };
  }, [projectId]);

  return (
    <section
      data-viewer-state={status}
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
