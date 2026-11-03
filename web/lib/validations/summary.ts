import { z } from "zod";
import { explanationRecordSchema } from "@/lib/validations/explanation";
import { reviewHeadSchema, reviewVersionSchema, reviewEventSchema } from "@/lib/validations/example";
import type { AnalysisContext, ContextDiagnosis } from "@/lib/validations/contextual-analysis";

export const SUMMARY_MODES = ["compact", "brief"] as const;
export type SummaryMode = typeof SUMMARY_MODES[number];
export const SUMMARY_LIMITS = { compact: 350, brief: 700 };
export const SUMMARY_LABELS = { compact: "Muy breve · máximo 350 caracteres", brief: "Breve · máximo 700 caracteres" };
export const conceptSchema = z.object({ name: z.string().trim().min(2).max(80), sourceQuote: z.string().trim().min(8).max(500) }).strict();
export const summaryContentSchema = z.object({ title: z.string().trim().min(3).max(160), text: z.string().trim().min(80).max(700),
  concepts: z.array(conceptSchema).min(1).max(8), sourceQuote: z.string().trim().min(8).max(500),
  topicReference: z.string().trim().min(3).max(200), consistentWithSource: z.boolean() }).strict();
export type SummaryContent = z.infer<typeof summaryContentSchema>;
export type SummaryConcept = z.infer<typeof conceptSchema>;
export const normalizeConcept = (text: string) => text.toLocaleLowerCase("es").replace(/[áéíóúüñ]/g, char => ({á:"a",é:"e",í:"i",ó:"o",ú:"u",ü:"u",ñ:"n"} as Record<string,string>)[char]).replace(/\s+/g," ").trim();
export function cleanConcepts(input: unknown, context: AnalysisContext) {
  const raw = z.array(z.object({ name: z.string().max(80), sourceQuote: z.string().max(500) }).strict()).max(12).parse(input);
  const seen = new Set<string>(), result: SummaryConcept[] = [];
  for (const candidate of raw) {
    if (!candidate.name.trim()) continue;
    const concept = conceptSchema.parse(candidate), key = normalizeConcept(concept.name);
    if (!(context.selectedText.includes(concept.sourceQuote) || context.nearbyText.includes(concept.sourceQuote))
      || !normalizeConcept(concept.sourceQuote).includes(key)) throw Error("Concept is not supported by its literal source");
    if (!seen.has(key)) { seen.add(key); result.push(concept); }
  }
  return z.array(conceptSchema).min(1).max(8).parse(result);
}
export function validateSummary(value: unknown, context: AnalysisContext, diagnosis: ContextDiagnosis, mode: SummaryMode) {
  const raw = z.object({ concepts: z.unknown() }).passthrough().parse(value);
  const output = summaryContentSchema.parse({ ...raw, concepts: cleanConcepts(raw.concepts, context) });
  if (!context.enough || !diagnosis.sufficient || !output.consistentWithSource || output.text.length > SUMMARY_LIMITS[mode]
    || !context.selectedText.includes(output.sourceQuote) || output.topicReference !== diagnosis.topic) throw Error("Summary does not match its source or configured length");
  return output;
}
export const SUMMARY_FAILURES = ["provider_unavailable", "provider_refused", "invalid_summary", "timeout"] as const;
export type SummaryFailureCode = typeof SUMMARY_FAILURES[number];
export const SUMMARY_MESSAGES: Record<SummaryFailureCode, string> = {
  provider_unavailable: "El servicio de IA no está disponible o se agotó su cuota. Espera antes de reintentar; no se cambiará de proveedor automáticamente.",
  provider_refused: "No fue posible resumir este contenido. Revisa la selección y su dificultad.",
  invalid_summary: "El resumen o sus conceptos no pudieron verificarse con el PDF. No se publicaron; puedes reintentar.",
  timeout: "La generación agotó su tiempo. Puedes reintentar sin publicar contenido incompleto.",
};
export const summaryRecordSchema = explanationRecordSchema.omit({ detail_level: true }).extend({ mode: z.enum(SUMMARY_MODES), content: summaryContentSchema.nullable(), error_code: z.enum(SUMMARY_FAILURES).nullable() });
export const summaryVersionSchema = reviewVersionSchema.extend({ summary_content: summaryContentSchema.nullable() });
export const summaryViewSchema = z.object({ generation: summaryRecordSchema.nullable(), choiceVersion: z.number().int().nonnegative(),
  summaryChosen: z.boolean(), providerAvailable: z.boolean(), canConfigure: z.boolean(), canGenerate: z.boolean(),
  review: reviewHeadSchema.nullable(), versions: z.array(summaryVersionSchema).max(20), events: z.array(reviewEventSchema).max(20) });
export type SummaryView = z.infer<typeof summaryViewSchema>;
const common = { documentId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), choiceVersion: z.number().int().positive() };
export const summaryInputSchema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("configure"), mode: z.enum(SUMMARY_MODES) }).strict(),
  z.object({ ...common, action: z.literal("generate") }).strict(),
]);
const reviewCommon = { documentId: z.string().uuid(), expectedVersion: z.number().int().positive(), operationId: z.string().uuid() };
export const summaryReviewInputSchema = z.discriminatedUnion("action", [
  z.object({ ...reviewCommon, action: z.literal("edit"), title: z.string().trim().min(3).max(160), text: z.string().trim().min(80).max(700), concepts: z.array(z.object({name:z.string().max(80),sourceQuote:z.string().max(500)}).strict()).max(12) }).strict(),
  z.object({ ...reviewCommon, action: z.literal("approve"), confirmed: z.literal(true) }).strict(),
  z.object({ ...reviewCommon, action: z.literal("discard") }).strict(),
]);
