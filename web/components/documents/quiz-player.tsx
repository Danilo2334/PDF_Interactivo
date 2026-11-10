"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { PlayableQuiz, QuizFeedback } from "@/lib/validations/experience-preview";
export function QuizPlayer({ quiz, onSubmit, initialResult, onRetry }: { quiz: Pick<PlayableQuiz, "title" | "questions" | "allowRetries">; onSubmit: (answers: number[]) => Promise<QuizFeedback>;
  initialResult?: { answers: number[]; feedback: QuizFeedback } | null; onRetry?: () => void }) {
  const id = useId(), inFlight = useRef(false), [answers, setAnswers] = useState<(number | null)[]>(() => initialResult?.answers ?? quiz.questions.map(() => null));
  const [feedback, setFeedback] = useState<QuizFeedback | null>(initialResult?.feedback ?? null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null), result = useRef<HTMLParagraphElement>(null), submitButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"answers" | "result" | "submit" | null>(null);
  useLayoutEffect(() => {
    if (busy || !pendingFocus.current) return;
    const target = pendingFocus.current === "answers" ? form.current?.querySelector<HTMLInputElement>('input[type="radio"]')
      : pendingFocus.current === "result" ? result.current : submitButton.current;
    if (target) { target.focus(); pendingFocus.current = null; }
  }, [feedback, busy, error]);
  const complete = answers.every(answer => answer !== null), locked = busy || feedback !== null;
  async function submit() {
    if (!complete || locked || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { const result = await onSubmit(answers as number[]); if (result.total !== quiz.questions.length || result.questions.length !== quiz.questions.length) throw Error("No se pudo verificar el resultado."); pendingFocus.current = "result"; setFeedback(result); }
    catch (error) { pendingFocus.current = "submit"; setError(error instanceof Error ? error.message : "No se pudo comprobar el resultado. Reintenta."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section aria-labelledby={`${id}-title`} className="mt-5 space-y-3 border-t border-slate-200 pt-4">
    <h4 id={`${id}-title`} className="break-words font-semibold">{quiz.title}</h4>
    {!feedback && <p className="text-sm text-slate-700">Elige una opción por pregunta y pulsa «Enviar respuestas y ver puntaje». Tu respuesta correcta y la explicación aparecen después de enviar.</p>}
    <form ref={form} onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
      {quiz.questions.map((q, index) => <fieldset key={index} disabled={locked} className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3">
        <legend className="break-words font-semibold">{index + 1}. {q.prompt}</legend>
        {q.options.map((option, optionIndex) => <label key={optionIndex} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm focus-within:ring-2 focus-within:ring-blue-500 ${answers[index] === optionIndex ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}><input type="radio" name={`${id}-question-${index}`} checked={answers[index] === optionIndex} className="mt-1 h-4 w-4 shrink-0 accent-blue-700"
          onChange={() => setAnswers(previous => previous.map((a, i) => i === index ? optionIndex : a))} /><span className="min-w-0 break-words"><strong>{String.fromCharCode(65 + optionIndex)}. </strong>{option}</span></label>)}
      </fieldset>)}
      {!feedback && <><p className="text-sm text-slate-700" aria-live="polite">{answers.filter(answer => answer !== null).length} de {quiz.questions.length} preguntas respondidas{complete ? ". Ya puedes enviar." : ". Responde todas para enviar."}</p>
        <button ref={submitButton} type="submit" disabled={!complete || busy} className="min-h-11 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Comprobando respuestas…" : "Enviar respuestas y ver puntaje"}</button></>}
    </form>
    {error && <p role="alert" className="break-words text-sm text-red-800">{error}</p>}
    {feedback && <div aria-live="polite" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p ref={result} tabIndex={-1} role="status" className="font-semibold">Resultado: {feedback.score} de {feedback.total}</p>
      <p className="text-sm">Puntaje: {Math.round(feedback.score / feedback.total * 100)} %. Revisa debajo la explicación de cada respuesta.</p>
      {feedback.questions.map((q, index) => <div key={index} className="space-y-1 break-words text-sm"><p className="font-semibold">Pregunta {index + 1}: {q.correct ? "Correcta" : "Incorrecta"}</p>
        <p>Respuesta correcta: {q.correctOption}</p><p>{q.explanation}</p></div>)}
      {quiz.allowRetries ? <button type="button" onClick={() => { onRetry?.(); pendingFocus.current = "answers"; setFeedback(null); setAnswers(quiz.questions.map(() => null)); setError(""); }} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold">Reintentar mini quiz</button>
        : <p className="text-sm">Este mini quiz no permite reintentos.</p>}
    </div>}
  </section>;
}
