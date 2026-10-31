import type { PDFDocumentProxy } from "pdfjs-dist";
import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";
import type { PageViewport } from "pdfjs-dist/types/src/display/page_viewport";
import type { FragmentSelection, ProportionalRect } from "./fragment-selection";

export type TextExtractionResult = {
  status: "ready" | "empty" | "error";
  text: string;
};

type PositionedText = {
  text: string;
  direction: string;
  angle: number;
  along: number;
  line: number;
  width: number;
  height: number;
  bounds: { left: number; top: number; right: number; bottom: number };
};

// Use the same page transform as the viewer, including rotation and CropBox.
function positionItem(item: TextItem, content: TextContent, viewport: PageViewport): PositionedText | null {
  const m = item.transform, v = viewport.transform;
  if (m.length !== 6 || !m.every(Number.isFinite) || !Number.isFinite(item.width) || !Number.isFinite(item.height)) return null;
  const a = v[0] * m[0] + v[2] * m[1];
  const b = v[1] * m[0] + v[3] * m[1];
  const c = v[0] * m[2] + v[2] * m[3];
  const d = v[1] * m[2] + v[3] * m[3];
  const x = v[0] * m[4] + v[2] * m[5] + v[4];
  const y = v[1] * m[4] + v[3] * m[5] + v[5];
  const style = content.styles[item.fontName];
  const angle = Math.atan2(b, a) + (style?.vertical ? Math.PI / 2 : 0);
  const height = Math.hypot(c, d);
  const scale = Math.hypot(v[0], v[1]);
  const width = Math.abs((style?.vertical ? item.height : item.width) * scale);
  if (height <= 0 || width <= 0 || !item.str.trim()) return null;
  const ascent = Number.isFinite(style?.ascent) ? style.ascent : Number.isFinite(style?.descent) ? 1 + style.descent : 0.8;
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const left = x + uy * height * ascent, top = y - ux * height * ascent;
  const corners = [
    [left, top], [left + ux * width, top + uy * width],
    [left - uy * height, top + ux * height],
    [left + ux * width - uy * height, top + uy * width + ux * height],
  ];
  return {
    text: item.str, direction: item.dir, angle,
    along: x * ux + y * uy, line: -x * uy + y * ux, width, height,
    bounds: {
      left: Math.min(...corners.map(point => point[0])),
      top: Math.min(...corners.map(point => point[1])),
      right: Math.max(...corners.map(point => point[0])),
      bottom: Math.max(...corners.map(point => point[1])),
    },
  };
}

function validRect(rect: ProportionalRect) {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0
    && rect.x + rect.width <= 1.000001 && rect.y + rect.height <= 1.000001;
}

function joinPositionedText(items: PositionedText[]): string {
  const lines: { angle: number; baseline: number; height: number; items: PositionedText[] }[] = [];
  // PDF content streams need not store words in their visual reading order.
  for (const item of items.toSorted((a, b) => a.line - b.line || a.along - b.along)) {
    let line = lines.find(candidate => Math.abs(candidate.angle - item.angle) < 0.05
      && Math.abs(candidate.baseline - item.line) <= Math.min(candidate.height, item.height) * 0.35);
    if (!line) {
      line = { angle: item.angle, baseline: item.line, height: item.height, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }
  return lines.map(line => {
    const rtl = line.items.filter(item => item.direction === "rtl").length > line.items.length / 2;
    const ordered = line.items.toSorted((a, b) => rtl ? b.along - a.along : a.along - b.along);
    let text = "";
    for (let index = 0; index < ordered.length; index++) {
      const item = ordered[index], previous = ordered[index - 1];
      const gap = previous ? rtl ? previous.along - item.along - item.width : item.along - previous.along - previous.width : 0;
      if (previous && gap > Math.min(previous.height, item.height) * 0.15 && !/\s$/.test(text) && !/^\s/.test(item.text)) text += " ";
      text += item.text;
    }
    return text.replace(/[\t ]+/g, " ").trim();
  }).filter(Boolean).join("\n");
}

export function textFromPageContent(content: TextContent, viewport: PageViewport, rect?: ProportionalRect): string {
  if (rect && !validRect(rect)) throw new Error("Invalid selection bounds");
  const items: PositionedText[] = [];
  for (const item of content.items) {
    if (!("str" in item)) continue;
    const positioned = positionItem(item, content, viewport);
    if (!positioned) continue;
    if (rect) {
      const box = positioned.bounds;
      // Include only complete text items; never silently add text outside the area.
      // A half-unit tolerance accounts for PDF coordinate rounding, independent of zoom.
      const tolerance = 0.5 * Math.hypot(viewport.transform[0], viewport.transform[1]);
      if (box.left < rect.x * viewport.width - tolerance || box.top < rect.y * viewport.height - tolerance
        || box.right > (rect.x + rect.width) * viewport.width + tolerance
        || box.bottom > (rect.y + rect.height) * viewport.height + tolerance) continue;
    }
    items.push(positioned);
  }
  return joinPositionedText(items);
}

export async function extractSelectionText(pdf: PDFDocumentProxy | null, pageNumber: number,
  fragment: FragmentSelection | null): Promise<TextExtractionResult> {
  try {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || (fragment && fragment.pageNumber !== pageNumber)) throw new Error("Invalid page");
    let text: string;
    if (fragment?.kind === "text") {
      // The native range already clips partial words exactly. Do not widen it to PDF items.
      text = fragment.text;
    } else {
      if (!pdf || pageNumber > pdf.numPages) throw new Error("PDF unavailable");
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text = textFromPageContent(content, page.getViewport({ scale: 1 }), fragment?.rect);
      // The viewer owns this PDF and its page lifecycle. Do not destroy/cleanup it here.
    }
    text = text.replace(/\r\n?/g, "\n").trim();
    return { status: text ? "ready" : "empty", text };
  } catch {
    return { status: "error", text: "" };
  }
}
