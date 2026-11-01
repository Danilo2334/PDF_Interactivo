"use client";
import { useEffect, useState } from "react";
import { visitTotalsSchema } from "@/lib/validations/reader-visits";
type Totals = ReturnType<typeof visitTotalsSchema.parse>;
export function VisitTotalsPanel({ projectId, documentId }: { projectId: string; documentId: string }) {
  const [totals, setTotals] = useState<Totals | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setBusy(true); setError("");
      try {
        const response = await fetch(`/api/projects/${projectId}/visits?documentId=${documentId}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        const body = await response.json(), parsed = visitTotalsSchema.safeParse(body);
        if (!response.ok || !parsed.success) throw Error("No fue posible consultar las visitas. Reintenta.");
        if (!controller.signal.aborted) setTotals(parsed.data);
      } catch { if (!controller.signal.aborted) setError("No fue posible consultar las visitas. Reintenta."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load(); return () => controller.abort();
  }, [projectId, documentId, attempt]);
  return <section aria-label="Visitas del documento" aria-busy={busy} className="my-5 min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="text-lg font-semibold">Visitas del documento</h2>
    {totals && <><p className="text-2xl font-semibold">{totals.total} {totals.total === 1 ? "visita" : "visitas"}</p>
      {totals.total === 0 ? <p>Este documento todavía no tiene visitas de lectores.</p>
        : totals.lastVisitedAt && <p className="text-sm">Última apertura registrada: {new Date(totals.lastVisitedAt).toLocaleString("es")}.</p>}</>}
    <p className="text-sm text-slate-600">Las aperturas repetidas de una sesión durante 30 minutos cuentan una sola vez. Tus pruebas y las vistas previas no aumentan el total.</p>
    <button type="button" disabled={busy} onClick={() => setAttempt(n => n + 1)} className="rounded-lg border border-slate-300 px-3 py-2">Actualizar visitas</button>
    {busy && <p role="status">Consultando visitas…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
