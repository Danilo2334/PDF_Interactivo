"use client";
import { useId, useRef, useState } from "react";
import { publicationReceiptSchema, publicationStatusSchema, type PublicationReceipt } from "@/lib/validations/publication";
export function PublicationPanel({ projectId, documentId, onOpenChange }: { projectId: string; documentId: string; onOpenChange?: (open: boolean) => void }) {
  const id = useId(), operation = useRef<string | null>(null);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [latest, setLatest] = useState<PublicationReceipt | null>(null), [canPublish, setCanPublish] = useState(false), [confirmed, setConfirmed] = useState(false);
  const [requireIdentification, setRequireIdentification] = useState(false);
  const endpoint = `/api/projects/${projectId}/publication`;
  async function refresh() {
    setOpen(true); onOpenChange?.(true); setBusy(true); setMessage(""); setConfirmed(false);
    try {
      const response = await fetch(`${endpoint}?documentId=${documentId}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
      const body = await response.json(), parsed = publicationStatusSchema.safeParse(body);
      if (!response.ok || !parsed.success) { setMessage(body.message ?? "No fue posible consultar la publicación."); return; }
      setLatest(parsed.data.latest); setCanPublish(parsed.data.canPublish); setRequireIdentification(parsed.data.latest?.requireIdentification ?? false); operation.current = null;
    } catch { setMessage("No fue posible consultar la publicación. Reintenta."); } finally { setBusy(false); }
  }
  async function change(action: "prepare" | "publish") {
    if (busy || action === "publish" && (!latest || !confirmed || !canPublish)) return;
    const operationId = action === "prepare" ? operation.current ?? crypto.randomUUID() : latest!.id;
    if (action === "prepare") operation.current = operationId;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ action, documentId, operationId, ...(action === "publish" ? { confirmed: true } : { requireIdentification }) }) });
      const body = await response.json(), parsed = publicationReceiptSchema.safeParse(body.receipt);
      if (!response.ok || !parsed.success) { setMessage(body.message ?? "No se confirmó la operación. Actualiza o reintenta sin cambiar los datos."); return; }
      setLatest(parsed.data); setCanPublish(body.canPublish === true); setConfirmed(false); operation.current = null;
      setMessage(action === "prepare" ? "Versión preparada y guardada de forma privada. Todavía no se ha compartido." : "Publicación confirmada. Comparte el enlace con tus lectores.");
    } catch { setMessage("No se confirmó la respuesta. Reintenta la misma operación para evitar duplicados."); } finally { setBusy(false); }
  }
  async function copy() {
    if (!latest?.url) return;
    try { await navigator.clipboard.writeText(latest.url); setMessage("Enlace copiado."); }
    catch { setMessage("No se pudo copiar automáticamente. Selecciona y copia el enlace que aparece abajo."); }
  }
  return <section className="my-5 min-w-0 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-lg font-semibold">Publicación por enlace</h2>
    <p className="mt-2 text-sm text-slate-600">Prepara una copia del PDF y de sus refuerzos aprobados. Los borradores y quizzes sin aprobar quedan fuera.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()} className="mt-3 rounded-lg border border-slate-300 px-3 py-2">{open ? "Actualizar publicación" : "Revisar publicación"}</button>
    {open && <div className="mt-4 space-y-3">
      {latest ? <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">Versión {latest.version} · {latest.publishedAt ? "Publicada" : "Preparada, privada"}</p>
        <p>{latest.counts.reinforcements} refuerzos · {latest.counts.media} recursos · {latest.counts.quizzes} quizzes aprobados</p>
        <p className="text-sm">Preparada: {new Date(latest.createdAt).toLocaleString("es")}. Los cambios posteriores requieren preparar otra versión.</p>
        <p className="text-sm">Identificación del lector: {latest.requireIdentification ? "solicitada" : "no solicitada"}.</p>
        {latest.items.length > 0 && <ul className="mt-3 space-y-2 text-sm">{latest.items.map((item, index) => <li key={index} className="break-words border-t border-slate-200 pt-2">Página {item.pageNumber} · {item.title}<br />{item.mediaCount} recursos · {item.quizTitle ? `Quiz aprobado: ${item.quizTitle}` : "Sin quiz aprobado"}</li>)}</ul>}</div>
        : <p>Todavía no hay una versión preparada.</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={requireIdentification} disabled={busy} onChange={e => { setRequireIdentification(e.target.checked); operation.current = null; }} className="mt-1" />Solicitar nombre o correo al lector en la próxima versión. No verifica su identidad ni crea una cuenta.</label>
      <button type="button" disabled={busy} onClick={() => void change("prepare")} className="rounded-lg border border-blue-300 px-3 py-2 font-semibold text-blue-800">{latest ? "Preparar nueva versión" : "Preparar versión aprobada"}</button>
      {latest && <a href={`/projects/${projectId}/reader-test/${latest.id}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border border-slate-300 px-3 py-2">Probar lectura privada de esta versión</a>}
      {!canPublish && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">La publicación por enlace todavía no está habilitada en este entorno. Puedes preparar la versión; permanecerá privada.</p>}
      {latest && !latest.publishedAt && <div className="space-y-3"><label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy || !canPublish} className="mt-1" />Confirmo que quiero compartir este PDF y el contenido aprobado de la versión {latest.version} mediante un enlace accesible a sus lectores.</label>
        <button type="button" disabled={busy || !canPublish || !confirmed} onClick={() => void change("publish")} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Publicar versión {latest.version}</button></div>}
      {latest?.url && <div className="space-y-2"><label htmlFor={`${id}-url`} className="block font-semibold">Enlace de publicación</label><input id={`${id}-url`} value={latest.url} readOnly className="w-full min-w-0 rounded-lg border p-2" onFocus={e => e.target.select()} /><button type="button" onClick={() => void copy()} className="rounded-lg border border-blue-300 px-3 py-2">Copiar enlace</button></div>}
      <button type="button" disabled={busy} onClick={() => { setOpen(false); onOpenChange?.(false); }} className="ml-3 rounded-lg border border-slate-300 px-3 py-2">Cerrar publicación</button>
    </div>}
    {busy && <p role="status" className="mt-3 text-sm">Comprobando publicación…</p>}
    {message && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{message}</p>}
  </section>;
}
