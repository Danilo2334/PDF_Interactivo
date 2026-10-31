"use client";

import { useId } from "react";
import type { SelectionTextDraft } from "@/lib/pdf/selection-text-draft";

export function SelectionTextEditor({ draft, hasPage, onExtract, onChange, onConfirm }: {
  draft: SelectionTextDraft | null;
  hasPage: boolean;
  onExtract: () => void;
  onChange: (text: string) => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const loading = draft?.status === "loading";
  const message = loading ? "Extrayendo texto de la selección…"
    : draft?.status === "manual" ? "Texto escrito manualmente. Revísalo antes de confirmarlo."
    : draft?.status === "error" ? "No fue posible extraer el texto. Puedes reintentar o escribirlo manualmente; se conserva tu página y selección."
    : draft?.status === "empty" ? "No se encontró texto digital completo en la selección. Amplía la zona o escribe el contenido manualmente. Las imágenes y los PDF escaneados necesitan entrada manual."
    : draft?.status === "ready" ? "Texto extraído. Revisa el orden, los espacios y los caracteres antes de confirmarlo."
    : "Extrae el texto de la selección, o de la página completa si no marcaste un fragmento. También puedes escribirlo manualmente.";

  return <fieldset className="space-y-3 border-t border-slate-200 pt-3" disabled={!hasPage}>
    <legend className="font-semibold text-slate-900">Contenido para el asistente</legend>
    <p id={`${id}-status`} role="status" className="text-sm text-slate-700">{message}</p>
    {draft?.fragment?.kind === "area" && <p className="text-xs text-slate-600">Si la zona corta una línea, amplíala o usa «Seleccionar texto» para elegir palabras exactas.</p>}
    <button type="button" disabled={!hasPage || loading} onClick={onExtract}
      className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50">
      {loading ? "Extrayendo…" : draft ? "Extraer de nuevo" : "Extraer texto"}
    </button>
    {draft?.text && <p className="text-xs text-slate-600">Extraer de nuevo reemplaza la edición actual de este texto.</p>}
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">Texto para el asistente</label>
      <textarea id={id} name="selectionText" rows={6} value={draft?.text ?? ""}
        onChange={event => onChange(event.target.value)} aria-describedby={`${id}-status ${id}-help`}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" />
      <p id={`${id}-help`} className="text-xs text-slate-600">Corrige aquí los espacios, saltos de línea o caracteres. Solo cambia el borrador; el PDF original se conserva.</p>
    </div>
    <button type="button" onClick={onConfirm} disabled={!hasPage || loading || !draft?.text.trim()}
      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar texto en borrador</button>
    <input type="hidden" name="extractedText" value={draft?.confirmed ? JSON.stringify({
      documentId: draft.documentId, pageNumber: draft.pageNumber, fragment: draft.fragment,
      source: draft.source, originalText: draft.originalText, text: draft.text,
    }) : ""} />
    {draft?.confirmed && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
      Texto {draft.source === "manual" ? "manual " : ""}confirmado para la página {draft.pageNumber}.
    </p>}
  </fieldset>;
}
