"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";

type ViewerStatus = "loading" | "ready" | "error";

export function PdfViewer({ projectId }: { projectId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    let renderTask: RenderTask | undefined;
    let failureMessage =
      "No fue posible visualizar el PDF. Revisa tu conexión y reintenta.";

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!active) return;

        pdfjs.GlobalWorkerOptions.workerSrc =
          `/pdfjs/pdf.worker.min.mjs?v=${pdfjs.version}`;

        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/pdf`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;

          failureMessage = body?.message ?? failureMessage;
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

        const page = await pdf.getPage(1);
        if (!active || !canvas) return;

        const viewport = page.getViewport({ scale: 1.5 });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.ceil(viewport.width * outputScale);
        canvas.height = Math.ceil(viewport.height * outputScale);
        canvas.style.maxWidth = `${viewport.width}px`;

        renderTask = page.render({
          canvas,
          viewport,
          transform: [outputScale, 0, 0, outputScale, 0, 0],
        });

        await renderTask.promise;

        if (active) {
          setStatus("ready");
        }
      } catch (error) {
        if (!active) return;

        console.error("Error visualizando PDF:", error);
        setErrorMessage(failureMessage);
        setStatus("error");
      }
    }

    void loadPdf();

    return () => {
      active = false;
      controller.abort();
      renderTask?.cancel();

      if (loadingTask) {
        void loadingTask.destroy().catch(() => undefined);
      }
    };
  }, [projectId, attempt]);

  function retry() {
    setStatus("loading");
    setErrorMessage("");
    setAttempt((previous) => previous + 1);
  }

  return (
    <section
      aria-label="Visor del PDF original"
      aria-busy={status === "loading"}
      className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        PDF original
      </h2>

      {status === "loading" && (
        <p role="status" className="py-8 text-center text-slate-600">
          Cargando documento PDF…
        </p>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p role="alert" className="text-sm text-red-800">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Reintentar
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        hidden={status !== "ready"}
        role="img"
        aria-label="Primera página del PDF original"
        className="mx-auto h-auto w-full bg-white shadow-sm"
      >
        Primera página del documento PDF.
      </canvas>
    </section>
  );
}
