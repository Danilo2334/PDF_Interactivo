export type ProportionalRect = { x: number; y: number; width: number; height: number };
export type FragmentSelection =
  | { kind: "text"; pageNumber: number; text: string; range: { start: number; end: number }; rects: ProportionalRect[] }
  | { kind: "area"; pageNumber: number; rect: ProportionalRect };
export type DocumentFragmentSelection = FragmentSelection & { documentId: string };

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export function proportionalRect(left: number, top: number, right: number, bottom: number,
  bounds: { left: number; top: number; width: number; height: number }): ProportionalRect | null {
  if (![left, top, right, bottom, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) return null;
  const x = clamp((Math.min(left, right) - bounds.left) / bounds.width);
  const y = clamp((Math.min(top, bottom) - bounds.top) / bounds.height);
  const width = clamp((Math.max(left, right) - bounds.left) / bounds.width) - x;
  const height = clamp((Math.max(top, bottom) - bounds.top) / bounds.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}
export function moveRect(rect: ProportionalRect, dx: number, dy: number): ProportionalRect {
  return { ...rect, x: clamp(rect.x + dx, 0, 1 - rect.width), y: clamp(rect.y + dy, 0, 1 - rect.height) };
}
export function resizeRect(rect: ProportionalRect, dx: number, dy: number): ProportionalRect {
  return { ...rect, width: clamp(rect.width + dx, Math.min(.01, 1 - rect.x), 1 - rect.x), height: clamp(rect.height + dy, Math.min(.01, 1 - rect.y), 1 - rect.y) };
}

// Serialize the native DOM range instead of retaining nodes invalidated by zoom.
export function readTextFragment(layer: HTMLElement, surface: HTMLElement, pageNumber: number,
  selection: Selection | null): FragmentSelection | null {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!layer.contains(range.startContainer) || !layer.contains(range.endContainer)) return null;
  const text = selection.toString().trim();
  if (!text) return null;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(layer); prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length;
  prefix.setEnd(range.endContainer, range.endOffset);
  const end = prefix.toString().length;
  const bounds = surface.getBoundingClientRect();
  const rects = Array.from(range.getClientRects(), r => proportionalRect(r.left, r.top, r.right, r.bottom, bounds))
    .filter((r): r is ProportionalRect => r !== null);
  return rects.length && end > start ? { kind: "text", pageNumber, text, range: { start, end }, rects } : null;
}
