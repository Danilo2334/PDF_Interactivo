"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DocumentFragmentSelection } from "@/lib/pdf/fragment-selection";

export type PageSelection = { documentId: string; pageNumber: number };

export function ReinforcementRequestDraft({ documentId, documentName, selection, fragment, onClearSelection }: {
  documentId: string; documentName: string; selection: PageSelection | null;
  fragment?: DocumentFragmentSelection | null; onClearSelection?: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const page = selection?.documentId === documentId ? selection.pageNumber : null;
  const currentFragment = fragment?.documentId === documentId && fragment.pageNumber === page ? fragment : null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);

  return <section aria-label="Página a reforzar" data-document-id={documentId}
    className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
    <p role="status" className="font-semibold text-blue-900">
      {page ? `Página seleccionada para reforzar: ${page}` : "Abre el PDF y elige la página que quieres reforzar."}
    </p>
    <p className="min-h-5 text-sm text-blue-900">{currentFragment ? currentFragment.kind === "text" ? "Fragmento de texto seleccionado." : "Zona rectangular seleccionada." : "Sin fragmento marcado."}</p>
    <button type="button" disabled={!page || open} onClick={() => setOpen(true)}
      className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Abrir solicitud de refuerzo</button>
    <dialog ref={dialogRef} aria-labelledby={`${id}-title`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
    {open && <form aria-label="Borrador de solicitud de refuerzo" onSubmit={event => event.preventDefault()}
      className="mt-4 space-y-3" data-document-id={documentId} data-page-number={page ?? ""}>
      <h3 id={`${id}-title`} className="text-lg font-semibold text-slate-900">Solicitud de refuerzo — borrador</h3>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="fragment" value={currentFragment ? JSON.stringify(currentFragment) : ""} />
      <p className="break-words text-sm text-slate-800">Documento: {documentName}</p>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">Página del refuerzo</label>
      <input id={id} name="pageNumber" readOnly value={page ?? ""}
        className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" />
      {currentFragment && <section aria-label="Vista previa del fragmento" data-fragment={JSON.stringify(currentFragment)} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="font-semibold text-slate-900">{currentFragment.kind === "text" ? "Texto seleccionado" : "Zona rectangular seleccionada"}</p>
        {currentFragment.kind === "text" && <blockquote className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-800">{currentFragment.text}</blockquote>}
        <button type="button" onClick={onClearSelection} className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">Limpiar fragmento</button>
      </section>}
      <p className="text-sm text-slate-700">La solicitud todavía no se ha enviado. La página se conserva al cerrar y reabrir este borrador dentro del proyecto.</p>
      <button type="button" autoFocus onClick={() => setOpen(false)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">Cerrar borrador</button>
    </form>}
    </dialog>
  </section>;
}
