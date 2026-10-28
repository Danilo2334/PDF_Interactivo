"use client";

import { useId, useState } from "react";
import type { ExampleView } from "@/lib/validations/example";
export type ReviewAction = { action: "edit"; title: string; text: string; expectedVersion: number } | { action: "approve"; confirmed: true; expectedVersion: number } | { action: "discard"; expectedVersion: number };
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";

export function OwnerReviewPanel({ view, disabled, onReview, visual = false, explanation = false }: { view: Pick<ExampleView, "review" | "versions" | "events">; disabled: boolean; onReview: (action: ReviewAction) => Promise<number | null>; visual?: boolean; explanation?: boolean }) {
  const current = view.versions.find(v => v.version === view.review?.current_version);
  const [draft, setDraft] = useState(() => current ? { version: current.version, title: current.title, text: current.text } : null);
  const [confirmed, setConfirmed] = useState(false), [discardVersion, setDiscardVersion] = useState<number | null>(null);
  const titleId = useId(), textId = useId();
  if (!current || !view.review) return null;
  const outdated = !!draft && draft.version !== current.version;
  const changed = !!draft && (draft.title !== current.title || draft.text !== current.text);
  const discarded = view.review.decision === "discarded";
  return <section aria-label="Revisión del propietario" className="space-y-3 rounded-lg border border-slate-300 p-3 text-sm">
    <h5 className="font-semibold">Tu revisión</h5>
    {discarded ? <p role="status">Borrador descartado. El PDF permanece intacto.{view.review.approved_version_id ? " La versión aprobada anterior se conserva en Refuerzos." : " No se publicó contenido."}</p> : <>
      <p>Versión {current.version} · {current.origin === "ai" ? "Generada por IA" : "Editada por ti"} · {view.review.decision === "approved" ? "Aprobada por ti" : "Pendiente de aprobación"}</p>
      {view.review.approved_at && <p>Última aprobación: {new Date(view.review.approved_at).toLocaleString("es-CO")}. Una edición nueva necesita su propia aprobación.</p>}
      {outdated && <div role="alert" className="rounded-lg bg-amber-50 p-3">
        <p>Hay una versión más reciente. Tus cambios siguen en estos campos; cópialos si los necesitas antes de cargar la versión actual.</p>
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => { setDraft({ version: current.version, title: current.title, text: current.text }); setConfirmed(false); setDiscardVersion(null); }}>Cargar versión actual</button>
      </div>}
      {draft && <form onSubmit={event => { event.preventDefault(); if (!disabled && !outdated && changed) {
        void onReview({ action: "edit", expectedVersion: draft.version, title: draft.title, text: draft.text }).then(version => {
          if (version !== null) { setDraft({ version, title: draft.title.trim(), text: draft.text.trim() }); setConfirmed(false); }
        });
      } }} className="space-y-2">
        <label htmlFor={titleId} className="block font-medium">{visual ? "Título del recurso" : explanation ? "Título de la explicación" : "Título del ejemplo"}</label>
        <input id={titleId} value={draft.title} maxLength={160} minLength={3} required disabled={disabled} className="w-full rounded-lg border border-slate-300 p-2"
          onChange={event => { setDraft({ ...draft, title: event.target.value }); setConfirmed(false); }} />
        <label htmlFor={textId} className="block font-medium">{visual ? "Descripción accesible" : explanation ? "Texto de la explicación" : "Texto del ejemplo"}</label>
        <textarea id={textId} rows={7} value={draft.text} maxLength={6000} minLength={80} required disabled={disabled} className="w-full rounded-lg border border-slate-300 p-2"
          onChange={event => { setDraft({ ...draft, text: event.target.value }); setConfirmed(false); }} />
        <p>Guardar crea una versión pendiente y conserva las anteriores. El texto debe tener entre 80 y 6000 caracteres.</p>
        <button type="submit" className={buttonClass} disabled={disabled || outdated || !changed}>Guardar nueva versión</button>
      </form>}
      {view.review.decision === "pending" && <div className="space-y-2">
        <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={disabled || outdated || changed}
          onChange={event => setConfirmed(event.target.checked)} /><span>He revisado esta versión y confirmo que es coherente con el PDF.</span></label>
        <button type="button" className={buttonClass} disabled={disabled || outdated || changed || !confirmed} onClick={() => onReview({ action: "approve", expectedVersion: current.version, confirmed: true })}>Aprobar esta versión</button>
        <button type="button" className={buttonClass} disabled={disabled || outdated} onClick={() => setDiscardVersion(current.version)}>Descartar borrador</button>
        {discardVersion === current.version && !outdated && <div className="space-y-2 rounded-lg bg-amber-50 p-3"><p>Se descartará este borrador sin modificar el PDF ni una versión aprobada anterior.</p>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => onReview({ action: "discard", expectedVersion: discardVersion }).then(version => { if (version !== null) setDiscardVersion(null); })}>Confirmar descarte</button>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => setDiscardVersion(null)}>Conservar borrador</button></div>}
      </div>}
    </>}
    <details><summary className="cursor-pointer font-medium">Versiones y decisiones anteriores</summary>
      <ul className="mt-2 space-y-2">{view.versions.map(v => <li key={v.id}>Versión {v.version} · {v.origin === "ai" ? "IA" : "Propietario"} · {new Date(v.created_at).toLocaleString("es-CO")}
        <details><summary className="cursor-pointer">Consultar texto de versión {v.version}</summary><p className="whitespace-pre-wrap break-words">{v.text}</p></details></li>)}</ul>
      <ul className="mt-3 space-y-1">{view.events.map(e => <li key={e.operation_id}>{e.action === "edit" ? "Edición" : e.action === "approve" ? "Aprobación" : e.action === "regenerate" ? "Nueva generación" : "Descarte"} por ti · Versión {e.version} · {new Date(e.occurred_at).toLocaleString("es-CO")}</li>)}</ul>
      <p className="mt-2 text-slate-600">Se muestran las 20 versiones y decisiones más recientes.</p>
    </details>
  </section>;
}
