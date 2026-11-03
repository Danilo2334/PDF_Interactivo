"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteDocumentForm({ projectId, documentId, name, retry = false }: {
  projectId: string; documentId: string; name: string; retry?: boolean;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [confirmedVersion, setConfirmedVersion] = useState<string | null>(null);
  const confirmed = confirmedVersion === documentId;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || inFlight.current) return;
    inFlight.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, confirmed: true }),
      });
      const body = await response.json();
      if (response.ok) { router.push("/documents"); router.refresh(); return; }
      setMessage(body.message ?? "No se pudo confirmar la eliminación. Revisa Mis documentos.");
      router.refresh();
    } catch { setMessage("Se perdió la conexión. Revisa Mis documentos antes de reintentar la eliminación."); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <section className="mt-4">
    {open ? <form onSubmit={submit} aria-busy={pending} className="space-y-3 rounded-lg border border-red-300 bg-red-50 p-4">
      <p className="text-sm text-red-900">Se eliminarán este proyecto, todas sus versiones del PDF y sus refuerzos y datos vinculados. El contenido dejará de estar disponible. Esta acción es permanente.</p>
      <label className="flex items-start gap-2 text-sm font-medium text-red-900">
        <input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmedVersion(event.target.checked ? documentId : null)} />
        Confirmo que quiero eliminar el documento y sus datos vinculados.
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || !confirmed} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Eliminando..." : retry ? "Confirmar reintento de limpieza" : "Confirmar eliminación"}</button>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setConfirmedVersion(null); setMessage(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800">Cancelar eliminación</button>
      </div>
    </form> : <button type="button" aria-label={`${retry ? "Reintentar limpieza" : "Eliminar documento"}: ${name}`} onClick={() => { setOpen(true); setMessage(""); }} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">{retry ? "Reintentar limpieza" : "Eliminar documento"}</button>}
    {message && <p role="alert" className="mt-2 text-sm text-red-700">{message}</p>}
  </section>;
}
