"use client";
import { useId, useRef, useState } from "react";
import type { PlayableQuiz, QuizFeedback } from "@/lib/validations/experience-preview";
export function QuizPlayer({ quiz, onSubmit, initialResult, onRetry }: { quiz: Pick<PlayableQuiz, "title" | "questions" | "allowRetries">; onSubmit: (answers: number[]) => Promise<QuizFeedback>;
  initialResult?: { answers: number[]; feedback: QuizFeedback } | null; onRetry?: () => void }) {
  const id = useId(), inFlight = useRef(false), [answers, setAnswers] = useState<(number | null)[]>(() => initialResult?.answers ?? quiz.questions.map(() => null));
  const [feedback, setFeedback] = useState<QuizFeedback | null>(initialResult?.feedback ?? null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const complete = answers.every(answer => answer !== null), locked = busy || feedback !== null;
  async function submit() {
    if (!complete || locked || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { const result = await onSubmit(answers as number[]); if (result.total !== quiz.questions.length || result.questions.length !== quiz.questions.length) throw Error("No se pudo verificar el resultado."); setFeedback(result); }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo comprobar el resultado. Reintenta."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section aria-labelledby={`${id}-title`} className="mt-5 space-y-3 border-t border-slate-200 pt-4">
    <h4 id={`${id}-title`} className="break-words font-semibold">{quiz.title}</h4>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
      {quiz.questions.map((q, index) => <fieldset key={index} disabled={locked} className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3">
        <legend className="break-words font-semibold">{index + 1}. {q.prompt}</legend>
        {q.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-start gap-2 break-words text-sm"><input type="radio" name={`${id}-question-${index}`} checked={answers[index] === optionIndex}
          onChange={() => setAnswers(previous => previous.map((a, i) => i === index ? optionIndex : a))} /><span className="min-w-0">{option}</span></label>)}
      </fieldset>)}
      {!feedback && <button type="submit" disabled={!complete || busy} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Comprobando respuestas…" : "Comprobar respuestas"}</button>}
    </form>
    {error && <p role="alert" className="break-words text-sm text-red-800">{error}</p>}
    {feedback && <div aria-live="polite" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p role="status" className="font-semibold">Resultado: {feedback.score} de {feedback.total}</p>
      {feedback.questions.map((q, index) => <div key={index} className="space-y-1 break-words text-sm"><p className="font-semibold">Pregunta {index + 1}: {q.correct ? "Correcta" : "Incorrecta"}</p>
        <p>Respuesta correcta: {q.correctOption}</p><p>{q.explanation}</p></div>)}
      {quiz.allowRetries ? <button type="button" onClick={() => { onRetry?.(); setFeedback(null); setAnswers(quiz.questions.map(() => null)); setError(""); }} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold">Reintentar mini quiz</button>
        : <p className="text-sm">Este mini quiz no permite reintentos.</p>}
    </div>}
  </section>;
}
