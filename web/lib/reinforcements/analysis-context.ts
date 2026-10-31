import type { RequestRecord } from "@/lib/validations/request-list";
import { analysisContextSchema, type AnalysisContext } from "@/lib/validations/contextual-analysis";

const clean = (text: string) => text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();

// Only the saved selection and the same PDF page are inputs. User names,
// project titles, other documents and application metadata never enter the prompt.
export function buildAnalysisContext(request: RequestRecord, pageText: string, areaText: string, pdfSha256: string): AnalysisContext {
  const selected = clean(request.selected_text), page = clean(pageText), area = clean(areaText);
  const source = area || page;
  const at = source.indexOf(selected);
  const nearby = at >= 0 ? `${source.slice(Math.max(0, at - 2500), at)} ${source.slice(at + selected.length, at + selected.length + 2500)}`.trim() : area || page;
  const nearbyText = nearby.slice(0, 6000);
  // This is a conservative, local minimum, not a semantic diagnosis. The model
  // must still report insufficient/ambiguous context in its structured response.
  const useful = `${selected} ${nearbyText}`.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return analysisContextSchema.parse({ pageNumber: request.page_number, selectedText: request.selected_text,
    textSource: request.text_source, need: request.need, category: request.category, nearbyText,
    nearbySource: nearbyText ? at >= 0 || area ? "selection" : "page" : "none",
    pdfSha256, enough: useful >= 32, truncated: nearby.length > 6000 || page.length > 120000 });
}
