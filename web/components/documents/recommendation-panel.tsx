"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { recommendationViewSchema, recommendationRecordSchema, choiceReceiptSchema, REINFORCEMENT_LABELS, RECOMMENDATION_MESSAGES,
  type RecommendationView, type ReinforcementType } from "@/lib/validations/recommendations";
import type { RequestRecord } from "@/lib/validations/request-list";

const parseView = (value: unknown) => recommendationViewSchema.parse(value);
const buttonClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
type ChoiceInput = { type: ReinforcementType; attemptId: string; expectedVersion: number };

export function RecommendationOptions({ view, disabled, onChoose }: { view: RecommendationView; disabled: boolean; onChoose: (choice: ChoiceInput) => void }) {
  const name = useId();
  const [draft, setDraft] = useState<ReinforcementType | null>(null);
  const current = view.recommendations;
  if (current?.status !== "ready") return null;
  const selected = draft ?? view.choice?.type ?? null;
  return <form onSubmit={event => { event.preventDefault(); if (selected && !disabled && view.canChoose)
    onChoose({ type: selected, attemptId: current.attempt_id, expectedVersion: view.choiceVersion }); }}>
    <fieldset disabled={disabled || !view.canChoose} className="space-y-3">
      <legend className="mb-2 text-sm font-medium text-slate-800">Elige una opción. Están ordenadas por pertinencia para el tema y tu dificultad.</legend>
      {current.options.map((option, index) => <label key={option.type} className="block cursor-pointer rounded-lg border border-slate-200 p-3 text-sm text-slate-800">
        <span className="flex items-center gap-2"><input type="radio" name={name} value={option.type} checked={selected === option.type}
          onChange={() => setDraft(option.type)} /><span className="font-semibold">{index + 1}. {REINFORCEMENT_LABELS[option.type]}</span></span>
        <span className="mt-2 block break-words">{option.justification}</span>
      </label>)}
      <button type="submit" className={buttonClass} disabled={!selected || disabled || !view.canChoose || selected === view.choice?.type}>Guardar elección</button>
    </fieldset>
  </form>;
}

export function RecommendationPanel({ request, active, onChanged }: { request: RequestRecord; active: boolean; onChanged: () => void }) {
  const endpoint = `/api/projects/${request.project_id}/reinforcement-requests/${request.id}/recommendations`;
  const [busy, setBusy] = useState<"recommend" | "choose" | null>(null);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const resource = useRequestResource(`${endpoint}?documentId=${request.document_id}`, active && !busy, parseView);
  const view = resource.result?.value, current = view?.recommendations;
  useEffect(() => () => { controllerRef.current?.abort(); }, [endpoint, active]);

  async function execute(action: "recommend" | "choose", choice?: ChoiceInput) {
    if (!active || controllerRef.current) return;
    const controller = new AbortController(); controllerRef.current = controller;
    setBusy(action); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: request.document_id, action, ...choice }) });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.message === "string" ? body.message : "No fue posible completar la operación.");
      if (controller.signal.aborted) return;
      if (action === "choose") choiceReceiptSchema.parse(body); else recommendationRecordSchema.parse(body.recommendations);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No fue posible completar la operación.");
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setBusy(null); resource.refresh(); }
    }
  }

  return <section aria-label="Recomendación del refuerzo" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h4 className="font-semibold text-slate-900">Tipo de refuerzo</h4>
    <p className="text-sm text-slate-700">Recibe opciones basadas en el análisis y elige cómo aclarar tu dificultad. Guardar la elección no genera ni aprueba contenido.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={!active || !!busy || !view?.canRecommend || !!resource.result?.error} onClick={() => void execute("recommend")}>
        {current?.status === "error" || current?.status === "processing" ? "Reintentar recomendaciones" : "Obtener recomendaciones"}
      </button>
      <button type="button" className={buttonClass} disabled={!!busy || !active} onClick={() => { resource.refresh(); onChanged(); }}>Actualizar opciones</button>
    </div>
    {!view && !resource.result?.error && !busy && <p role="status" className="text-sm">Consultando opciones…</p>}
    {view && !view.analysisReady && <p className="text-sm text-slate-700">Primero completa un análisis con contexto suficiente.</p>}
    {view?.analysisReady && !view.providerAvailable && !current && <p className="text-sm text-slate-700">El servicio de IA todavía no está disponible para obtener recomendaciones.</p>}
    {busy && <p role="status" className="text-sm">{busy === "choose" ? "Guardando tu elección…" : "Buscando opciones pertinentes…"}</p>}
    {(error || resource.result?.error) && <p role="alert" className="break-words text-sm text-red-700">{error || resource.result?.error}</p>}
    {!busy && current?.status === "processing" && <p role="status" className="text-sm">{view?.canRecommend ? "El intento anterior agotó su tiempo. Puedes reintentarlo." : "Preparando recomendaciones. Puedes seguir consultando el PDF."}</p>}
    {current?.status === "error" && <p role="alert" className="text-sm text-red-700">{RECOMMENDATION_MESSAGES[current.error_code ?? "invalid_recommendations"]}</p>}
    {current?.status === "empty" && <p role="status" className="text-sm text-slate-700">{current.empty_reason}</p>}
    {view?.choice && <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
      <p className="font-semibold">Elección guardada: {REINFORCEMENT_LABELS[view.choice.type]}</p>
      <p className="mt-1 break-words">{view.choice.justification}</p>
      <p className="mt-1">El PDF original permanece intacto.</p>
    </div>}
    {view && <RecommendationOptions key={`${current?.attempt_id}:${view.choiceVersion}`} view={view} disabled={!active || !!busy} onChoose={choice => void execute("choose", choice)} />}
  </section>;
}
