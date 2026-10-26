import type { DocumentFragmentSelection } from "./fragment-selection";
import type { TextExtractionResult } from "./extract-selection-text";

export type SelectionTextContext = {
  documentId: string;
  pageNumber: number;
  fragment: DocumentFragmentSelection | null;
};
export type SelectionTextDraft = SelectionTextContext & {
  requestId: number | null;
  status: "loading" | TextExtractionResult["status"];
  source: "digital" | "manual";
  originalText: string;
  text: string;
  confirmed: boolean;
};

export function selectionTextKey(context: SelectionTextContext): string {
  return JSON.stringify([context.documentId, context.pageNumber, context.fragment]);
}

export function beginTextExtraction(context: SelectionTextContext, requestId: number): SelectionTextDraft {
  return { ...structuredClone(context), requestId, status: "loading", source: "digital", originalText: "", text: "", confirmed: false };
}

export function finishTextExtraction(previous: SelectionTextDraft | null, requestId: number, result: TextExtractionResult): SelectionTextDraft | null {
  // A page/selection change, a newer extraction or typing cancels the older result.
  if (!previous || previous.requestId !== requestId || previous.status !== "loading") return previous;
  return { ...previous, ...result, requestId: null, source: result.status === "ready" ? "digital" : "manual", originalText: result.text };
}

export function editSelectionText(context: SelectionTextContext, previous: SelectionTextDraft | null, text: string): SelectionTextDraft {
  const draft = previous && selectionTextKey(previous) === selectionTextKey(context)
    ? previous : { ...beginTextExtraction(context, 0), status: "empty" as const, source: "manual" as const };
  return { ...draft, requestId: null, status: draft.status === "loading" ? "empty" : draft.status,
    source: draft.originalText ? "digital" : "manual", text, confirmed: false };
}

export function confirmSelectionText(draft: SelectionTextDraft | null): SelectionTextDraft | null {
  if (!draft || draft.status === "loading" || !draft.documentId || !Number.isInteger(draft.pageNumber) || draft.pageNumber < 1
    || (draft.fragment && (draft.fragment.documentId !== draft.documentId || draft.fragment.pageNumber !== draft.pageNumber))) return draft;
  const text = draft.text.trim();
  return { ...draft, text, confirmed: Boolean(text) };
}
