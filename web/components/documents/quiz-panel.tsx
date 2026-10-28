"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRequestResource } from "@/lib/reinforcements/use-request-resource";
import { OwnerReviewPanel, type ReviewAction } from "@/components/documents/owner-review-panel";
import { QuizEditor } from "@/components/documents/quiz-editor";
import { reviewEventSchema } from "@/lib/validations/example";
import { quizViewSchema, quizHeadSchema, quizJobSchema, QUIZ_MESSAGES, type QuizContent } from "@/lib/validations/quiz";
const parseView = (body: unknown) => quizViewSchema.parse(body);
const button = "max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
function QuizPreview({ content }: { content: QuizContent }) {
  return <div className="space-y-3"><h5 className="break-words font-semibold">{content.title}</h5>
    <ol className="space-y-4">{content.questions.map((q, index) => <li key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
      <p className="break-words font-semibold">{index + 1}. {q.prompt}</p><ol className="list-inside list-[upper-alpha] space-y-1">{q.options.map((option, i) => <li key={i} className="break-words">{option}{q.correctIndex === i && <strong> · Respuesta correcta</strong>}</li>)}</ol>
      <p className="break-words text-sm">Explicación reservada: {q.explanation}</p><p className="break-words text-xs text-slate-600">Cita del refuerzo: {q.sourceQuote}</p>
    </li>)}</ol><p className="text-xs text-slate-600">Reintentos: {content.allowRetries ? "permitidos" : "bloqueados"}. Las respuestas correctas pertenecen a esta vista privada del propietario.</p>
  </div>;
}
export function QuizPanel({ projectId, documentId, requestId, sourceVersionId, active = true }: {
  projectId: string; documentId: string; requestId: string; sourceVersionId: string; active?: boolean;
}) {
  const id = useId(), base = `/api/projects/${projectId}/reinforcement-requests/${requestId}/quiz`;
  const [opened, setOpened] = useState(false), [count, setCount] = useState(2), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [messageScope, setMessageScope] = useState<{ version: number; choice: number; decision: string } | null>(null);
  const [editing, setEditing] = useState(false), [confirmedState, setConfirmedState] = useState<{ version: number; choice: number; terminal: "approved" | "discarded" | null }>({ version: 0, choice: 0, terminal: null });
  const controller = useRef<AbortController | null>(null), operation = useRef<{ key: string; id: string } | null>(null);
  const resource = useRequestResource(`${base}?documentId=${documentId}&sourceVersionId=${sourceVersionId}`, opened && active && !busy, parseView, true);
  const view = resource.result?.value, current = view?.versions.find(v => v.version === view.head?.current_version);
  const editable = view?.head?.decision === "discarded" ? view.approvedVersion : current;
  const processing = view?.processing ?? false;
  const jobErrorMessage = view?.job?.status === "error" && !busy && !processing ? QUIZ_MESSAGES[view.job.error_code ?? "invalid_quiz"] : "";
  const staleReply = (view?.head?.current_version ?? 0) < confirmedState.version || (view?.head?.choice_version ?? 0) < confirmedState.choice
    || !!view?.head && confirmedState.terminal !== null && view.head.current_version === confirmedState.version
      && view.head.choice_version === confirmedState.choice && view.head.decision !== confirmedState.terminal;
  const visibleMessage = !messageScope || view?.head?.current_version === messageScope.version && view.head.choice_version === messageScope.choice
    && view.head.decision === messageScope.decision ? message : "";
  const disabled = !active || busy || processing || staleReply;
  useEffect(() => () => controller.current?.abort(), [base, sourceVersionId, active]);
  async function execute(action: "generate" | "generate_choice" | "omit" | ReviewAction | { action: "quiz_edit"; content: QuizContent; expectedVersion: number }) {
    if (!view || !active || controller.current) return null;
    const common = { documentId, sourceVersionId };
    const input = typeof action === "string" ? action === "generate" ? { ...common, action: "generate", expectedVersion: view.head?.current_version ?? 0, choiceVersion: view.head?.choice_version ?? 0, questionCount: count }
      : { ...common, action: "choose", choice: action === "omit" ? "omit" : "generate", choiceVersion: view.head?.choice_version ?? 0 }
      : action.action === "quiz_edit" ? { ...common, action: "edit", content: action.content, expectedVersion: action.expectedVersion }
      : { ...common, ...action };
    const key = JSON.stringify(input); if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
    const pending = new AbortController(), timeout = setTimeout(() => pending.abort(), 90000); controller.current = pending; setBusy(true); setMessage(""); setMessageScope(null);
    let version: number | null = null;
    try {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: pending.signal,
        body: JSON.stringify({ ...input, operationId: operation.current.id }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.message ?? "No se pudo confirmar la operación del quiz."); resource.refresh(); return null; }
      if (input.action === "generate") {
        if (response.status === 202) {
          setMessage("Al enviar ya existía una generación en curso; no se inició otra llamada de IA. Actualiza para consultar el resultado.");
          if (view.head) setMessageScope({ version: view.head.current_version, choice: view.head.choice_version, decision: view.head.decision });
        }
        else {
          const job = quizJobSchema.parse(body.job); version = job.result_version;
          if (version) { setConfirmedState(previous => ({ ...previous, version: Math.max(previous.version, version!), terminal: null }));
            setMessageScope({ version, choice: view.head?.choice_version ?? 0, decision: "pending" }); }
          setMessage(job.status === "ready" ? `Quiz versión ${version} guardado como borrador privado. Revisa cada pregunta y respuesta antes de aprobar.` : QUIZ_MESSAGES[job.error_code ?? "invalid_quiz"]);
          operation.current = null;
        }
      } else {
        const head = quizHeadSchema.parse(body.head); version = head.current_version;
        setConfirmedState({ version, choice: head.choice_version, terminal: input.action === "approve" ? "approved" : input.action === "discard" ? "discarded" : null });
        setMessageScope({ version, choice: head.choice_version, decision: head.decision }); operation.current = null;
        setMessage(input.action === "choose" ? "Elección del propietario guardada." : input.action === "approve" ? `La versión ${version} del quiz quedó aprobada por ti. Su publicación se integrará con la del proyecto.`
          : input.action === "discard" ? `Borrador de versión ${version} descartado. Se conserva la aprobación anterior.` : `Versión ${version} del quiz guardada y pendiente de aprobación.`);
      }
      resource.refresh();
    } catch { setMessage("No se confirmó la respuesta. Actualiza o reintenta sin cambiar los datos; no se repetirá una operación ya registrada."); resource.refresh(); }
    finally { clearTimeout(timeout); if (controller.current === pending) { controller.current = null; setBusy(false); } }
    return version;
  }
  const review = current && view?.head ? { review: view.head, versions: view.versions.map(v => ({ ...v, title: v.content.title,
    text: v.content.questions.map((q, i) => `${i + 1}. ${q.prompt}\n${q.options.map((o, n) => `${n + 1}. ${o}${n === q.correctIndex ? " [Correcta]" : ""}`).join("\n")}\n${q.explanation}\nCita: ${q.sourceQuote}`).join("\n\n") })),
    events: view.events.filter(e => !["choose_generate", "choose_omit"].includes(e.action)).map(e => reviewEventSchema.parse(e)) } : null;
  return <section aria-labelledby={`${id}-title`} className="mt-4 min-w-0 space-y-3 border-t border-slate-200 pt-4">
    <h4 id={`${id}-title`} className="font-semibold">Mini quiz opcional</h4>
    <p className="text-sm">Omitirlo no impide aprobar ni publicar el refuerzo. El borrador y sus respuestas son privados para ti.</p>
    <button type="button" className={button} aria-expanded={opened} aria-controls={`${id}-panel`} onClick={() => setOpened(value => !value)}>{opened ? "Cerrar mini quiz" : "Configurar mini quiz opcional"}</button>
    <div id={`${id}-panel`} hidden={!opened} className="space-y-3">
      {!view ? <p role={resource.result?.error ? "alert" : "status"}>{resource.result?.error ?? "Consultando el quiz privado…"}</p> : <>
        <details><summary className="cursor-pointer font-semibold">Fuente del quiz · Página {view.source?.pageNumber}</summary><p className="mt-2 break-words">{view.source?.title}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{view.source?.text}</p><p className="mt-2 text-xs">Conceptos presentes: {view.source?.concepts.join(", ") || "Se usará únicamente el texto del refuerzo."}</p></details>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={disabled} onClick={() => void execute("generate_choice")}>Quiero generar un mini quiz</button>
          <button type="button" className={button} disabled={disabled} onClick={() => void execute("omit")}>Continuar sin mini quiz</button>
          <button type="button" className={button} disabled={busy} onClick={() => { setMessage(""); setMessageScope(null); resource.refresh(); }}>Actualizar mini quiz</button></div>
        <p role="status">{view.head?.choice === "omit" ? "Elección guardada: continuar sin mini quiz. El refuerzo conserva su aprobación y el historial del quiz no se borra."
          : view.head?.choice === "generate" ? "Elección guardada: generar mini quiz." : "Todavía no has elegido crear u omitir el quiz."}</p>
        {view.head?.choice === "generate" && <div className="space-y-2"><label className="block text-sm" htmlFor={`${id}-count`}>Cantidad de preguntas</label>
          <select id={`${id}-count`} value={count} disabled={disabled} onChange={event => setCount(Number(event.target.value))} className="rounded-lg border border-slate-300 p-2">{[1,2,3].map(n => <option key={n} value={n}>{n}</option>)}</select>
          <button type="button" className={button} disabled={disabled || !view.providerAvailable || view.head.current_version >= 99 || view.head.target_source_version_id !== sourceVersionId}
            onClick={() => void execute("generate")}>{current ? "Generar otra versión del quiz" : "Generar preguntas"}</button>
          {!view.providerAvailable && <p role="alert">{QUIZ_MESSAGES.provider_unavailable}</p>}
        </div>}
        {(busy || processing || staleReply) && <p role="status">{busy || processing ? "Procesando la operación. No cierres la revisión si quieres ver el resultado." : "Consultando la versión recién guardada…"}</p>}
        {current && view.head?.decision !== "discarded" && <>
          <p className="text-sm font-semibold">Versión {current.version} · {view.head?.decision === "approved" ? "Aprobada por ti" : "Borrador pendiente"} · Fuente {current.source.title}</p>
          {current.source_version_id !== sourceVersionId && <p role="alert">Este quiz corresponde a otra versión del refuerzo. Genera uno nuevo para la fuente seleccionada.</p>}
          <QuizPreview content={current.content} />
        </>}
        {editable && view.head && (!editing ? <button type="button" className={button} disabled={disabled || view.head.choice !== "generate" || editable.source_version_id !== sourceVersionId}
          onClick={() => setEditing(true)}>{view.head.decision === "discarded" ? "Editar quiz aprobado conservado" : "Editar preguntas del quiz"}</button>
            : <QuizEditor content={editable.content} version={view.head.current_version} disabled={disabled} onCancel={() => setEditing(false)} onSave={async (content, expectedVersion) => {
              const version = await execute({ action: "quiz_edit", content, expectedVersion }); if (version !== null) setEditing(false); return version !== null;
            }} />)}
        {review && <OwnerReviewPanel key={`${current?.version}-${view.head?.decision}`} view={review} readOnlyContent approvedLocation="el historial privado del quiz"
          confirmationLabel="He revisado estas preguntas, sus opciones y respuestas correctas, y confirmo que son coherentes con el refuerzo."
          disabled={disabled || editing || view.head?.choice !== "generate" || current?.source_version_id !== sourceVersionId} onReview={execute} />}
        {view.approvedVersion && view.approvedVersion.id !== current?.id && <details><summary className="cursor-pointer font-semibold">Quiz aprobado anterior conservado · Versión {view.approvedVersion.version}</summary><QuizPreview content={view.approvedVersion.content} /></details>}
        {jobErrorMessage && <p role="alert">{jobErrorMessage}</p>}
        {view.job?.status === "processing" && !processing && <p role="alert">La generación anterior caducó. Actualiza y reintenta manualmente si todavía quieres crear el quiz; no se usará una respuesta antigua.</p>}
      </>}
      {visibleMessage && visibleMessage !== jobErrorMessage && <p role="status" className="break-words text-sm">{visibleMessage}</p>}
    </div>
  </section>;
}
