"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderThumbnails } from "@/lib/pdf/render-thumbnails";

type ThumbnailProps = {
  pdf: PDFDocumentProxy;
  currentPage: number;
  onNavigate: (number: number) => void;
};

export function PdfThumbnails({ pdf, currentPage, onNavigate }: ThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return renderThumbnails(pdf, container, () => setHasError(true));
  }, [pdf]);

  useEffect(() => {
    const container = containerRef.current;
    const selected = container?.querySelector<HTMLElement>(`[data-thumbnail-button="${currentPage}"]`);
    if (!container || !selected) return;
    container.scrollTo({
      left: selected.offsetLeft - (container.clientWidth - selected.clientWidth) / 2,
      behavior: "instant",
    });
  }, [currentPage]);

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div
        ref={containerRef}
        role="group"
        aria-label="Miniaturas del documento"
        tabIndex={0}
        className="relative flex gap-2 overflow-x-auto pb-2"
      >
        {Array.from({ length: pdf.numPages }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            data-thumbnail-button={number}
            aria-label={`Ir a página ${number}`}
            aria-current={number === currentPage ? "page" : undefined}
            onClick={() => onNavigate(number)}
            className={`shrink-0 rounded-lg border-2 p-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              number === currentPage
                ? "border-blue-700 bg-blue-50 font-semibold text-blue-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-400"
            }`}
          >
            <span
              data-thumbnail-page={number}
              className="flex h-28 w-24 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
            />
            <span className="mt-1 block">Página {number}</span>
          </button>
        ))}
      </div>
      {hasError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          No fue posible cargar una miniatura. Cierra y abre las miniaturas para reintentar.
        </p>
      )}
    </div>
  );
}
