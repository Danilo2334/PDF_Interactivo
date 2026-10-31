"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { DETAIL_LEVELS, DETAIL_LABELS, DETAIL_DESCRIPTIONS, EXPLANATION_MESSAGES,
  explanationViewSchema, explanationRecordSchema, type DetailLevel } from "@/lib/validations/explanation";
import type { RequestRecord } from "@/lib/validations/request-list";

const parseView = (body: unknown) => explanationViewSchema.parse(body);
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

export function ExplanationPanel({ request, active, onChanged }: { request: RequestRecord; active: boolean; onChanged: () => void }) {
  const name = useId(), endpoint = `/api/projects/${request.project_id}/reinforcement-requests/${request.id}/explanation`;
  const [draft, setDraft] = useState<DetailLevel | null>(null), [busy, setBusy] = useState<"configure" | "generate" | null>(null), [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const resource = useRequestResource(`${endpoint}?documentId=${request.document_id}`, active && !busy, parseView);
  const view = resource.result?.value, generation = view?.generation;
  const selected = draft ?? generation?.detail_level ?? null;
  const levelSaved = !!generation && selected === generation.detail_level && generation.choice_version === view?.choiceVersion;
  useEffect(() => () => { controllerRef.current?.abort(); }, [endpoint, active]);

  async function execute(action: "configure" | "generate") {
    if (!view || !active || controllerRef.current || action === "configure" && !selected) return;
    const controller = new AbortController(); controllerRef.current = controller; setBusy(action); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: request.document_id, action,
          expectedVersion: generation?.version ?? 0, choiceVersion: view.choiceVersion, ...(action === "configure" ? { level: selected } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.message === "string" ? body.message : "No fue posible completar la explicación.");
      explanationRecordSchema.parse(body.generation);
      if (!controller.signal.aborted && action === "configure") setDraft(null);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No fue posible completar la operación.");
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setBusy(null); resource.refresh(); onChanged(); }
    }
  }

  return <section aria-label="Explicación ampliada" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h4 className="font-semibold text-slate-900">Explicación ampliada</h4>
    <p className="text-sm text-slate-700">Elige y guarda el nivel de detalle antes de generar. El resultado quedará pendiente de aprobación y conservará la referencia al fragmento.</p>
    {!view && !resource.result?.error && !busy && <p role="status" className="text-sm">Consultando explicación…</p>}
    {view && !view.explanationChosen && <p className="text-sm text-slate-700">Guarda primero la opción Explicación en las recomendaciones para usar este formato.</p>}
    {view?.explanationChosen && generation?.status !== "ready" && <>
      <form onSubmit={event => { event.preventDefault(); void execute("configure"); }}>
        <fieldset disabled={!active || !!busy || !view.canConfigure || !!resource.result?.error} className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-slate-800">Nivel de detalle</legend>
          {DETAIL_LEVELS.map(level => <label key={level} className="block rounded-lg border border-slate-200 p-3 text-sm text-slate-800">
            <span className="flex items-center gap-2"><input type="radio" name={name} value={level} checked={selected === level} onChange={() => setDraft(level)} />
              <span className="font-semibold">{DETAIL_LABELS[level]}</span></span>
            <span className="mt-1 block">{DETAIL_DESCRIPTIONS[level]}</span>
          </label>)}
          <button className={buttonClass} type="submit" disabled={!selected || levelSaved}>Guardar nivel de detalle</button>
        </fieldset>
      </form>
      {levelSaved && <p role="status" className="text-sm text-green-900">Nivel guardado: {DETAIL_LABELS[generation!.detail_level]}</p>}
      {!view.providerAvailable && <p className="text-sm text-slate-700">El servicio de IA no está configurado. Puedes guardar el nivel sin consumir IA.</p>}
      <button type="button" className={buttonClass} disabled={!active || !!busy || !view.canGenerate || !levelSaved || !!resource.result?.error} onClick={() => void execute("generate")}>
        {generation?.status === "error" || generation?.status === "processing" ? "Reintentar explicación" : "Generar explicación"}
      </button>
    </>}
    <button type="button" className={buttonClass} disabled={!active || !!busy} onClick={() => { setDraft(null); setError(""); resource.refresh(); onChanged(); }}>Actualizar explicación</button>
    {busy && <p role="status" className="text-sm">{busy === "configure" ? "Guardando nivel…" : "Generando explicación. Puedes seguir consultando el PDF…"}</p>}
    {!busy && generation?.status === "processing" && <p role="status" className="text-sm">{view?.canGenerate ? "El intento anterior agotó su tiempo. Puedes reintentarlo." : "La explicación está en proceso. Actualiza para consultar el resultado."}</p>}
    {(error || resource.result?.error) && <p role="alert" className="break-words text-sm text-red-700">{error || resource.result?.error}</p>}
    {generation?.status === "error" && <p role="alert" className="text-sm text-red-700">{EXPLANATION_MESSAGES[generation.error_code ?? "invalid_explanation"]}</p>}
    {generation?.status === "ready" && generation.content && <article className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-slate-900">
      <p className="font-semibold">Borrador inicial generado por IA</p>
      <p>Página {request.page_number} · Nivel: {DETAIL_LABELS[generation.detail_level]}</p>
      <p className="font-medium">Fragmento original</p>
      <blockquote className="whitespace-pre-wrap break-words border-l-2 border-amber-500 pl-3">{request.selected_text}</blockquote>
      <h5 className="break-words text-base font-semibold">{generation.content.title}</h5>
      <p className="whitespace-pre-wrap break-words">{generation.content.text}</p>
      <p className="break-words"><strong>Cita del fragmento: </strong>{generation.content.sourceQuote}</p>
      <p className="text-slate-700">La generación inicial no publica contenido ni modifica el PDF. Usa «Revisar explicación generada» para editarla y decidir si la apruebas. Consulta la versión actual en Tu revisión.</p>
    </article>}
  </section>;
}
