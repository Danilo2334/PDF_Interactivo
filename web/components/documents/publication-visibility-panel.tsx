"use client";
import { useId, useRef, useState } from "react";
import { publicationReceiptSchema, publicationStatusSchema, type PublicationReceipt, type PublicationVisibility } from "@/lib/validations/publication";
export const VISIBILITY_NAMES = { public: "Pública", private: "Privada", unpublished: "Despublicada" };
const effects = {
  public: "Los lectores podrán abrir esta versión sin cuenta de propietario. Al volver a publicar se crea otro enlace; los retirados siguen invalidados.",
  private: "Solo el propietario autorizado podrá consultar esta versión. El enlace deja de entregar contenido a lectores anónimos.",
  unpublished: "Se bloquean las nuevas lecturas, PDF, recursos e intentos de esta versión. Se conservan el contenido y los resultados guardados; no se borran copias ya descargadas.",
};
type Management = ReturnType<typeof publicationStatusSchema.parse>;
function VisibilityControl({ value, canPublish, busy, onSave }: { value: PublicationReceipt; canPublish: boolean; busy: boolean;
  onSave: (value: PublicationReceipt, visibility: PublicationVisibility) => Promise<void> }) {
  const id = useId(), [selected, setSelected] = useState(value.visibility), [confirmed, setConfirmed] = useState(false);
  const changed = selected !== value.visibility;
  return <fieldset disabled={busy} className="min-w-0 space-y-3 rounded-lg border border-slate-300 p-3">
    <legend className="font-semibold">Visibilidad de la versión {value.version}</legend>
    <p>Estado guardado: <strong>{VISIBILITY_NAMES[value.visibility]}</strong> · Cambio {value.visibilityVersion}</p>
    <label htmlFor={id} className="block text-sm font-semibold">Nuevo estado de la versión {value.version}</label>
    <select id={id} value={selected} onChange={e => { setSelected(e.target.value as PublicationVisibility); setConfirmed(false); }} className="max-w-full rounded-lg border bg-white p-2">
      <option value="public" disabled={!canPublish}>Pública{!canPublish ? " · requiere HTTPS habilitado" : ""}</option>
      <option value="private">Privada</option><option value="unpublished">Despublicada</option>
    </select>
    <p className="break-words text-sm">{effects[selected]}</p>
    {changed && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
      Confirmo cambiar la versión {value.version} a {VISIBILITY_NAMES[selected].toLowerCase()}.</label>}
    <button type="button" disabled={busy || !changed || !confirmed || selected === "public" && !canPublish} onClick={() => void onSave(value, selected)}
      className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Aplicar visibilidad de la versión {value.version}</button>
  </fieldset>;
}
export function PublicationVisibilityPanel({ endpoint, documentId, management, busy, setBusy, onSaved }: {
  endpoint: string; documentId: string; management: Management; busy: boolean; setBusy: (busy: boolean) => void; onSaved: (value: Management) => void;
}) {
  const id = useId(), operation = useRef<{ key: string; id: string } | null>(null), [message, setMessage] = useState("");
  const { latest, current, canPublish, events } = management;
  const targets = latest ? current && current.id !== latest.id ? [latest, current] : [latest] : [];
  async function save(value: PublicationReceipt, visibility: PublicationVisibility) {
    if (busy || visibility === "public" && !canPublish) return;
    const key = JSON.stringify([value.id, value.visibilityVersion, visibility]);
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ action: "visibility", documentId, publicationId: value.id, operationId: operation.current.id,
          expectedVersion: value.visibilityVersion, visibility, confirmed: true }) });
      const body = await response.json(), parsed = publicationReceiptSchema.safeParse(body.receipt);
      if (!response.ok || !parsed.success) { setMessage(typeof body.message === "string" ? body.message : "No se confirmó el cambio. Actualiza antes de reintentar."); return; }
      const receipt = parsed.data;
      onSaved({ ...management, latest: latest?.id === receipt.id ? receipt : latest,
        current: visibility === "public" || current?.id === receipt.id ? receipt : current, canPublish: body.canPublish === true });
      operation.current = null;
      const saved = `Visibilidad guardada: versión ${receipt.version} ${VISIBILITY_NAMES[receipt.visibility].toLowerCase()}.`;
      try {
        const updated = await fetch(`${endpoint}?documentId=${documentId}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
        const next = publicationStatusSchema.safeParse(await updated.json());
        if (!updated.ok || !next.success) throw Error("History unavailable");
        onSaved(next.data); setMessage(saved);
      } catch { setMessage(saved + " No se pudo actualizar el historial; pulsa Actualizar publicación."); }
    } catch { setMessage("No se confirmó la respuesta. Reintenta la misma operación para evitar duplicados."); }
    finally { setBusy(false); }
  }
  async function copyCurrent() {
    if (!current?.url) return;
    try { await navigator.clipboard.writeText(current.url); setMessage("Enlace copiado."); }
    catch { setMessage("Selecciona y copia el enlace que aparece abajo."); }
  }
  return <div className="min-w-0 space-y-3">
    {current && current.id !== latest?.id && <p className="rounded-lg bg-amber-50 p-3 text-sm">La última versión compartida es la {current.version} ({VISIBILITY_NAMES[current.visibility].toLowerCase()}). Preparar otra no la retira: puedes gestionar ambas aquí.</p>}
    {targets.map(target => <VisibilityControl key={`${target.id}-${target.visibilityVersion}`} value={target} canPublish={canPublish} busy={busy} onSave={save} />)}
    {current?.url && current.id !== latest?.id && <div className="space-y-2"><label htmlFor={`${id}-url`} className="block font-semibold">Enlace de la versión compartida {current.version}</label>
      <input id={`${id}-url`} value={current.url} readOnly className="w-full min-w-0 rounded-lg border p-2" onFocus={e => e.target.select()} />
      <button type="button" onClick={() => void copyCurrent()} className="rounded-lg border px-3 py-2">Copiar enlace de la versión {current.version}</button></div>}
    {events.length > 0 && <details><summary className="cursor-pointer font-semibold">Cambios de visibilidad guardados</summary>
      <ul className="space-y-2 text-sm">{events.map(event => <li key={event.operationId}>Versión {event.publicationVersion}: {VISIBILITY_NAMES[event.from]} → {VISIBILITY_NAMES[event.to]} · {new Date(event.occurredAt).toLocaleString("es")} · Realizado por ti</li>)}</ul></details>}
    {message && <p role="status" className="break-words rounded-lg bg-slate-50 p-3 text-sm">{message}</p>}
  </div>;
}
