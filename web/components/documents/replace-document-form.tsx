"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validatePdfFile } from "@/lib/validations/pdf-file";

export function ReplaceDocumentForm({ projectId, documentId }: { projectId: string; documentId: string }) {
  const id = useId();
  const router = useRouter();
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; message: string } | null>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !file || !confirmed) return;
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    try {
      const validation = await validatePdfFile(file);
      if (!validation.valid) { setNotice({ success: false, message: validation.message }); return; }
      const form = new FormData();
      form.set("file", file);
      form.set("documentId", documentId);
      form.set("confirmed", "true");
      const response = await fetch(`/api/projects/${projectId}/replace`, { method: "POST", body: form });
      const body = await response.json();
      setNotice({ success: response.ok, message: body.message ?? "No fue posible confirmar el reemplazo." });
      if (response.ok) { setOpen(false); setFile(null); setConfirmed(false); }
      router.refresh();
    } catch {
      setNotice({ success: false, message: "Se perdió la conexión. Recarga el proyecto para comprobar el PDF vigente antes de reintentar." });
    } finally { inFlight.current = false; setPending(false); }
  }

  return <section className="mt-4">
    {open ? <form onSubmit={submit} aria-busy={pending} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm text-slate-800">El nuevo PDF será otra versión del documento. El proyecto y su propietario se conservarán. Los refuerzos y selecciones anteriores conservarán su PDF de origen y no aparecerán sobre las páginas nuevas.</p>
      <label htmlFor={`${id}-file`} className="block text-sm font-medium text-slate-800">Nuevo archivo PDF</label>
      <input id={`${id}-file`} type="file" accept="application/pdf,.pdf" disabled={pending}
        onChange={event => { setFile(event.target.files?.[0] ?? null); setConfirmed(false); setNotice(null); }}
        className="block w-full min-w-0 text-sm text-slate-800" />
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} />
        Confirmo que quiero reemplazar el PDF actual.
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || !file || !confirmed} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Reemplazando..." : "Confirmar reemplazo"}</button>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setFile(null); setConfirmed(false); setNotice(null); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800">Cancelar reemplazo</button>
      </div>
    </form> : <button type="button" onClick={() => { setOpen(true); setNotice(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reemplazar PDF</button>}
    {notice && <p role={notice.success ? "status" : "alert"} className={`mt-2 text-sm ${notice.success ? "text-green-700" : "text-red-700"}`}>{notice.message}</p>}
  </section>;
}
