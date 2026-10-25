"use client";

import { useId, useState, useTransition } from "react";
import { renameDocumentAction, type RenameDocumentResult } from "@/app/actions/rename-document";

type RenameDocumentProps = { projectId: string; currentName: string };

export function RenameDocumentForm({ projectId, currentName }: RenameDocumentProps) {
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [result, setResult] = useState<RenameDocumentResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await renameDocumentAction({ projectId, name });
        setResult(response);
        if (response.success) setEditing(false);
      } catch {
        setResult({ success: false, message: "No fue posible guardar el nombre. Comprueba tu conexión e inténtalo nuevamente." });
      }
    });
  }

  return (
    <div className="mt-4">
      {editing ? (
        <form onSubmit={submit} noValidate aria-busy={pending} className="space-y-3">
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">Nuevo nombre</label>
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            maxLength={255}
            value={name}
            disabled={pending}
            onChange={(event) => { setName(event.target.value); setResult(null); }}
            aria-invalid={Boolean(result?.nameError)}
            aria-describedby={result?.nameError ? `${inputId}-result` : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Guardando..." : "Guardar nombre"}
            </button>
            <button type="button" disabled={pending} onClick={() => { setEditing(false); setResult(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Cancelar</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          aria-label={`Renombrar documento: ${currentName}`}
          onClick={() => { setName(currentName); setResult(null); setEditing(true); }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >Renombrar</button>
      )}
      {result && (
        <p id={`${inputId}-result`} role={result.success ? "status" : "alert"} className={`mt-2 text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
