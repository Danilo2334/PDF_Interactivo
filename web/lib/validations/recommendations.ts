import { z } from "zod";
import type { AnalysisContext, ContextDiagnosis } from "@/lib/validations/contextual-analysis";

export const REINFORCEMENT_TYPES = ["explanation", "example", "summary", "image", "interaction"] as const;
export type ReinforcementType = typeof REINFORCEMENT_TYPES[number];
export const REINFORCEMENT_LABELS: Record<ReinforcementType, string> = {
  explanation: "Explicación", example: "Ejemplo", summary: "Resumen", image: "Imagen", interaction: "Elemento interactivo",
};
const candidateSchema = z.object({
  type: z.enum(REINFORCEMENT_TYPES), relevant: z.boolean(), topicFit: z.number().int().min(0).max(3), needFit: z.number().int().min(0).max(3),
  justification: z.string().trim().min(20).max(700), topicReference: z.string().max(200),
  sourceQuote: z.string().max(500), needQuote: z.string().max(500),
}).strict();
export const candidateResponseSchema = z.object({ candidates: z.array(candidateSchema).length(5) }).strict()
  .refine(value => new Set(value.candidates.map(c => c.type)).size === 5);
export const recommendationOptionSchema = candidateSchema.omit({ relevant: true }).extend({
  topicFit: z.number().int().min(2).max(3), needFit: z.number().int().min(2).max(3),
  topicReference: z.string().trim().min(1).max(200), sourceQuote: z.string().trim().min(8).max(500), needQuote: z.string().trim().min(8).max(500),
}).strict();
export type RecommendationOption = z.infer<typeof recommendationOptionSchema>;
const normalize = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();

// Scores are ordinal pertinence ratings, never confidence percentages. Require
// evidence in the saved topic, selection/page and difficulty before ranking.
export function rankRecommendations(value: unknown, context: AnalysisContext, diagnosis: ContextDiagnosis) {
  if (!context.enough || !diagnosis.sufficient) throw Error("A sufficient saved diagnosis is required");
  const parsed = candidateResponseSchema.parse(value);
  const topics = [diagnosis.topic, ...diagnosis.concepts].map(s => normalize(s).toLowerCase());
  const sources = [context.selectedText, context.nearbyText].map(normalize);
  const options: RecommendationOption[] = [];
  for (const candidate of parsed.candidates) {
    if (!candidate.relevant || candidate.topicFit < 2 || candidate.needFit < 2) continue;
    const { type, topicFit, needFit, justification, topicReference, sourceQuote, needQuote } = candidate;
    const checked = recommendationOptionSchema.parse({ type, topicFit, needFit, justification, topicReference, sourceQuote, needQuote });
    if (!topics.includes(normalize(checked.topicReference).toLowerCase())
      || normalize(checked.sourceQuote).length < 8 || normalize(checked.needQuote).length < 8
      || !sources.some(source => source.includes(normalize(checked.sourceQuote)))
      || !normalize(context.need).includes(normalize(checked.needQuote))) throw Error("Ungrounded recommendation");
    options.push(checked);
  }
  options.sort((a, b) => (b.needFit + b.topicFit) - (a.needFit + a.topicFit)
    || b.needFit - a.needFit || REINFORCEMENT_TYPES.indexOf(a.type) - REINFORCEMENT_TYPES.indexOf(b.type));
  return options;
}

export const RECOMMENDATION_FAILURES = ["provider_unavailable", "provider_refused", "invalid_recommendations", "timeout"] as const;
export type RecommendationFailureCode = typeof RECOMMENDATION_FAILURES[number];
export const RECOMMENDATION_MESSAGES: Record<RecommendationFailureCode, string> = {
  provider_unavailable: "Gemini no está disponible o su cuota gratuita se agotó. Espera antes de reintentar; no se usará un proveedor de pago.",
  provider_refused: "No fue posible recomendar un refuerzo para este contenido. Revisa la selección y tu dificultad.",
  invalid_recommendations: "Las recomendaciones recibidas no pudieron verificarse. Puedes reintentar.",
  timeout: "Las recomendaciones tardaron demasiado. Puedes reintentar sin repetir un resultado ya guardado.",
};
const date = z.string().datetime({ offset: true });
export const recommendationRecordSchema = z.object({
  request_id: z.string().uuid(), analysis_attempt_id: z.string().uuid(), attempt_id: z.string().uuid(),
  status: z.enum(["processing", "ready", "empty", "error"]), options: z.array(recommendationOptionSchema).max(5),
  empty_reason: z.string().nullable(), error_code: z.enum(RECOMMENDATION_FAILURES).nullable(), model: z.string().nullable(),
  started_at: date, updated_at: date, lease_expires_at: date, finished_at: date.nullable(), attempts: z.number().int().positive(),
}).refine(r => new Set(r.options.map(o => o.type)).size === r.options.length)
  .refine(r => r.status === "ready" ? r.options.length > 0 && r.error_code === null && r.finished_at !== null
    : r.options.length === 0 && (r.status !== "empty" || !!r.empty_reason?.trim()));
export type RecommendationRecord = z.infer<typeof recommendationRecordSchema>;
export const recommendationChoiceSchema = z.object({
  type: z.enum(REINFORCEMENT_TYPES), justification: z.string().min(20).max(700), attemptId: z.string().uuid(), selectedAt: date,
});
export const choiceReceiptSchema = z.object({ choice: recommendationChoiceSchema.nullable(), choiceVersion: z.number().int().nonnegative() });
export const recommendationViewSchema = choiceReceiptSchema.extend({
  recommendations: recommendationRecordSchema.nullable(), analysisReady: z.boolean(), providerAvailable: z.boolean(),
  canRecommend: z.boolean(), canChoose: z.boolean(),
});
export type RecommendationView = z.infer<typeof recommendationViewSchema>;
export const recommendationInputSchema = z.discriminatedUnion("action", [
  z.object({ documentId: z.string().uuid(), action: z.literal("recommend") }).strict(),
  z.object({ documentId: z.string().uuid(), action: z.literal("choose"), attemptId: z.string().uuid(),
    type: z.enum(REINFORCEMENT_TYPES), expectedVersion: z.number().int().min(0).max(2147483646) }).strict(),
]);
