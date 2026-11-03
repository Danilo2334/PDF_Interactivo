"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validatePdfFile } from "@/lib/validations/pdf-file";
import { transferPdfFile, type PdfTransferProgress } from "@/lib/documents/pdf-file-transfer";
import { chooseUploadOperation, clearUploadOperation } from "@/lib/documents/upload-operation";

export function ReplaceDocumentForm({ projectId, documentId }: { projectId: string; documentId: string }) {
  const id = useId();
  const router = useRouter();
  const inFlight = useRef(false);
  const operation = useRef<{ documentId: string; id: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmedVersion, setConfirmedVersion] = useState<string | null>(null);
  const confirmed = confirmedVersion === documentId;
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [progress, setProgress] = useState<PdfTransferProgress | null>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !file || !confirmed) return;
    inFlight.current = true;
    setPending(true);
    setNotice(null);
    setProgress(null);
    try {
      const validation = await validatePdfFile(file);
      if (!validation.valid) { setNotice({ success: false, message: validation.message }); return; }
      let storage: Storage | null = null;
      try { storage = window.sessionStorage; } catch { /* in-memory retry remains available */ }
      const scope = `replace:${projectId}:${documentId}`;
      if (operation.current?.documentId !== documentId)
        operation.current = { documentId, id: await chooseUploadOperation(file, scope, storage) };
      const saved = await transferPdfFile({ endpoint: `/api/projects/${projectId}/replace`, operationId: operation.current.id,
        documentId, file, onProgress: setProgress });
      setNotice({ success: true, message: saved.message });
      clearUploadOperation(scope, storage);
      setOpen(false); setFile(null); setConfirmedVersion(null); operation.current = null;
      router.refresh();
    } catch (error) {
      setNotice({ success: false, message: error instanceof Error ? error.message : "No se confirmó el reemplazo. Reintenta con el mismo PDF." });
    } finally { inFlight.current = false; setPending(false); setProgress(null); }
  }

  return <section className="mt-4">
    {open ? <form onSubmit={submit} aria-busy={pending} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm text-slate-800">El nuevo PDF será otra versión del documento. El proyecto y su propietario se conservarán. Los refuerzos y selecciones anteriores conservarán su PDF de origen y no aparecerán sobre las páginas nuevas.</p>
      <label htmlFor={`${id}-file`} className="block text-sm font-medium text-slate-800">Nuevo archivo PDF</label>
      <input id={`${id}-file`} type="file" accept="application/pdf,.pdf" disabled={pending}
        onChange={event => { setFile(event.target.files?.[0] ?? null); setConfirmedVersion(null); setNotice(null); operation.current = null; }}
        className="block w-full min-w-0 text-sm text-slate-800" />
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmedVersion(event.target.checked ? documentId : null)} />
        Confirmo que quiero reemplazar el PDF actual.
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || !file || !confirmed} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Reemplazando..." : "Confirmar reemplazo"}</button>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setFile(null); setConfirmedVersion(null); setNotice(null); operation.current = null; }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800">Cancelar reemplazo</button>
      </div>
    </form> : <button type="button" onClick={() => { setOpen(true); setNotice(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reemplazar PDF</button>}
    {progress && <div role="status" className="mt-2 text-sm">
      {progress.phase === "uploading" ? <><progress value={progress.percent ?? 0} max={100} aria-label="Progreso de transferencia del reemplazo" className="w-full" /><p>{progress.percent ?? 0}% transferido</p></>
        : <p>{progress.phase === "preparing" ? "Preparando transferencia privada..." : "Validando el PDF almacenado y confirmando la versión..."}</p>}
    </div>}
    {notice && <p role={notice.success ? "status" : "alert"} className={`mt-2 text-sm ${notice.success ? "text-green-700" : "text-red-700"}`}>{notice.message}</p>}
  </section>;
}
