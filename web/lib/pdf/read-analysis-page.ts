import "server-only";
import { createHash } from "node:crypto";
import type { FragmentSelection, ProportionalRect } from "@/lib/pdf/fragment-selection";
import { textFromPageContent } from "@/lib/pdf/extract-selection-text";

function neighborhood(fragment: FragmentSelection | null): ProportionalRect | undefined {
  if (!fragment) return;
  const rects = fragment.kind === "area" ? [fragment.rect] : fragment.rects;
  const left = Math.max(0, Math.min(...rects.map(r => r.x)) - .05);
  const top = Math.max(0, Math.min(...rects.map(r => r.y)) - .08);
  const right = Math.min(1, Math.max(...rects.map(r => r.x + r.width)) + .05);
  const bottom = Math.min(1, Math.max(...rects.map(r => r.y + r.height)) + .08);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export async function readAnalysisPage(bytes: Uint8Array, pageNumber: number, fragment: FragmentSelection | null) {
  if (bytes.byteLength === 0 || bytes.byteLength > 20 * 1024 * 1024) throw Error("Invalid PDF size");
  const hash = () => createHash("sha256").update(bytes).digest("hex");
  const before = hash();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // PDF.js may transfer its input to a worker. Give it a copy, never the source.
  const task = pdfjs.getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true, useWorkerFetch: false,
    isOffscreenCanvasSupported: false, isImageDecoderSupported: false, stopAtErrors: true, disableFontFace: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      (async () => {
        const pdf = await task.promise;
        if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages) throw Error("Page unavailable");
        const page = await pdf.getPage(pageNumber), content = await page.getTextContent(), viewport = page.getViewport({ scale: 1 });
        const pageText = textFromPageContent(content, viewport);
        const rect = neighborhood(fragment);
        return { pageText, areaText: rect ? textFromPageContent(content, viewport, rect) : "", pdfSha256: before };
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("PDF read timeout")), 12000); }),
    ]);
    if (hash() !== before) throw Error("PDF bytes changed while reading");
    return result;
  } finally { clearTimeout(timer); await task.destroy(); }
}
