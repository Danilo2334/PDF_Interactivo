"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { OwnerReviewPanel, type ReviewAction } from "@/components/documents/owner-review-panel";
import { VisualResource } from "@/components/documents/visual-resource";
import { VISUAL_MODES, VISUAL_LABELS, VISUAL_MESSAGES, visualViewSchema, visualRecordSchema, type VisualMode } from "@/lib/validations/visual";
import { reviewHeadSchema } from "@/lib/validations/example";
import type { RequestRecord } from "@/lib/validations/request-list";
const parseView = (body: unknown) => visualViewSchema.parse(body);
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";
export function VisualPanel({ request, active, onChanged }: { request: RequestRecord; active: boolean; onChanged: () => void }) {
  const name = useId(), router = useRouter(), base = `/api/projects/${request.project_id}/reinforcement-requests/${request.id}`;
  const [mode, setMode] = useState<VisualMode | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null), operationRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const resource = useRequestResource(`${base}/visual?documentId=${request.document_id}`, active && !busy, parseView, true);
  const view = resource.result?.value, generation = view?.generation, selected = mode ?? generation?.mode ?? null;
  const saved = !!generation && selected === generation.mode && generation.choice_version === view?.choiceVersion;
  const current = view?.versions.find(v => v.version === view.review?.current_version);
  useEffect(() => () => { controllerRef.current?.abort(); }, [base, active]);
  async function execute(action: "configure" | "generate" | ReviewAction) {
    if (!view || !active || controllerRef.current) return null;
    const review = typeof action === "object";
    const input = { documentId: request.document_id, ...(review ? action : { action, expectedVersion: generation?.version ?? 0, choiceVersion: view.choiceVersion,
      ...(action === "configure" ? { mode: selected } : {}) }) };
    const fingerprint = JSON.stringify(input);
    if (operationRef.current?.fingerprint !== fingerprint) operationRef.current = { fingerprint, id: crypto.randomUUID() };
    const controller = new AbortController(); controllerRef.current = controller; setBusy(true); setError(""); let success = false, reviewedVersion: number | null = null;
    try {
      const response = await fetch(`${base}/${review ? "review" : "visual"}`, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, ...(review ? { operationId: operationRef.current.id } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.message === "string" ? body.message : "No fue posible completar la operación.");
      if (review) reviewedVersion = reviewHeadSchema.parse(body.review).current_version; else visualRecordSchema.parse(body.generation);
      success = true; if (action === "configure") setMode(null);
      if (review && action.action === "approve") router.refresh();
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No fue posible completar la operación."); }
    finally { if (controllerRef.current === controller) { controllerRef.current = null; setBusy(false); if (success) { resource.refresh(); onChanged(); } } }
    return success ? reviewedVersion : null;
  }
  return <section aria-label="Imagen o diagrama" className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h4 className="font-semibold text-slate-900">Imagen o diagrama</h4>
    <p className="text-sm text-slate-700">Elige el tipo de representación y revisa su descripción antes de generar. Solo tu aprobación lo mostrará en Refuerzos.</p>
    {!view && !resource.result?.error && <p role="status">Consultando recurso visual…</p>}
    {view && !view.visualChosen && <p className="text-sm">Guarda primero la opción Imagen en las recomendaciones.</p>}
    {view?.visualChosen && !view.review && <>
      <form onSubmit={event => { event.preventDefault(); void execute("configure"); }}><fieldset disabled={!active || busy || !view.canConfigure} className="space-y-2">
        <legend className="mb-2 font-medium">Tipo de recurso visual</legend>
        {VISUAL_MODES.map(value => <label key={value} className="block rounded-lg border border-slate-200 p-3 text-sm">
          <span className="flex gap-2"><input type="radio" name={name} checked={selected === value} onChange={() => setMode(value)} /><span className="font-semibold">{VISUAL_LABELS[value]}</span></span>
          <span className="mt-1 block">{value === "image" ? "Una ilustración con elementos visuales del concepto." : "Conceptos conectados mediante relaciones y flechas."}</span></label>)}
        <button type="submit" className={buttonClass} disabled={!selected || saved}>Guardar tipo visual</button>
      </fieldset></form>
      <button type="button" className={buttonClass} disabled={!active || busy || !view.canGenerate || !saved} onClick={() => void execute("generate")}>{generation?.status === "error" || generation?.status === "processing" ? "Reintentar recurso visual" : "Generar recurso visual"}</button>
    </>}
    {generation && <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">Tipo guardado: {VISUAL_LABELS[generation.mode]}</p><p>Descripción visual solicitada</p><p className="whitespace-pre-wrap break-words">{generation.visual_brief}</p></div>}
    {view?.visualChosen && !view.providerAvailable && <p className="text-sm">Gemini no está configurado. Puedes guardar el tipo sin consumir IA.</p>}
    <button type="button" className={buttonClass} disabled={!active || busy} onClick={() => { setError(""); resource.refresh(); onChanged(); }}>Actualizar recurso visual</button>
    {busy && <p role="status" className="text-sm">Guardando o generando el recurso visual…</p>}
    {!busy && generation?.status === "processing" && <p role="status" className="text-sm">Generación en proceso. El resultado anterior se conserva; actualiza para consultar el nuevo.</p>}
    {(error || resource.result?.error) && <p role="alert" className="break-words text-sm text-red-700">{error || resource.result?.error}</p>}
    {generation?.status === "error" && <p role="alert" className="text-sm text-red-700">{VISUAL_MESSAGES[generation.error_code ?? "invalid_visual"]}</p>}
    {current?.visual_content && view?.review?.decision !== "discarded" && <article className="min-w-0 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-semibold">Contenido generado por IA · {view?.review?.decision === "approved" ? "Aprobado por ti" : "Pendiente de aprobación"}</p>
      <p>Página {request.page_number} · {VISUAL_LABELS[current.visual_content.scene.kind]} · Versión {current.version}</p>
      <h5 className="font-semibold">{current.title}</h5><VisualResource value={current.visual_content} title={current.title} description={current.text} />
      <p><strong>Selección de origen: </strong>{request.selected_text}</p><p><strong>Cita: </strong>{current.visual_content.sourceQuote}</p>
      <p>Este recurso es una representación adicional; el PDF original permanece intacto.</p>
    </article>}
    {view?.visualChosen && view.review && <OwnerReviewPanel visual view={view} disabled={!active || busy || generation?.status !== "ready"} onReview={value => execute(value)} />}

  </section>;
}
