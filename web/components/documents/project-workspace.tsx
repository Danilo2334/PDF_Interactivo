"use client";

import { useCallback, useLayoutEffect, useId, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { ReinforcementRequestDraft, type PageSelection } from "@/components/documents/reinforcement-request-draft";
import type { Reinforcement } from "@/lib/types/reinforcement";
import type { DocumentFragmentSelection, FragmentSelection } from "@/lib/pdf/fragment-selection";
import { createDifficultyDraft, EMPTY_DIFFICULTY_INPUT, type DifficultyDraft, type DifficultyInput } from "@/lib/validations/difficulty";
import { extractSelectionText } from "@/lib/pdf/extract-selection-text";
import { beginTextExtraction, confirmSelectionText, editSelectionText, finishTextExtraction, selectionTextKey, type SelectionTextDraft } from "@/lib/pdf/selection-text-draft";
import { contentFromDraft, requestContentKey } from "@/lib/validations/reinforcement-request";
import { createSubmissionController, IDLE_SUBMISSION, type SubmissionState } from "@/lib/reinforcements/submission";
import { RequestListPanel } from "@/components/documents/request-list-panel";
import type { RequestRecord } from "@/lib/validations/request-list";
import { ReinforcementCard } from "@/components/documents/reinforcement-card";
import { ExperiencePreview } from "@/components/documents/experience-preview";
import { PublicationPanel } from "@/components/documents/publication-panel";
import { VisitTotalsPanel } from "@/components/documents/visit-totals-panel";
import { ReinforcementUsagePanel } from "@/components/documents/reinforcement-usage-panel";
import { QuizResultsPanel } from "@/components/documents/quiz-results-panel";

type WorkspaceProps = {
  projectId: string;
  documentId: string;
  documentName: string;
  canRequestReinforcement: boolean;
  reinforcements: Reinforcement[];
  reinforcementsError: boolean;
  editorHeader?: ReactNode;
};

const sections = [
  { id: "pdf", label: "PDF original" },
  { id: "requests", label: "Solicitudes" },
  { id: "reinforcements", label: "Refuerzos" },
] as const;

export function ProjectWorkspace({
  projectId,
  documentId,
  documentName,
  canRequestReinforcement,
  reinforcements,
  reinforcementsError,
  editorHeader,
}: WorkspaceProps) {
  const [activeSection, setActiveSection] =
    useState<"pdf" | "requests" | "reinforcements">("pdf");

  const workspaceId = useId();
  const guideRef = useRef<HTMLHeadingElement>(null);
  const requestsPanelRef = useRef<HTMLElement>(null);
  const [guideTarget, setGuideTarget] = useState<{ section: typeof activeSection; visit: number } | null>(null);
  const followedGuideTarget = useRef<typeof guideTarget>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationDocument, setPublicationDocument] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const previewButton = useRef<HTMLButtonElement>(null);
  const previewPosition = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (previewOpen) { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); return; }
    if (previewPosition.current) {
      window.scrollTo({ top: previewPosition.current.y, left: previewPosition.current.x, behavior: "instant" });
      previewButton.current?.focus({ preventScroll: true });
    }
  }, [previewOpen]);
  const [selection, setSelection] = useState<PageSelection | null>(null);
  const [fragment, setFragment] = useState<DocumentFragmentSelection | null>(null);
  const [fragmentResetKey, setFragmentResetKey] = useState(0);
  const [difficultyInput, setDifficultyInput] = useState<(PageSelection & DifficultyInput) | null>(null);
  const [difficultyDraft, setDifficultyDraft] = useState<DifficultyDraft | null>(null);
  const [selectionText, setSelectionText] = useState<SelectionTextDraft | null>(null);
  const textRequestId = useRef(0);
  const pdfSource = useRef<{ documentId: string; pdf: PDFDocumentProxy } | null>(null);
  const [submission, setSubmission] = useState<SubmissionState>(IDLE_SUBMISSION);
  const [openedRequest, setOpenedRequest] = useState<RequestRecord | null>(null);
  const [continuation, setContinuation] = useState<{ documentId: string; id: string; version: number } | null>(null);
  const continueRequestId = continuation?.documentId === documentId ? continuation.id : null;
  const [navigationKey, setNavigationKey] = useState(0);
  const [readingPage, setReadingPage] = useState<{ documentId: string; number: number } | null>(null);
  const activePage = readingPage?.documentId === documentId ? readingPage.number : 1;
  const pdfPanelRef = useRef<HTMLDivElement>(null), reinforcementPanelRef = useRef<HTMLElement>(null);
  const readingPosition = useRef<{ documentId: string; x: number; y: number; page: number; horizontal: number } | null>(null);
  const panelStart = useRef<number | null>(null);
  function changeSection(section: typeof activeSection, openedAt: number | null = null, page = activePage) {
    if (section === activeSection) return;
    if (activeSection === "pdf" && typeof window !== "undefined") {
      const figure = pdfPanelRef.current?.querySelector<HTMLElement>(`[data-pdf-page="${page}"]`);
      readingPosition.current = { documentId, x: window.scrollX, y: window.scrollY, page, horizontal: figure?.scrollLeft ?? 0 };
    }
    if (section === "reinforcements") panelStart.current = openedAt;
    setActiveSection(section);
  }
  useLayoutEffect(() => {
    const position = readingPosition.current;
    if (activeSection === "pdf" && position?.documentId === documentId && typeof window !== "undefined") {
      const figure = pdfPanelRef.current?.querySelector<HTMLElement>(`[data-pdf-page="${position.page}"]`);
      if (figure) figure.scrollLeft = position.horizontal;
      window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
      Array.from(pdfPanelRef.current?.querySelectorAll<HTMLButtonElement>("[data-open-reinforcements]") ?? [])
        .find(button => button.getClientRects().length > 0)?.focus({ preventScroll: true });
    }
    if (activeSection !== "reinforcements" || panelStart.current === null) return;
    const started = panelStart.current, panel = reinforcementPanelRef.current;
    if (panel) {
      panel.dataset.panelReady = "false";
      panel.scrollIntoView({ block: "start", behavior: "instant" });
      panel.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (panel) { panel.dataset.openDurationMs = (performance.now() - started).toFixed(2); panel.dataset.panelReady = "true"; }
    }); });
    return () => cancelAnimationFrame(frame);
  }, [activeSection, documentId]);
  const reportReadingPage = useCallback((number: number) => setReadingPage(previous =>
    previous?.documentId === documentId && previous.number === number ? previous : { documentId, number }), [documentId]);
  useLayoutEffect(() => {
    if (!guideTarget || guideTarget === followedGuideTarget.current || guideTarget.section !== activeSection) return;
    followedGuideTarget.current = guideTarget;
    const panel = activeSection === "pdf" ? pdfPanelRef.current : activeSection === "requests" ? requestsPanelRef.current : reinforcementPanelRef.current;
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [guideTarget, activeSection]);
  function followGuide(section: typeof activeSection, openedAt: number) {
    changeSection(section, openedAt);
    setGuideTarget(previous => ({ section, visit: (previous?.visit ?? 0) + 1 }));
  }
  const pageReinforcements = reinforcements.filter(item => item.document_id === documentId && item.page_number === activePage);
  function openPreview() {
    previewPosition.current = { x: window.scrollX, y: window.scrollY }; setPreviewPage(activePage); setPreviewOpen(true);
  }
  const senderRef = useRef<ReturnType<typeof createSubmissionController> | null>(null);
  const draft = selection?.documentId === documentId ? selection : null;
  const currentFragment = fragment?.documentId === documentId && fragment.pageNumber === draft?.pageNumber ? fragment : null;
  const currentDifficultyInput = difficultyInput?.documentId === documentId && difficultyInput.pageNumber === draft?.pageNumber ? difficultyInput : EMPTY_DIFFICULTY_INPUT;
  const currentDifficulty = difficultyDraft?.documentId === documentId && difficultyDraft.pageNumber === draft?.pageNumber ? difficultyDraft : null;
  const textContext = draft ? { ...draft, fragment: currentFragment } : null;
  const currentText = textContext && selectionText && selectionTextKey(selectionText) === selectionTextKey(textContext) ? selectionText : null;
  const prepared = contentFromDraft(currentDifficulty, currentText);
  const contentKey = prepared.content ? requestContentKey(projectId, prepared.content) : null;
  const visibleSubmission = submission.status === "sending" || submission.contentKey === contentKey ? submission : IDLE_SUBMISSION;
  function sendRequest() {
    if (!canRequestReinforcement || !prepared.content) return;
    if (!senderRef.current) senderRef.current = createSubmissionController(setSubmission);
    void senderRef.current.send(projectId, prepared.content);
  }
  function resetRequest() {
    if (submission.status === "sending") return;
    senderRef.current?.reset();
    setDifficultyDraft(null);
    setSelectionText(previous => previous ? { ...previous, confirmed: false } : null);
  }
  function openRequest(request: RequestRecord) {
    if (!canRequestReinforcement || request.project_id !== projectId || request.document_id !== documentId) return;
    setSelection({ documentId, pageNumber: request.page_number });
    setFragment(request.selection);
    setDifficultyInput(null);
    setDifficultyDraft(null);
    setSelectionText(null);
    setOpenedRequest(request);
    setNavigationKey(value => value + 1);
    // A saved selection is an explicit navigation, rather than a return to the old scroll position.
    readingPosition.current = null;
    setActiveSection("pdf");
  }
  function openCardSource(item: Reinforcement) {
    const source = item.source;
    if (!source || source.id !== item.source_request_id || source.project_id !== projectId
      || source.document_id !== documentId || source.page_number !== item.page_number) return;
    setSelection({ documentId, pageNumber: source.page_number });
    setFragment(source.selection); setDifficultyInput(null); setDifficultyDraft(null); setSelectionText(null);
    setOpenedRequest(null); setNavigationKey(value => value + 1); readingPosition.current = null;
    setActiveSection("pdf");
  }
  const receiveTextSource = useCallback((pdf: PDFDocumentProxy | null) => {
    if (pdf) pdfSource.current = { documentId, pdf };
    else if (pdfSource.current?.documentId === documentId) pdfSource.current = null;
  }, [documentId]);
  const selectPage = useCallback((pageNumber: number | null) => {
    setDifficultyInput(previous => pageNumber === null || previous?.pageNumber === pageNumber ? previous : null);
    setDifficultyDraft(null);
    setFragment(previous => previous?.pageNumber === pageNumber ? previous : null);
    setSelectionText(previous => previous?.documentId === documentId && previous.pageNumber === pageNumber ? previous : null);
    setSelection(previous => {
      if (pageNumber === null) return null;
      if (!Number.isInteger(pageNumber) || pageNumber < 1) return previous;
      if (previous?.documentId === documentId && previous.pageNumber === pageNumber) return previous;
      return { documentId, pageNumber };
    });
  }, [documentId]);
  const selectFragment = useCallback((value: FragmentSelection | null) => {
    setFragment(value ? { ...value, documentId } : null);
    setDifficultyDraft(null);
    setSelectionText(previous => value && previous && selectionTextKey(previous) === selectionTextKey({ documentId, pageNumber: value.pageNumber, fragment: { ...value, documentId } }) ? previous : null);
  }, [documentId]);
  const clearFragment = useCallback(() => { setFragment(null); setDifficultyDraft(null); setSelectionText(null); setFragmentResetKey(value => value + 1); }, []);
  function changeDifficulty(value: DifficultyInput) {
    if (!draft) return;
    setDifficultyInput({ ...value, ...draft });
    setDifficultyDraft(null);
  }
  function confirmDifficulty() {
    if (!draft) return;
    setDifficultyDraft(createDifficultyDraft({ ...draft, fragment: currentFragment }, currentDifficultyInput));
  }
  async function extractText() {
    if (!textContext) return;
    const requestId = ++textRequestId.current;
    setSelectionText(beginTextExtraction(textContext, requestId));
    const source = pdfSource.current?.documentId === documentId ? pdfSource.current.pdf : null;
    const result = await extractSelectionText(source, textContext.pageNumber, textContext.fragment);
    setSelectionText(previous => finishTextExtraction(previous, requestId, result));
  }
  function changeText(text: string) {
    if (textContext) setSelectionText(previous => editSelectionText(textContext, previous, text));
  }
  function confirmText() {
    if (!textContext) return;
    setSelectionText(previous => previous && selectionTextKey(previous) === selectionTextKey(textContext) ? confirmSelectionText(previous) : previous);
  }

  return (
    <div className="student-workspace min-w-0">
      <div hidden={previewOpen}>
      {editorHeader}
      {canRequestReinforcement && <aside aria-label="Ruta para crear un refuerzo" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <h2 ref={guideRef} tabIndex={-1} className="text-lg font-semibold">Aprende con tu PDF, paso a paso</h2>
        <p className="mt-1 text-sm">Un refuerzo es una explicación, ejemplo, gráfico o actividad que te ayuda a entender un fragmento.</p>
        <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          {([
            { section: "pdf", title: "1. Elige qué entender", text: "Marca texto en el PDF y abre la solicitud. Confirma el texto y explica tu dificultad.", action: "Ir al PDF" },
            { section: "requests", title: "2. Trabaja con la IA", text: "Abre tu solicitud, analízala, elige un formato y genera. Revisa el borrador antes de aprobarlo.", action: "Ir a mis solicitudes" },
            { section: "reinforcements", title: "3. Utiliza tu refuerzo", text: "Consulta los aprobados de esta página. Si tienen mini quiz, elige tus respuestas y envíalas para ver tu puntaje.", action: "Ir a mis refuerzos" },
          ] as const).map(step => <li key={step.section} aria-current={activeSection === step.section ? "step" : undefined}
            className={`flex flex-col gap-2 rounded-lg border p-3 ${activeSection === step.section ? "border-blue-400 bg-white" : "border-blue-100"}`}>
            <strong>{step.title}</strong><p>{step.text}</p>
            <button type="button" aria-controls={`${workspaceId}-${step.section}`} onClick={() => followGuide(step.section, performance.now())}
              className="mt-auto flex min-h-11 items-center justify-between gap-2 rounded-lg bg-blue-700 px-3 py-2 text-left font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              {step.action}<span aria-hidden="true">→</span>
            </button>
          </li>)}
        </ol>
        <p role="status" className="mt-3 font-medium">{activeSection === "pdf" ? "Empieza aquí: busca abajo el fragmento que no entiendes y selecciónalo." : activeSection === "requests" ? "Continúa aquí: abre una solicitud para analizarla y crear tu refuerzo." : "Aquí consultas los refuerzos aprobados de la página actual."}</p>
      </aside>}
      {canRequestReinforcement && <details className="mt-3 rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer font-semibold text-slate-800">Compartir y consultar resultados (opcional)</summary>
        <p className="mt-2 text-sm text-slate-600">Úsalo después de preparar tus refuerzos, si quieres compartir la experiencia con otros lectores.</p>
        <PublicationPanel key={`publication-${documentId}`} projectId={projectId} documentId={documentId} onOpenChange={open => setPublicationDocument(open ? documentId : null)} />
        <VisitTotalsPanel key={`visits-${documentId}`} projectId={projectId} documentId={documentId} />
        <ReinforcementUsagePanel key={`usage-${documentId}`} projectId={projectId} documentId={documentId} />
        <QuizResultsPanel key={`quiz-results-${documentId}`} projectId={projectId} documentId={documentId} />
      </details>}
      <div className="mt-8 min-w-0">
      {canRequestReinforcement && activeSection !== "pdf" && <button ref={previewButton} type="button" disabled={submission.status === "sending"} onClick={openPreview}
        className="mb-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50">Vista previa de la experiencia</button>}
      <div
        role="group"
        aria-label="Secciones del proyecto"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {sections.filter(section => section.id !== "requests" || canRequestReinforcement).map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={activeSection === section.id}
            aria-controls={`${workspaceId}-${section.id}`}
            onClick={() => changeSection(section.id, performance.now())}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeSection === section.id
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {canRequestReinforcement && <button type="button" onClick={() => { guideRef.current?.focus({ preventScroll: true }); guideRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); }}
        className="mt-2 min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 underline underline-offset-4"><span aria-hidden="true">↑ </span>Volver a la guía de pasos</button>}

      <div
        id={`${workspaceId}-pdf`}
        ref={pdfPanelRef}
        tabIndex={-1}
        hidden={activeSection !== "pdf"}
      >
        {activeSection === "pdf" && openedRequest?.document_id === documentId && <aside className="mt-4 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
          <p className="font-semibold">Solicitud consultada · Página {openedRequest.page_number}</p>
          <p className="break-all">{openedRequest.id}</p>
          <details><summary className="cursor-pointer font-medium">Ver texto y necesidad guardados</summary>
            <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">{openedRequest.selected_text}</p>
            <p className="mt-2 break-words">{openedRequest.need}</p>
          </details>
          <button type="button" onClick={() => setActiveSection("requests")} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white">Volver a solicitudes</button>
        </aside>}
        {(
          <PdfViewer key={`${projectId}-${documentId}`} projectId={projectId}
            onOpenPreview={canRequestReinforcement && submission.status !== "sending" ? openPreview : undefined} previewTriggerRef={previewButton}
            visible={activeSection === "pdf" && !previewOpen} onVisiblePageChange={reportReadingPage} navigationKey={navigationKey}
            onOpenReinforcements={publicationDocument === documentId || currentFragment ? undefined : (page, openedAt) => { reportReadingPage(page); changeSection("reinforcements", openedAt, page); }}
            initialPage={draft?.pageNumber ?? 1} initialFragment={currentFragment} onPageSelect={canRequestReinforcement ? selectPage : undefined}
            onFragmentSelect={canRequestReinforcement ? selectFragment : undefined} fragmentResetKey={fragmentResetKey}
            onTextSourceChange={canRequestReinforcement ? receiveTextSource : undefined}
            requestDraft={canRequestReinforcement ? <ReinforcementRequestDraft
              key={documentId} documentId={documentId} documentName={documentName} selection={draft}
              fragment={currentFragment} onClearSelection={clearFragment}
              difficultyInput={currentDifficultyInput} difficultyDraft={currentDifficulty}
              onDifficultyChange={changeDifficulty} onConfirmDifficulty={confirmDifficulty}
              selectionText={currentText} onExtractText={extractText} onTextChange={changeText} onConfirmText={confirmText}
              submission={visibleSubmission} missing={prepared.missing} onSend={sendRequest} onResetRequest={resetRequest}
              onContinue={id => { setContinuation(previous => ({ documentId, id, version: (previous?.version ?? 0) + 1 })); setActiveSection("requests"); }}
            /> : null} />
        )}
      </div>

      {canRequestReinforcement && <section ref={requestsPanelRef} tabIndex={-1} id={`${workspaceId}-requests`} hidden={activeSection !== "requests"}>
        <RequestListPanel key={`${projectId}-${documentId}-${continueRequestId ?? "list"}-${continueRequestId ? continuation?.version : 0}`} projectId={projectId} documentId={documentId} initialRequestId={continueRequestId}
          active={activeSection === "requests" && !previewOpen} onOpen={openRequest} />
      </section>}

      <section
        id={`${workspaceId}-reinforcements`}
        ref={reinforcementPanelRef}
        tabIndex={-1}
        aria-labelledby={`${workspaceId}-reinforcement-title`}
        hidden={activeSection !== "reinforcements"}
        data-document-id={documentId}
        className="mt-6"
      >
        <button type="button" onClick={() => changeSection("pdf")} className="mb-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Cerrar refuerzos y volver al PDF</button>
        <h2 id={`${workspaceId}-reinforcement-title`} className="text-xl font-semibold text-slate-900">
          Refuerzos de la página {activePage}
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          El contenido adicional se muestra aquí y conserva la
          referencia a su página. Tu PDF original permanece intacto.
        </p>

        {reinforcementsError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            No fue posible consultar los refuerzos. Recarga la página
            para intentarlo nuevamente.
          </p>
        ) : pageReinforcements.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            La página {activePage} todavía no tiene refuerzos aprobados.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pageReinforcements.map((reinforcement) => (
              <ReinforcementCard key={`${reinforcement.id}-${reinforcement.card?.version ?? 0}-${reinforcement.approved_version_id ?? "legacy"}`}
                reinforcement={reinforcement} projectId={projectId} canManage={canRequestReinforcement} active={!previewOpen} onSource={openCardSource} />
            ))}
          </div>
        )}
      </section>
      </div>
      </div>
      {previewOpen && <ExperiencePreview projectId={projectId} documentId={documentId} initialPage={previewPage} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
