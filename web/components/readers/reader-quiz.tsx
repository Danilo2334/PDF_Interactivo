"use client";
import { useEffect, useRef, useState } from "react";
import { QuizPlayer } from "@/components/documents/quiz-player";
import type { ReaderItem } from "@/lib/validations/reader";
import { quizAttemptReceiptSchema, quizAttemptStatusSchema, type QuizAttemptStatus } from "@/lib/validations/quiz-attempt";
export function ReaderQuiz({ quiz, endpoint, privateTest, active }: { quiz: NonNullable<ReaderItem["quiz"]>; endpoint: string; privateTest: boolean; active: boolean }) {
  const [status, setStatus] = useState<QuizAttemptStatus | null>(null), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const operation = useRef<{ key: string; id: string } | null>(null), url = `${endpoint}/quizzes/${quiz.id}/attempts`;
  useEffect(() => {
    if (!active || status) return;
    const controller = new AbortController();
    void (async () => { try { const response = await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }), body = await response.json();
      if (!response.ok) throw Error(body.message ?? "No fue posible consultar tus intentos."); const parsed = quizAttemptStatusSchema.safeParse(body);
      if (!parsed.success || parsed.data.allowRetries !== quiz.allowRetries || parsed.data.latest && (parsed.data.latest.privateTest !== privateTest || parsed.data.latest.feedback.total !== quiz.questions.length)) throw Error("No fue posible verificar el resultado guardado. Actualiza la lectura.");
      if (!controller.signal.aborted) { setStatus(parsed.data); setError(""); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error && e.name !== "TypeError" ? e.message : "No fue posible conectar para consultar tus intentos."); } })();
    return () => controller.abort();
  }, [active, status, refresh, url, quiz.allowRetries, quiz.questions.length, privateTest]);
  return <div className="mt-4 space-y-3">
    {privateTest && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold">Ensayo privado guardado aparte. No cuenta como intento ni resultado real de lector.</p>}
    <button type="button" onClick={() => { setStatus(null); setError(""); operation.current = null; setRefresh(n => n + 1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Actualizar mis intentos</button>
    {error && <p role="alert" className="break-words text-sm text-red-800">{error}</p>}
    {!status && !error && <p role="status">Consultando tus intentos…</p>}
    {status && <><p className="text-sm">{status.latest ? `Intento ${status.latest.number} guardado · ${new Date(status.latest.createdAt).toLocaleString("es")}` : "Aún no has enviado un intento en esta versión."}</p>
      <QuizPlayer key={`${quiz.id}-${refresh}`} quiz={quiz} initialResult={status.latest} onRetry={() => { operation.current = null; }} onSubmit={async answers => {
        const key = JSON.stringify(answers); if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ operationId: operation.current.id, answers }) });
        const body = await response.json(); if (!response.ok) throw Error(body.message ?? "No se pudo confirmar el intento. Reintenta sin cambiar las respuestas.");
        const parsed = quizAttemptReceiptSchema.safeParse(body.receipt);
        if (!parsed.success || parsed.data.privateTest !== privateTest || parsed.data.feedback.total !== quiz.questions.length) throw Error("No se pudo verificar el resultado. Actualiza tus intentos.");
        setStatus(previous => previous ? { ...previous, latest: parsed.data, attempts: parsed.data.number } : null); return parsed.data.feedback;
      }} />
    </>}
  </div>;
}
