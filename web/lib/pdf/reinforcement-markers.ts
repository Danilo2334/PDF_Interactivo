import type { ProportionalRect } from "./fragment-selection";

export type PdfReinforcementMarker = {
  id: string;
  title: string;
  pageNumber: number;
  selection: unknown;
};
export type PlacedReinforcementMarker = PdfReinforcementMarker & {
  number: number;
  rects: ProportionalRect[];
  left: number;
  top: number;
};
const size = 44;

function selectionRects(marker: PdfReinforcementMarker): ProportionalRect[] | null {
  if (marker.selection == null) return [];
  const value = marker.selection as { kind?: string; pageNumber?: number; rect?: ProportionalRect; rects?: ProportionalRect[] };
  if (value.pageNumber !== marker.pageNumber) return null;
  const rects = value.kind === "area" ? [value.rect] : value.kind === "text" ? value.rects : null;
  if (!Array.isArray(rects) || !rects.length || rects.length > 500 || rects.some(r => !r ||
    ![r.x, r.y, r.width, r.height].every(Number.isFinite) || r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 ||
    r.x + r.width > 1.000001 || r.y + r.height > 1.000001)) return null;
  return rects as ProportionalRect[];
}

// Pixel-sized controls remain reachable; proportional highlights follow the PDF
// at every render scale. Dense pages also have a complete keyboard-accessible list.
export function placeReinforcementMarkers(markers: readonly PdfReinforcementMarker[], pageNumber: number, width: number, height: number): PlacedReinforcementMarker[] {
  if (![width, height].every(Number.isFinite) || width < size || height < size) return [];
  const result: PlacedReinforcementMarker[] = [], ids = new Set<string>();
  const page = markers.filter(m => m.pageNumber === pageNumber);
  const columns = Math.max(1, Math.floor(width / size)), rows = Math.max(1, Math.floor(height / size));
  for (const [index, marker] of page.entries()) {
    if (ids.has(marker.id)) continue;
    ids.add(marker.id);
    const rects = selectionRects(marker);
    if (!rects) continue;
    const anchor = rects[0];
    let left = Math.max(0, Math.min(width - size, anchor ? (anchor.x + anchor.width) * width : width - size));
    let top = Math.max(0, Math.min(height - size, anchor ? anchor.y * height - size : 0));
    let attempts = 0;
    while (result.some(p => Math.abs(p.left - left) < size && Math.abs(p.top - top) < size) && attempts++ < rows * columns) {
      top += size;
      if (top + size > height) { top = 0; left -= size; if (left < 0) left = width - size; }
    }
    if (result.some(p => Math.abs(p.left - left) < size && Math.abs(p.top - top) < size)) continue;
    result.push({ ...marker, number: index + 1, rects, left, top });
  }
  return result;
}

export function decorateReinforcementMarkers(pageNumber: number, body: HTMLElement, viewport: { width: number; height: number },
  markers: readonly PdfReinforcementMarker[], onActivate: (id: string, page: number) => void) {
  const placed = placeReinforcementMarkers(markers, pageNumber, viewport.width, viewport.height);
  if (!placed.length) return () => {};
  const layer = document.createElement("div"), buttons: HTMLButtonElement[] = [];
  layer.className = "pdf-reinforcement-markers";
  layer.setAttribute("role", "group");
  layer.setAttribute("aria-label", `Indicadores de refuerzo de la página ${pageNumber}`);
  body.style.position = "relative";
  for (const marker of placed) {
    const group = document.createElement("div"); group.className = "pdf-reinforcement-marker-group";
    for (const rect of marker.rects) {
      const highlight = document.createElement("span");
      highlight.className = "pdf-reinforcement-highlight"; highlight.setAttribute("aria-hidden", "true");
      Object.assign(highlight.style, { left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` });
      group.append(highlight);
    }
    const button = document.createElement("button"); button.type = "button"; button.className = "pdf-reinforcement-marker";
    button.dataset.reinforcementId = marker.id;
    const label = `Abrir refuerzo ${marker.number}: ${marker.title} · Página ${pageNumber}${marker.rects.length ? " · Fragmento señalado" : " · Página completa"}`;
    button.textContent = String(marker.number); button.title = label; button.setAttribute("aria-label", label);
    Object.assign(button.style, { left: `${marker.left}px`, top: `${marker.top}px` });
    button.onclick = event => { event.stopPropagation(); onActivate(marker.id, pageNumber); };
    buttons.push(button); group.append(button); layer.append(group);
  }
  body.append(layer);
  return () => { for (const button of buttons) button.onclick = null; layer.remove(); };
}
