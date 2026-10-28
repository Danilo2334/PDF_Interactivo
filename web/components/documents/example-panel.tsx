"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { OwnerReviewPanel, type ReviewAction } from "@/components/documents/owner-review-panel";
import { EXAMPLE_MODES, EXAMPLE_LABELS, EXAMPLE_DESCRIPTIONS, EXAMPLE_MESSAGES, exampleViewSchema, exampleRecordSchema, exampleContentSchema, reviewHeadSchema, type ExampleMode } from "@/lib/validations/example";
import type { RequestRecord } from "@/lib/validations/request-list";
const parseView = (body: unknown) => exampleViewSchema.parse(body);
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50";
export function ExamplePanel({ request, active, onChanged }: { request: RequestRecord; active: boolean; onChanged: () => void }) {
  const name = useId(), router = useRouter(), base = `/api/projects/${request.project_id}/reinforcement-requests/${request.id}`;
  const [mode, setMode] = useState<ExampleMode | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null), operationRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const resource = useRequestResource(`${base}/example?documentId=${request.document_id}`, active && !busy, parseView, true);
  const view = resource.result?.value, generation = view?.generation, selected = mode ?? generation?.mode ?? null;
  const saved = !!generation && selected === generation.mode && generation.choice_version === view?.choiceVersion;
  const current = view?.versions.find(v => v.version === view.review?.current_version);
  const snapshot=exampleContentSchema.safeParse(current?.generated_content);
  const sourceContent=snapshot.success?snapshot.data:generation?.content;
  useEffect(() => () => { controllerRef.current?.abort(); }, [base, active]);
  async function execute(action: "configure" | "generate" | ReviewAction) {
    if (!view || !active || controllerRef.current) return null;
    const review = typeof action === "object";
    const input = { documentId: request.document_id, ...(review ? action : { action, expectedVersion: generation?.version ?? 0, choiceVersion: view.choiceVersion, ...(action === "configure" ? { mode: selected } : {}) }) };
    const fingerprint = JSON.stringify(input);
    if (operationRef.current?.fingerprint !== fingerprint) operationRef.current = { fingerprint, id: crypto.randomUUID() };
    const controller = new AbortController(); controllerRef.current = controller; setBusy(true); setError(""); let success = false, reviewedVersion: number | null = null;
    try {
      const response = await fetch(`${base}/${review ? "review" : "example"}`, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, ...(review ? { operationId: operationRef.current.id } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.message === "string" ? body.message : "No fue posible completar la operación.");
      if (review) reviewedVersion = reviewHeadSchema.parse(body.review).current_version; else exampleRecordSchema.parse(body.generation);
      success = true;
      if (action === "configure") setMode(null);
      if (review && action.action === "approve") router.refresh();
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No fue posible completar la operación."); }
    finally { if (controllerRef.current === controller) { controllerRef.current = null; setBusy(false); if (success) { resource.refresh(); onChanged(); } } }
    return success ? reviewedVersion : null;
  }
  return <section aria-label="Ejemplo o analogía" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h4 className="font-semibold text-slate-900">Ejemplo o analogía</h4>
    <p className="text-sm text-slate-700">Elige una modalidad y guárdala antes de generar. Revisa el resultado: solo tu aprobación permite mostrarlo en Refuerzos.</p>
    {!view && !resource.result?.error && <p role="status">Consultando ejemplo…</p>}
    {view && !view.exampleChosen && <p className="text-sm">Guarda primero la opción Ejemplo en las recomendaciones.</p>}
    {view?.exampleChosen && generation?.status !== "ready" && <>
      <form onSubmit={event => { event.preventDefault(); void execute("configure"); }}><fieldset disabled={!active || busy || !view.canConfigure} className="space-y-2">
        <legend className="mb-2 font-medium">Modalidad del ejemplo</legend>
        {EXAMPLE_MODES.map(value => <label key={value} className="block rounded-lg border border-slate-200 p-3 text-sm">
          <span className="flex gap-2"><input type="radio" name={name} checked={selected === value} onChange={() => setMode(value)} /><span className="font-semibold">{EXAMPLE_LABELS[value]}</span></span>
          <span className="mt-1 block">{EXAMPLE_DESCRIPTIONS[value]}</span></label>)}
        <button type="submit" className={buttonClass} disabled={!selected || saved}>Guardar modalidad</button>
      </fieldset></form>
      {saved && <p role="status" className="text-sm text-green-900">Modalidad guardada: {EXAMPLE_LABELS[generation!.mode]}</p>}
      {!view.providerAvailable && <p className="text-sm">Gemini no está configurado. Puedes guardar la modalidad sin consumir IA.</p>}
      <button type="button" className={buttonClass} disabled={!active || busy || !view.canGenerate || !saved} onClick={() => void execute("generate")}>{generation?.status === "error" || generation?.status === "processing" ? "Reintentar ejemplo" : "Generar ejemplo o analogía"}</button>
    </>}
    <button type="button" className={buttonClass} disabled={!active || busy} onClick={() => { setError(""); resource.refresh(); onChanged(); }}>Actualizar ejemplo</button>
    {busy && <p role="status" className="text-sm">Guardando o generando el resultado… Puedes seguir consultando el PDF.</p>}
    {!busy && generation?.status === "processing" && <p role="status" className="text-sm">{view?.canGenerate ? "El intento anterior agotó su tiempo. Puedes reintentarlo." : "El ejemplo está en proceso. Actualiza para consultar el resultado."}</p>}
    {(error || resource.result?.error) && <p role="alert" className="break-words text-sm text-red-700">{error || resource.result?.error}</p>}
    {generation?.status === "error" && <p role="alert" className="text-sm text-red-700">{EXAMPLE_MESSAGES[generation.error_code ?? "invalid_example"]}</p>}
    {generation?.status === "ready" && generation.content && current && view?.review?.decision !== "discarded" && <article className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold">Contenido generado por IA{current.origin === "owner" ? " · Editado por ti" : ""} · {view?.review?.decision === "approved" ? "Aprobado por ti" : "Pendiente de aprobación"}</p>
      <p>Página {request.page_number} · {EXAMPLE_LABELS[generation.mode]} · Versión {current.version}</p>
      <blockquote className="whitespace-pre-wrap break-words">{request.selected_text}</blockquote><h5 className="font-semibold">{current.title}</h5>
      <p className="whitespace-pre-wrap break-words">{current.text}</p><p><strong>Relación con el concepto: </strong>{sourceContent?.relation}</p>
      <p><strong>Límites y supuestos: </strong>{sourceContent?.limitations}</p><p><strong>Cita del fragmento: </strong>{sourceContent?.sourceQuote}</p>
      <p>El PDF original permanece intacto. Las ediciones son responsabilidad del propietario y necesitan aprobación.</p>
    </article>}
    {view?.exampleChosen && generation?.status === "ready" && view.review && <OwnerReviewPanel view={view} disabled={!active || busy} onReview={value => execute(value)} />}
  </section>;
}
