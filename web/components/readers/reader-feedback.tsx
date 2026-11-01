"use client";
import { useEffect, useId, useRef, useState } from "react";
import { readerFeedbackStatusSchema, normalizeFeedbackComment, type ReaderFeedbackReceipt } from "@/lib/validations/reader-feedback";

export function ReaderFeedback({ endpoint, itemId, pageNumber, active }: { endpoint: string; itemId: string; pageNumber: number; active: boolean }) {
  const id = useId(), [rating, setRating] = useState<"useful" | "unclear" | "">(""), [comment, setComment] = useState("");
  const [receipt, setReceipt] = useState<ReaderFeedbackReceipt | null>(null), [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const operation = useRef<{ key: string; id: string } | null>(null), inFlight = useRef(false), confirmation = useRef<HTMLParagraphElement>(null);
  const url = `${endpoint}/reinforcements/${itemId}/feedback`;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void (async () => { try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      const body = await response.json(); if (!response.ok) throw Error(body.message ?? "No fue posible consultar tu opinión.");
      const parsed = readerFeedbackStatusSchema.parse(body);
      if (parsed.receipt && parsed.receipt.pageNumber !== pageNumber) throw Error("La opinión no corresponde a esta página.");
      if (!controller.signal.aborted) { setReceipt(parsed.receipt); setEnabled(parsed.enabled); setReady(true); setError(""); }
    } catch (e) { if (!controller.signal.aborted) { setReady(false); setReceipt(null); setError(e instanceof Error ? e.message : "No fue posible consultar tu opinión."); } } })();
    return () => controller.abort();
  }, [active, url, pageNumber, refresh]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!rating || !ready || !enabled || inFlight.current || receipt) return;
    const cleanComment = normalizeFeedbackComment(comment), key = JSON.stringify({ pageNumber, rating, comment: cleanComment });
    if (!operation.current || operation.current.key !== key) operation.current = { key, id: crypto.randomUUID() };
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ operationId: operation.current.id, pageNumber, rating, comment: cleanComment }) });
      const body = await response.json(); if (!response.ok) throw Error(body.message ?? "No se pudo confirmar la opinión. Consulta si quedó guardada o reintenta.");
      const parsed = readerFeedbackStatusSchema.parse(body);
      if (!parsed.enabled || !parsed.receipt || parsed.receipt.pageNumber !== pageNumber) throw Error("No se pudo confirmar la opinión guardada.");
      setReceipt(parsed.receipt); setRating(""); setComment("");
      requestAnimationFrame(() => confirmation.current?.focus({ preventScroll: true }));
    } catch (e) { setError(e instanceof Error && e.name === "TimeoutError" ? "No llegó la confirmación. Consulta si quedó guardada o reintenta sin cambiar el envío." : e instanceof TypeError ? "No fue posible conectar. Consulta si quedó guardada o reintenta sin cambiar el envío." : e instanceof Error ? e.message : "No fue posible enviar la opinión."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-lg border border-blue-200 p-3">
    <h4 id={`${id}-title`} className="font-semibold">¿Este refuerzo te ayudó?</h4>
    {!ready && !error && <p role="status" className="text-sm">Consultando tu opinión guardada…</p>}
    {ready && !enabled && <p className="text-sm">La vista del propietario no registra opiniones de lectores.</p>}
    {receipt ? <div className="space-y-2 text-sm">
      <p ref={confirmation} tabIndex={-1} role="status" className="font-semibold text-green-800">Opinión guardada: {receipt.rating === "useful" ? "Útil" : "Sigue sin ser claro"}.</p>
      {receipt.comment && <p className="whitespace-pre-wrap break-words">{receipt.comment}</p>}
      <p>Esta sesión ya envió su opinión para este refuerzo y versión publicada.</p>
    </div> : ready && enabled && <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Elige una valoración</legend>
        {([["useful", "Útil"], ["unclear", "Sigue sin ser claro"]] as const).map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="radio" name={`${id}-rating`} value={value} checked={rating === value} onChange={() => setRating(value)} />{label}</label>)}
        <label htmlFor={`${id}-comment`} className="block text-sm">Comentario opcional (máximo 1000 caracteres)</label>
        <textarea id={`${id}-comment`} value={comment} maxLength={1000} rows={3} onChange={e => setComment(e.target.value)} className="w-full min-w-0 rounded-lg border p-2 text-sm" />
      </fieldset>
      <button type="submit" disabled={busy || !rating} className="min-h-11 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Guardando opinión…" : "Enviar opinión"}</button>
    </form>}
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={() => { setReady(false); setError(""); setRefresh(n => n + 1); }} className="min-h-11 rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Consultar opinión guardada</button>
  </section>;
}
