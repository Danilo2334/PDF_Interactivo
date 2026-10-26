"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DocumentFragmentSelection } from "@/lib/pdf/fragment-selection";
import { DIFFICULTY_CATEGORIES, DIFFICULTY_MIN_LENGTH, DIFFICULTY_MAX_LENGTH, EMPTY_DIFFICULTY_INPUT, validateDifficulty, type DifficultyDraft, type DifficultyInput } from "@/lib/validations/difficulty";

export type PageSelection = { documentId: string; pageNumber: number };

export function ReinforcementRequestDraft({ documentId, documentName, selection, fragment, onClearSelection,
  difficultyInput = EMPTY_DIFFICULTY_INPUT, difficultyDraft, onDifficultyChange, onConfirmDifficulty }: {
  documentId: string; documentName: string; selection: PageSelection | null;
  fragment?: DocumentFragmentSelection | null; onClearSelection?: () => void;
  difficultyInput?: DifficultyInput; difficultyDraft?: DifficultyDraft | null;
  onDifficultyChange?: (value: DifficultyInput) => void; onConfirmDifficulty?: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [attemptedContext, setAttemptedContext] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const page = selection?.documentId === documentId ? selection.pageNumber : null;
  const currentFragment = fragment?.documentId === documentId && fragment.pageNumber === page ? fragment : null;
  const contextKey = `${documentId}:${page}`;
  const validation = validateDifficulty(difficultyInput);
  const errors = attemptedContext === contextKey && !validation.success ? validation.errors : {};
  const confirmed = difficultyDraft?.documentId === documentId && difficultyDraft.pageNumber === page ? difficultyDraft : null;
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
    {open && <form aria-label="Borrador de solicitud de refuerzo" noValidate onSubmit={event => {
      event.preventDefault(); setAttemptedContext(contextKey);
      if (page && validation.success) onConfirmDifficulty?.();
    }}
      className="mt-4 space-y-3" data-document-id={documentId} data-page-number={page ?? ""}>
      <h3 id={`${id}-title`} className="text-lg font-semibold text-slate-900">Solicitud de refuerzo — borrador</h3>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="fragment" value={currentFragment ? JSON.stringify(currentFragment) : ""} />
      <input type="hidden" name="difficulty" value={confirmed ? JSON.stringify(confirmed) : ""} />
      <p className="break-words text-sm text-slate-800">Documento: {documentName}</p>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">Página del refuerzo</label>
      <input id={id} name="pageNumber" readOnly value={page ?? ""}
        className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" />
      {currentFragment && <section aria-label="Vista previa del fragmento" data-fragment={JSON.stringify(currentFragment)} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="font-semibold text-slate-900">{currentFragment.kind === "text" ? "Texto seleccionado" : "Zona rectangular seleccionada"}</p>
        {currentFragment.kind === "text" && <blockquote className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-800">{currentFragment.text}</blockquote>}
        <button type="button" onClick={onClearSelection} className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">Limpiar fragmento</button>
      </section>}
      <fieldset className="space-y-3 border-t border-slate-200 pt-3">
        <legend className="font-semibold text-slate-900">Dificultad de comprensión</legend>
        <div>
          <label htmlFor={`${id}-category`} className="block text-sm font-medium text-slate-800">Categoría principal</label>
          <select id={`${id}-category`} name="difficultyCategory" required value={difficultyInput.category}
            onChange={event => onDifficultyChange?.({ ...difficultyInput, category: event.target.value })}
            aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? `${id}-category-error` : undefined}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900">
            <option value="">Selecciona una categoría</option>
            {DIFFICULTY_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {errors.category && <p id={`${id}-category-error`} role="alert" className="mt-1 text-sm text-red-700">{errors.category}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-observation`} className="block text-sm font-medium text-slate-800">¿Qué parte no está clara?</label>
          <textarea id={`${id}-observation`} name="difficultyObservation" rows={4} required minLength={DIFFICULTY_MIN_LENGTH} maxLength={DIFFICULTY_MAX_LENGTH}
            value={difficultyInput.observation} onChange={event => onDifficultyChange?.({ ...difficultyInput, observation: event.target.value })}
            aria-invalid={Boolean(errors.observation)} aria-describedby={`${id}-observation-help${errors.observation ? ` ${id}-observation-error` : ""}`}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" />
          <p id={`${id}-observation-help`} className="text-xs text-slate-600">Mínimo {DIFFICULTY_MIN_LENGTH} y máximo {DIFFICULTY_MAX_LENGTH} caracteres. Llevas {difficultyInput.observation.trim().length}, sin espacios en los extremos.</p>
          {errors.observation && <p id={`${id}-observation-error`} role="alert" className="mt-1 text-sm text-red-700">{errors.observation}</p>}
        </div>
        <button type="submit" disabled={!page} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Guardar dificultad en borrador</button>
      </fieldset>
      {confirmed && <section aria-label="Dificultad vinculada" data-difficulty={JSON.stringify(confirmed)} role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
        <p className="font-semibold">Dificultad guardada en este borrador.</p>
        <p>Página {confirmed.pageNumber} · {DIFFICULTY_CATEGORIES.find(item => item.value === confirmed.category)?.label} · {confirmed.fragment ? confirmed.fragment.kind === "text" ? "Texto seleccionado" : "Zona seleccionada" : "Página completa"}</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{confirmed.observation}</p>
      </section>}
      <p className="text-sm text-slate-700">Este borrador es temporal y todavía no se ha enviado. Se conserva al cerrar y reabrir el formulario; al recargar o salir del proyecto se descarta.</p>
      <button type="button" autoFocus onClick={() => setOpen(false)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">Cerrar borrador</button>
    </form>}
    </dialog>
  </section>;
}
