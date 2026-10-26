"use client";

import { useEffect, useRef, useState } from "react";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { analysisContextSchema, analysisRecordSchema, analysisViewSchema, ANALYSIS_MESSAGES, type AnalysisContext, type AnalysisRecord } from "@/lib/validations/contextual-analysis";
import type { RequestRecord } from "@/lib/validations/request-list";

const parseView = (value: unknown) => analysisViewSchema.parse(value);
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

export function AnalysisResult({ analysis }: { analysis: AnalysisRecord }) {
  if (analysis.status === "processing") return <p role="status">Analizando el contexto. Puedes seguir consultando el PDF.</p>;
  if (analysis.status === "error" || analysis.status === "insufficient") return <div role="alert" className="space-y-2 text-sm text-red-700">
    <p>{ANALYSIS_MESSAGES[analysis.error_code ?? "invalid_diagnosis"]}</p>
    {analysis.diagnosis?.reason && <p>{analysis.diagnosis.reason}</p>}
  </div>;
  const diagnosis = analysis.diagnosis;
  if (!diagnosis) return null;
  return <div className="space-y-3 break-words text-sm text-slate-800">
    <p className="font-semibold text-green-800">Análisis guardado</p>
    <p><strong>Tema: </strong>{diagnosis.topic}</p>
    <div><p className="font-semibold">Conceptos identificados</p><ul className="list-disc pl-5">{diagnosis.concepts.map((concept, index) => <li key={index}>{concept}</li>)}</ul></div>
    <p><strong>Alcance: </strong>{diagnosis.scope}</p>
    <div><p className="font-semibold">Fragmentos que sustentan el análisis</p>{diagnosis.quotes.map((quote, index) => <blockquote key={index} className="mt-2 border-l-2 border-blue-300 pl-3">{quote}</blockquote>)}</div>
    <p>El diagnóstico queda asociado a esta solicitud. El PDF original permanece intacto.</p>
  </div>;
}

export function ContextualAnalysisPanel({ request, active, onChanged }: {
  request: RequestRecord; active: boolean; onChanged: () => void;
}) {
  const endpoint = `/api/projects/${request.project_id}/reinforcement-requests/${request.id}/analysis`;
  const [busy, setBusy] = useState<"prepare" | "analyze" | null>(null);
  const [preview, setPreview] = useState<AnalysisContext | null>(null);
  const [error, setError] = useState("");
  const actionRef = useRef<AbortController | null>(null);
  const resource = useRequestResource(`${endpoint}?documentId=${request.document_id}`, active && !busy, parseView);
  const view = resource.result?.value;
  const context = preview ?? view?.analysis?.context;

  useEffect(() => () => { actionRef.current?.abort(); }, [endpoint, active]);

  async function execute(action: "prepare" | "analyze") {
    if (!active || actionRef.current) return;
    const controller = new AbortController(); actionRef.current = controller;
    setBusy(action); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: request.document_id, action }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.message === "string" ? body.message : "No fue posible completar la operación.");
      if (controller.signal.aborted) return;
      if (action === "prepare") setPreview(analysisContextSchema.parse(body.context));
      else { analysisRecordSchema.parse(body.analysis); }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No fue posible completar la operación.");
    } finally {
      if (actionRef.current === controller) {
        actionRef.current = null; setBusy(null);
        // A disconnected browser does not cancel the server claim. Re-read it
        // before offering a retry, including when the response was lost.
        if (action === "analyze") { resource.refresh(); onChanged(); }
      }
    }
  }

  return <section aria-label="Análisis contextual" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h4 className="font-semibold text-slate-900">Análisis contextual</h4>
    <p className="text-sm text-slate-700">Al analizar, se envían a la IA la selección, texto de esta página y tu dificultad. Puedes revisar ese contexto primero.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={!active || !!busy} onClick={() => void execute("prepare")}>Revisar contexto</button>
      <button type="button" className={buttonClass} disabled={!active || !!busy || !view?.available || !view.retryable || !!resource.result?.error} onClick={() => void execute("analyze")}>
        {view?.analysis ? "Reintentar análisis" : "Analizar selección"}
      </button>
      <button type="button" className={buttonClass} disabled={!!busy} onClick={() => { resource.refresh(); onChanged(); }}>Actualizar análisis</button>
    </div>
    {!view && !resource.result?.error && !busy && <p role="status" className="text-sm">Consultando disponibilidad…</p>}
    {view && !view.available && <p role="status" className="text-sm text-slate-700">El servicio de análisis todavía no está disponible. Puedes revisar el contexto mientras se habilita.</p>}
    {busy && <p role="status" className="text-sm">{busy === "prepare" ? "Leyendo el contexto de la página…" : "Analizando la selección…"}</p>}
    {(error || resource.result?.error) && <p role="alert" className="break-words text-sm text-red-700">{error || resource.result?.error}</p>}
    {context && <details className="text-sm text-slate-800" open>
      <summary className="cursor-pointer font-medium">Contexto de la página {context.pageNumber}</summary>
      {context.textSource === "manual" && <p className="mt-2">La selección es una transcripción confirmada por ti.</p>}
      <p className="mt-2 font-semibold">Selección</p><blockquote className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{context.selectedText}</blockquote>
      <p className="mt-2 font-semibold">Texto cercano de la misma página</p><p className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{context.nearbyText || "No se encontró texto digital cercano."}</p>
      {context.nearbySource === "page" && <p>No se localizó la selección en el texto digital; se usa texto de su página como referencia.</p>}
      {context.truncated && <p>Se utiliza una parte del texto para mantener el contexto acotado.</p>}
      {!context.enough && <p className="mt-2 text-red-700">{ANALYSIS_MESSAGES.insufficient_context}</p>}
    </details>}
    {view?.analysis && <AnalysisResult analysis={view.analysis} />}
    {view?.analysis?.status === "processing" && view.retryable && <p className="text-sm text-slate-700">El intento anterior agotó su tiempo de espera. Puedes reintentarlo.</p>}
  </section>;
}
