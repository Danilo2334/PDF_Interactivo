"use client";
import { useEffect, useState } from "react";
import { reinforcementUsageSchema } from "@/lib/validations/reinforcement-opens";
type Usage = ReturnType<typeof reinforcementUsageSchema.parse>;
export function ReinforcementUsagePanel({ projectId, documentId }: { projectId: string; documentId: string }) {
  const [open, setOpen] = useState(false), [usage, setUsage] = useState<Usage | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load() {
      setBusy(true); setError(""); setUsage(null);
      let message = "No fue posible consultar el uso de refuerzos. Reintenta.";
      try {
        const response = await fetch(`/api/projects/${projectId}/reinforcement-usage?documentId=${documentId}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (response.status === 401) message = "Debes iniciar sesión nuevamente para consultar el uso.";
        else if (response.status === 403) message = "Ya no tienes permiso para consultar estas métricas.";
        else if (response.status === 409) message = "El documento cambió. Actualiza el proyecto.";
        const parsed = reinforcementUsageSchema.safeParse(await response.json());
        if (!response.ok || !parsed.success) throw Error(message);
        if (!controller.signal.aborted) setUsage(parsed.data);
      } catch { if (!controller.signal.aborted) setError(message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load(); return () => controller.abort();
  }, [open, projectId, documentId, attempt]);
  const pages = usage ? [...new Set(usage.rows.map(row => row.pageNumber))] : [];
  return <section aria-label="Uso de refuerzos" className="my-5 min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="text-lg font-semibold"><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="rounded py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-700">Uso de refuerzos {open ? "−" : "+"}</button></h2>
    {open && <div className="space-y-3" aria-busy={busy}>
      <p className="text-sm">Todo el historial del documento. Cada reapertura cuenta en la frecuencia; cada visita cuenta una sola vez en el porcentaje de cada refuerzo. Se excluyen tus pruebas y las vistas previas.</p>
      {usage && <><p>{usage.totalVisits} visitas válidas · Consultado: {new Date(usage.through).toLocaleString("es")}</p>
        {usage.totalVisits === 0 && <p>Sin visitas válidas todavía. Los porcentajes se muestran en 0%.</p>}
        {usage.rows.length === 0 && <p>Este documento todavía no tiene refuerzos publicados.</p>}
        {pages.map(page => <section key={page} aria-label={`Uso en la página ${page}`} className="space-y-2"><h3 className="font-semibold">Página {page}</h3>
          <ul className="space-y-2">{usage.rows.filter(row => row.pageNumber === page).map(row => <li key={row.id} className="min-w-0 rounded-lg border p-3">
            <p className="break-words font-medium">{row.title}</p><p className="text-sm">{row.frequency} aperturas · {row.visits} de {usage.totalVisits} visitas · {row.percentage.toLocaleString("es", { maximumFractionDigits: 2 })}%</p>
          </li>)}</ul></section>)}</>}
      <button type="button" disabled={busy} onClick={() => setAttempt(n => n + 1)} className="rounded-lg border px-3 py-2">Actualizar uso</button>
      {busy && <p role="status">Consultando uso…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>}
  </section>;
}
