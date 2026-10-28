"use client";
import { useId, useState } from "react";
import { quizContentSchema, type QuizContent } from "@/lib/validations/quiz";
export function QuizEditor({ content, version, disabled, onSave, onCancel }: { content: QuizContent; version: number; disabled: boolean;
  onSave: (value: QuizContent, expectedVersion: number) => Promise<boolean>; onCancel: () => void }) {
  const id = useId(), [draft, setDraft] = useState(() => ({ version, content }));
  const outdated = draft.version !== version, valid = quizContentSchema.safeParse(draft.content);
  function question(index: number, value: Partial<QuizContent["questions"][number]>) {
    setDraft(previous => ({ ...previous, content: { ...previous.content, questions: previous.content.questions.map((q, i) => i === index ? { ...q, ...value } : q) } }));
  }
  return <form aria-label="Edición privada del mini quiz" className="space-y-3 rounded-lg border border-blue-300 bg-blue-50 p-3" onSubmit={event => { event.preventDefault(); if (!disabled && !outdated && valid.success) void onSave(valid.data, draft.version); }}>
    <h5 className="font-semibold">Editar preguntas del quiz · Versión {draft.version}</h5>
    <p className="text-sm">Guardar crea una versión privada pendiente. La aprobación anterior se conserva.</p>
    {outdated && <div role="alert"><p>Hay una versión más reciente. Tus cambios siguen en estos campos; no se sobrescribirá la nueva versión.</p>
      <button type="button" disabled={disabled} onClick={() => setDraft({ version, content })} className="rounded-lg border bg-white px-3 py-2">Cargar versión actual del quiz</button></div>}
    <label className="block" htmlFor={`${id}-title`}>Título del quiz</label>
    <input id={`${id}-title`} value={draft.content.title} onChange={event => setDraft({ ...draft, content: { ...draft.content, title: event.target.value } })} minLength={3} maxLength={160} required disabled={disabled} className="w-full rounded-lg border bg-white p-2" />
    {draft.content.questions.map((q, index) => <fieldset key={index} disabled={disabled} className="min-w-0 space-y-2 rounded-lg border border-blue-200 p-3">
      <legend className="font-semibold">Pregunta {index + 1}</legend>
      <label className="block" htmlFor={`${id}-prompt-${index}`}>Enunciado de pregunta {index + 1}</label>
      <textarea id={`${id}-prompt-${index}`} value={q.prompt} onChange={event => question(index, { prompt: event.target.value })} required minLength={8} maxLength={400} rows={2} className="w-full rounded-lg border bg-white p-2" />
      {q.options.map((option, optionIndex) => <div key={optionIndex} className="space-y-1">
        <label className="block" htmlFor={`${id}-option-${index}-${optionIndex}`}>Opción {optionIndex + 1} de pregunta {index + 1}</label>
        <input id={`${id}-option-${index}-${optionIndex}`} value={option} onChange={event => question(index, { options: q.options.map((o, i) => i === optionIndex ? event.target.value : o) })} required maxLength={300} className="w-full rounded-lg border bg-white p-2" />
        <label className="flex items-center gap-2"><input type="radio" name={`${id}-correct-${index}`} checked={q.correctIndex === optionIndex} onChange={() => question(index, { correctIndex: optionIndex })} />Opción {optionIndex + 1} correcta para pregunta {index + 1}</label>
      </div>)}
      <label className="block" htmlFor={`${id}-explanation-${index}`}>Explicación de respuesta {index + 1}</label>
      <textarea id={`${id}-explanation-${index}`} value={q.explanation} onChange={event => question(index, { explanation: event.target.value })} required minLength={20} maxLength={1000} rows={3} className="w-full rounded-lg border bg-white p-2" />
      <p className="break-words text-xs">Cita del refuerzo: {q.sourceQuote}</p>
    </fieldset>)}
    {!valid.success && <p role="alert" className="text-sm text-red-800">Revisa enunciados, explicación y opciones. Deben ser distintas, no vacías y tener una sola respuesta correcta.</p>}
    <div className="flex flex-wrap gap-2"><button type="submit" disabled={disabled || outdated || !valid.success} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Guardar nueva versión del quiz</button>
      <button type="button" disabled={disabled} onClick={onCancel} className="rounded-lg border bg-white px-3 py-2">Cancelar edición del quiz</button></div>
  </form>;
}
