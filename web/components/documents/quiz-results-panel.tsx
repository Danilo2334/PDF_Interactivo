"use client";
import { useEffect, useState } from "react";
import { quizResultsSchema, type QuizResults } from "@/lib/validations/quiz-results";
export function QuizResultsPanel({ projectId, documentId }: { projectId: string; documentId: string }) {
  const [open, setOpen] = useState(false), [result, setResult] = useState<QuizResults | null>(null), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load() {
      setBusy(true); setError(""); setResult(null);
      let message = "No fue posible consultar los resultados. Reintenta.";
      try {
        const response = await fetch(`/api/projects/${projectId}/quiz-results?documentId=${documentId}&page=${page}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
        if (response.status === 401) message = "Debes iniciar sesión nuevamente para consultar los resultados.";
        else if (response.status === 403) message = "Ya no tienes permiso para consultar estos resultados.";
        else if (response.status === 409) message = "El documento cambió o dejó de estar disponible. Actualiza el proyecto.";
        const parsed = quizResultsSchema.safeParse(await response.json());
        if (!response.ok || !parsed.success) throw Error(message);
        if (!controller.signal.aborted) setResult(parsed.data);
      } catch { if (!controller.signal.aborted) setError(message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load(); return () => controller.abort();
  }, [open, projectId, documentId, page, attempt]);
  return <section aria-label="Resultados del mini quiz" className="my-5 min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h2 className="text-lg font-semibold"><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="rounded py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-700">Resultados del mini quiz {open ? "−" : "+"}</button></h2>
    {open && <div aria-busy={busy} className="space-y-4">
      <p className="text-sm">Resultados de lectores de todas las publicaciones de este documento, incluidas las retiradas. Se incluyen sus reintentos; los ensayos privados quedan fuera. Cada intento conserva la versión que respondió.</p>
      <p className="text-sm text-slate-600">Los intentos no conservan nombres ni correos. Cada lector aparece con una referencia seudónima del documento; no equivale a una persona única entre navegadores.</p>
      <button type="button" disabled={busy} onClick={() => setAttempt(n => n + 1)} className="rounded-lg border px-3 py-2">Actualizar resultados</button>
      {busy && <p role="status">Consultando resultados…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
      {result && <><p>{result.totalAttempts} intentos válidos · Consultado: {new Date(result.through).toLocaleString("es")}</p>
        {result.excluded > 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3">Se excluyeron {result.excluded} registros inconsistentes de los indicadores. Los datos guardados se conservan.</p>}
        {result.duplicatesIgnored > 0 && <p>Se ignoraron {result.duplicatesIgnored} repeticiones en la consulta para evitar duplicar los indicadores.</p>}
        {result.groups.length === 0 && <p>Este documento todavía no tiene mini quizzes publicados.</p>}
        {result.groups.map(group => <details key={group.id} className="min-w-0 rounded-lg border p-3">
          <summary className="cursor-pointer break-words font-medium">{group.title} · Página {group.pageNumber} · Publicación {group.publicationVersion} · Quiz {group.quizVersion} · {group.attempts} intentos</summary>
          <div className="mt-3 space-y-3"><p className="text-sm">{group.participants} referencias de lector · Identificación {group.identificationRequired ? "solicitada" : "deshabilitada"} en esta publicación.</p>
            {group.attempts === 0 && <p>Aún no hay respuestas de lectores para esta versión.</p>}
            <ol className="space-y-3">{group.questions.map((question, index) => <li key={index} className="rounded-lg bg-slate-50 p-3">
              <h3 className="break-words font-medium">{index + 1}. {question.prompt}</h3>
              <p>{question.correct} de {question.answers} respuestas correctas · {question.percentage.toLocaleString("es", { maximumFractionDigits: 2 })}%</p>
              <p className="break-words text-sm">Respuesta correcta de esta versión: {question.correctOption}</p>
              <ul className="mt-2 space-y-1 text-sm">{question.options.map((option, i) => <li key={i} className="break-words">{option}: {question.optionCounts[i]} respuestas</li>)}</ul>
            </li>)}</ol>
          </div>
        </details>)}
        <h3 className="font-semibold">Intentos guardados</h3>
        {result.attempts.length === 0 && <p>Todavía no hay intentos válidos de lectores.</p>}
        {result.attempts.map(row => { const group = result.groups.find(g => g.id === row.groupId); return <details key={row.id} className="min-w-0 rounded-lg border p-3">
          <summary className="cursor-pointer break-words">{row.participant} · Intento {row.number} · {row.score}/{row.total} · {new Date(row.createdAt).toLocaleString("es")}</summary>
          <div className="mt-3 space-y-2 text-sm"><p className="break-words">{group?.title} · Publicación {group?.publicationVersion} · Quiz {group?.quizVersion}</p>
            <ol className="space-y-2">{row.answers.map((answer, index) => <li key={index}><p className="break-words">{index + 1}. {answer.selected} · {answer.correct ? "Correcta" : "Incorrecta"}</p><p className="break-words">{answer.explanation}</p></li>)}</ol>
          </div>
        </details>; })}
        <nav aria-label="Páginas de resultados" className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || result.page <= 1} onClick={() => setPage(result.page - 1)} className="rounded-lg border px-3 py-2">Intentos anteriores</button>
          <p>Página {result.page} de {result.pages}</p><button type="button" disabled={busy || result.page >= result.pages} onClick={() => setPage(result.page + 1)} className="rounded-lg border px-3 py-2">Más intentos</button>
        </nav>
      </>}
    </div>}
  </section>;
}
