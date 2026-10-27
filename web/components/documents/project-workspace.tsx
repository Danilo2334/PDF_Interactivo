"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfViewer } from "@/components/documents/pdf-viewer";
import { ReinforcementRequestDraft, type PageSelection } from "@/components/documents/reinforcement-request-draft";
import type { Reinforcement } from "@/lib/types/reinforcement";
import type { DocumentFragmentSelection, FragmentSelection } from "@/lib/pdf/fragment-selection";
import { createDifficultyDraft, EMPTY_DIFFICULTY_INPUT, type DifficultyDraft, type DifficultyInput } from "@/lib/validations/difficulty";
import { extractSelectionText } from "@/lib/pdf/extract-selection-text";
import { beginTextExtraction, confirmSelectionText, editSelectionText, finishTextExtraction, selectionTextKey, type SelectionTextDraft } from "@/lib/pdf/selection-text-draft";

type WorkspaceProps = {
  projectId: string;
  documentId: string;
  documentName: string;
  canRequestReinforcement: boolean;
  reinforcements: Reinforcement[];
  reinforcementsError: boolean;
};

const sections = [
  { id: "pdf", label: "PDF original" },
  { id: "reinforcements", label: "Refuerzos" },
] as const;

export function ProjectWorkspace({
  projectId,
  documentId,
  documentName,
  canRequestReinforcement,
  reinforcements,
  reinforcementsError,
}: WorkspaceProps) {
  const [activeSection, setActiveSection] =
    useState<"pdf" | "reinforcements">("pdf");

  const workspaceId = useId();
  const [selection, setSelection] = useState<PageSelection | null>(null);
  const [fragment, setFragment] = useState<DocumentFragmentSelection | null>(null);
  const [fragmentResetKey, setFragmentResetKey] = useState(0);
  const [difficultyInput, setDifficultyInput] = useState<(PageSelection & DifficultyInput) | null>(null);
  const [difficultyDraft, setDifficultyDraft] = useState<DifficultyDraft | null>(null);
  const [selectionText, setSelectionText] = useState<SelectionTextDraft | null>(null);
  const textRequestId = useRef(0);
  const pdfSource = useRef<{ documentId: string; pdf: PDFDocumentProxy } | null>(null);
  const draft = selection?.documentId === documentId ? selection : null;
  const currentFragment = fragment?.documentId === documentId && fragment.pageNumber === draft?.pageNumber ? fragment : null;
  const currentDifficultyInput = difficultyInput?.documentId === documentId && difficultyInput.pageNumber === draft?.pageNumber ? difficultyInput : EMPTY_DIFFICULTY_INPUT;
  const currentDifficulty = difficultyDraft?.documentId === documentId && difficultyDraft.pageNumber === draft?.pageNumber ? difficultyDraft : null;
  const textContext = draft ? { ...draft, fragment: currentFragment } : null;
  const currentText = textContext && selectionText && selectionTextKey(selectionText) === selectionTextKey(textContext) ? selectionText : null;
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
    <div className="mt-8 min-w-0">
      <div
        role="group"
        aria-label="Secciones del proyecto"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={activeSection === section.id}
            aria-controls={`${workspaceId}-${section.id}`}
            onClick={() => setActiveSection(section.id)}
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

      <div
        id={`${workspaceId}-pdf`}
        hidden={activeSection !== "pdf"}
      >
        {activeSection === "pdf" && (
          <PdfViewer key={`${projectId}-${documentId}`} projectId={projectId}
            initialPage={draft?.pageNumber ?? 1} onPageSelect={canRequestReinforcement ? selectPage : undefined}
            onFragmentSelect={canRequestReinforcement ? selectFragment : undefined} fragmentResetKey={fragmentResetKey}
            onTextSourceChange={canRequestReinforcement ? receiveTextSource : undefined}
            requestDraft={canRequestReinforcement ? <ReinforcementRequestDraft
              key={documentId} documentId={documentId} documentName={documentName} selection={draft}
              fragment={currentFragment} onClearSelection={clearFragment}
              difficultyInput={currentDifficultyInput} difficultyDraft={currentDifficulty}
              onDifficultyChange={changeDifficulty} onConfirmDifficulty={confirmDifficulty}
              selectionText={currentText} onExtractText={extractText} onTextChange={changeText} onConfirmText={confirmText}
            /> : null} />
        )}
      </div>

      <section
        id={`${workspaceId}-reinforcements`}
        hidden={activeSection !== "reinforcements"}
        data-document-id={documentId}
        className="mt-6"
      >
        <h2 className="text-xl font-semibold text-slate-900">
          Refuerzos del documento
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
        ) : reinforcements.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Este documento todavía no tiene refuerzos.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {reinforcements.map((reinforcement) => (
              <article
                key={reinforcement.id}
                data-page-number={reinforcement.page_number}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <p className="text-sm font-medium text-blue-700">
                  Página {reinforcement.page_number}
                </p>

                <h3 className="mt-2 break-words font-semibold text-slate-900">
                  {reinforcement.title}
                </h3>

                {typeof reinforcement.content.text === "string" && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">
                    {reinforcement.content.text}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
