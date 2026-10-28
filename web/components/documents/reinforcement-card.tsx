"use client";

import { useId, useRef, useState } from "react";
import type { Reinforcement } from "@/lib/types/reinforcement";
import { cardRecordSchema } from "@/lib/validations/reinforcement-card";
import { VisualResource } from "@/components/documents/visual-resource";
import { SummaryResource } from "@/components/documents/summary-resource";

type Props = { reinforcement: Reinforcement; projectId: string; canManage: boolean; onSource: (item: Reinforcement) => void };
export function ReinforcementCard({ reinforcement: item, projectId, canManage, onSource }: Props) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState(item.card ?? null);
  const [expanded, setExpanded] = useState(item.card?.initial_expanded ?? false);
  const [initialExpanded, setInitialExpanded] = useState(item.card?.initial_expanded ?? false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const pending = useRef<{ key: string; operationId: string } | null>(null);
  const source = item.source;
  const hasSource = !!source && source.id === item.source_request_id && source.project_id === projectId
    && source.document_id === item.document_id && source.page_number === item.page_number;
  async function save() {
    if (busy || !hasSource || !item.approved_version_id) return;
    const key = JSON.stringify([saved?.version ?? 0, item.approved_version_id, initialExpanded]);
    if (pending.current?.key !== key) pending.current = { key, operationId: crypto.randomUUID() };
    setBusy(true); setMessage("");
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`/api/projects/${projectId}/reinforcement-requests/${item.source_request_id}/card`, {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: item.document_id,
          reinforcementId: item.id, approvedVersionId: item.approved_version_id, expectedVersion: saved?.version ?? 0,
          initialExpanded, operationId: pending.current.operationId }),
      });
      const body = await response.json();
      const result = cardRecordSchema.safeParse(body.card);
      if (!response.ok || !result.success) { setMessage(typeof body.message === "string" ? body.message : "No se pudo confirmar la tarjeta. Reintenta."); return; }
      setSaved(result.data); pending.current = null;
      setMessage("Tarjeta guardada. Al reabrir el proyecto se usará el estado inicial elegido.");
    } catch { setMessage("No se pudo confirmar la tarjeta. Reintenta sin cambiar los datos."); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  function collapse() { setExpanded(false); trigger.current?.focus(); }
  return <article data-page-number={item.page_number} data-reinforcement-id={item.id} className="rounded-lg border border-slate-200 bg-white p-5">
    <p className="text-sm font-medium text-blue-700">Página {item.page_number} · Tarjeta desplegable</p>
    <h3 className="mt-2">
      <button ref={trigger} type="button" aria-expanded={expanded} aria-controls={`${id}-content`}
        onClick={() => setExpanded(value => !value)}
        className="flex w-full items-start justify-between gap-3 rounded-lg py-2 text-left font-semibold break-words text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
        <span className="min-w-0">{item.title}</span><span aria-hidden="true" className="shrink-0">{expanded ? "−" : "+"}</span>
      </button>
    </h3>
    <p className="text-xs text-slate-500">{expanded ? "Contenido expandido" : "Pulsa el título para expandir el contenido"}</p>
    <div id={`${id}-content`} hidden={!expanded}>
      {item.content.generatedByAI === true && <p className="mt-2 text-sm font-medium text-green-900">
        Contenido generado por IA · Aprobado por ti{item.content.editedByOwner === true ? " · Editado por ti" : ""}
      </p>}
      {item.content.type === "visual" && <div className="mt-3"><VisualResource value={item.content.visual} title={item.title}
        description={typeof item.content.text === "string" ? item.content.text : undefined} /></div>}
      {item.content.type === "summary" && <div className="mt-3"><SummaryResource value={item.content.summary} /></div>}
      {item.content.type !== "visual" && item.content.type !== "summary" && typeof item.content.text === "string" &&
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{item.content.text}</p>}
      {hasSource && <button type="button" onClick={() => onSource(item)} className="mt-4 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800">
        Ver {source.selection?.kind === "area" ? "zona" : source.selection?.kind === "text" ? "selección de texto" : "página"} original · Página {item.page_number}
      </button>}
      {canManage && hasSource && item.approved_version_id && <fieldset disabled={busy} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
        <legend className="text-sm font-semibold">Presentación de esta tarjeta</legend>
        <p className="text-sm text-slate-600">El título y el contenido corresponden a la versión aprobada. Para modificarlos, revisa la solicitud de origen.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={initialExpanded} onChange={event => setInitialExpanded(event.target.checked)} className="mt-1" />
          Abrir expandida al entrar al proyecto</label>
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Guardando tarjeta…" : "Guardar tarjeta"}</button>
        {saved && <p className="text-xs text-slate-600">Presentación guardada · Versión {saved.version} · Inicio {saved.initial_expanded ? "expandido" : "contraído"}</p>}
      </fieldset>}
      <button type="button" onClick={collapse} className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Contraer tarjeta</button>
    </div>
    {message && <p role="status" className="mt-3 break-words text-sm text-slate-800">{message}</p>}
  </article>;
}
