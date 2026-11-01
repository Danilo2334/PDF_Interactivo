import type { PDFPageProxy } from "pdfjs-dist";
import { textFromPageContent } from "./extract-selection-text";

export async function decorateReadablePageText(page: PDFPageProxy, body: HTMLElement, id: string) {
  const figure = body.parentElement;
  if (!figure) return () => {};
  const details = document.createElement("details"), summary = document.createElement("summary"), text = document.createElement("p");
  details.id = id; details.className = "mt-3 max-w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900";
  summary.textContent = `Texto digital de la página ${page.pageNumber}`; summary.className = "cursor-pointer font-semibold";
  text.className = "mt-2 whitespace-pre-wrap break-words";
  try {
    const content = textFromPageContent(await page.getTextContent(), page.getViewport({ scale: 1 })).trim();
    text.textContent = content || "Esta página no dispone de texto digital. Se conserva la imagen original; no se realizó OCR.";
  } catch {
    text.textContent = "No fue posible obtener el texto digital de esta página. El PDF original sigue disponible.";
  }
  details.append(summary, text); figure.append(details);
  const canvas = body.querySelector("canvas"), previous = canvas?.getAttribute("aria-describedby");
  canvas?.setAttribute("aria-describedby", id);
  return () => {
    if (canvas?.getAttribute("aria-describedby") === id) {
      if (previous) canvas.setAttribute("aria-describedby", previous); else canvas.removeAttribute("aria-describedby");
    }
    details.remove();
  };
}
