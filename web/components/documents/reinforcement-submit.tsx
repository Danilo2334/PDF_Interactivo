"use client";

import type { SubmissionState } from "@/lib/reinforcements/submission";
import { REQUEST_STATUS_LABELS } from "@/lib/reinforcements/state";

export function ReinforcementSubmit({ missing, state, onSend, onReset }: {
  missing: string[]; state: SubmissionState; onSend: () => void; onReset: () => void;
}) {
  const pending = state.status === "sending";
  return <section aria-label="Enviar solicitud" className="space-y-3 border-t border-slate-200 pt-4">
    <h4 className="font-semibold text-slate-900">Enviar solicitud</h4>
    {missing.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
      {missing.map(message => <li key={message}>{message}</li>)}
    </ul>}
    {state.status === "success" && state.receipt ? <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
      <p className="font-semibold">Solicitud recibida. Estado: {REQUEST_STATUS_LABELS[state.receipt.status]}.</p>
      <p className="mt-1 break-all">Identificador: {state.receipt.id}</p>
      <p className="mt-1">Consulta su estado actualizado en la sección Solicitudes del proyecto.</p>
      <button type="button" onClick={onReset} className="mt-3 rounded-lg border border-green-700 px-3 py-2">Preparar otra solicitud</button>
    </div> : <>
      {state.status === "error" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
      <button type="button" onClick={onSend} disabled={pending || missing.length > 0}
        className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "Enviando solicitud…" : state.status === "error" ? "Reintentar envío" : "Enviar solicitud"}
      </button>
      {pending && <p role="status" className="text-sm text-slate-700">Confirmando el envío…</p>}
    </>}
  </section>;
}
