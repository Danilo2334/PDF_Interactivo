"use client";
import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { ReinforcementCard } from "@/components/documents/reinforcement-card";
import { QuizPlayer } from "@/components/documents/quiz-player";
import { experiencePreviewSchema, quizFeedbackSchema, type ExperiencePreview } from "@/lib/validations/experience-preview";
export function ExperiencePreview({ projectId, documentId, initialPage, onClose }: { projectId: string; documentId: string; initialPage: number; onClose: () => void }) {
  const id = useId(), [view, setView] = useState<ExperiencePreview | null>(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(initialPage), [panel, setPanel] = useState(false), [navigation, setNavigation] = useState({ page: initialPage, key: 0 });
  const pdfPanel = useRef<HTMLDivElement>(null), reinforcementPanel = useRef<HTMLElement>(null);
  const readingPosition = useRef<{ x: number; y: number; page: number; horizontal: number } | null>(null);
  const reportPage = useCallback((page: number) => setPage(page), []);
  function changePanel(next: boolean, currentPage = page) {
    if (next === panel) return;
    if (next) {
      const figure = pdfPanel.current?.querySelector<HTMLElement>(`[data-pdf-page="${currentPage}"]`);
      readingPosition.current = { x: window.scrollX, y: window.scrollY, page: currentPage, horizontal: figure?.scrollLeft ?? 0 };
    }
    setPanel(next);
  }
  useLayoutEffect(() => {
    const position = readingPosition.current;
    if (!panel && position) {
      const figure = pdfPanel.current?.querySelector<HTMLElement>(`[data-pdf-page="${position.page}"]`);
      if (figure) figure.scrollLeft = position.horizontal;
      window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
    } else if (panel) {
      reinforcementPanel.current?.scrollIntoView({ block: "start", behavior: "instant" });
      reinforcementPanel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
  }, [panel]);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => { try { const response = await fetch(`/api/projects/${projectId}/preview?documentId=${documentId}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) }); const body = await response.json();
      if (!response.ok) throw Error(typeof body.message === "string" ? body.message : "No fue posible abrir la vista previa.");
      const parsed = experiencePreviewSchema.safeParse(body); if (!parsed.success) throw Error("No fue posible validar el contenido actual. Regresa al editor y reintenta.");
      if (parsed.data.projectId !== projectId || parsed.data.documentId !== documentId) throw Error("El documento cambió. Regresa al editor.");
      if (!controller.signal.aborted) { setView(parsed.data); setError(""); }
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error && error.name === "TimeoutError" ? "La vista previa tardó demasiado. Reintenta." : error instanceof Error ? error.message : "No fue posible abrir la vista previa."); } })();
    return () => controller.abort();
  }, [projectId, documentId, attempt]);
  return <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-4">
    <div className="space-y-2 rounded-lg border border-blue-300 bg-blue-50 p-4">
      <h1 id={`${id}-title`} className="text-xl font-bold">Vista previa privada{view ? ` · ${view.name}` : ""}</h1>
      <p className="text-sm">Revisa los cambios guardados. Los borradores se muestran solo para ti; publicar incluirá únicamente versiones aprobadas. Tus formularios sin guardar se conservan al volver al editor.</p>
      <p className="text-sm font-semibold">Las respuestas de prueba no registran intentos ni resultados reales de lectores.</p>
      <button type="button" onClick={onClose} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Volver a edición</button>
    </div>
    {error && <div role="alert"><p className="break-words">{error}</p><button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }} className="rounded-lg border px-3 py-2">Reintentar vista previa</button></div>}
    {!view && !error && <p role="status">Cargando el contenido actual del proyecto…</p>}
    {view && <>
      <div role="group" aria-label="Secciones de la vista previa" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!panel} onClick={() => changePanel(false)} className="rounded-lg border px-3 py-2">PDF original</button>
        <button type="button" aria-pressed={panel} onClick={() => changePanel(true)} className="rounded-lg border px-3 py-2">Refuerzos</button>
      </div>
      <div ref={pdfPanel} hidden={panel}><PdfViewer projectId={projectId} visible={!panel} initialPage={navigation.page} navigationKey={navigation.key} onVisiblePageChange={reportPage}
        onOpenReinforcements={(page) => { setPage(page); changePanel(true, page); }} /></div>
      <section ref={reinforcementPanel} hidden={!panel} aria-labelledby={`${id}-page`} className="space-y-4">
        <button type="button" onClick={() => changePanel(false)} className="rounded-lg border px-3 py-2">Cerrar refuerzos y volver al PDF</button>
        <h2 id={`${id}-page`} className="text-lg font-semibold">Refuerzos de la página {page}</h2>
        {!view.items.some(item => item.reinforcement.page_number === page) && <p>Esta página todavía no tiene refuerzos para consultar en vista previa.</p>}
        {view.items.filter(item => item.reinforcement.page_number === page).map(item => <ReinforcementCard key={`${item.reinforcement.id}-${item.sourceVersionId}`} reinforcement={item.reinforcement} projectId={projectId} canManage={false}
          reviewLabel={item.state === "draft" ? "Borrador privado · Sin aprobar" : "Contenido aprobado por el propietario"}
          onSource={source => { readingPosition.current = null; setNavigation(previous => ({ page: source.page_number, key: previous.key + 1 })); setPanel(false); }}
          quizContent={item.quiz && item.sourceVersionId && item.reinforcement.source_request_id ? <div className="mt-4">
            <p className="text-xs font-semibold">{item.quizState === "draft" ? "Quiz en borrador privado · Sin aprobar" : "Quiz aprobado"} · Versión {item.quiz.version}</p>
            <QuizPlayer key={item.quiz.id} quiz={item.quiz} onSubmit={async answers => {
              const response = await fetch(`/api/projects/${projectId}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30000),
                body: JSON.stringify({ documentId, requestId: item.reinforcement.source_request_id, sourceVersionId: item.sourceVersionId, quizVersionId: item.quiz!.id, answers }) });
              const body = await response.json(); if (!response.ok) throw Error(body.message ?? "No fue posible comprobar las respuestas."); return quizFeedbackSchema.parse(body.feedback);
            }} /></div> : null} />)}
      </section>
    </>}
  </section>;
}
