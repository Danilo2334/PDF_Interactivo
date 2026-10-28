import { z } from "zod";
import type { AnalysisContext, ContextDiagnosis } from "@/lib/validations/contextual-analysis";

export const DETAIL_LEVELS = ["brief", "intermediate", "detailed"] as const;
export type DetailLevel = typeof DETAIL_LEVELS[number];
export const DETAIL_LABELS: Record<DetailLevel, string> = { brief: "Breve", intermediate: "Intermedio", detailed: "Detallado" };
export const DETAIL_DESCRIPTIONS: Record<DetailLevel, string> = {
  brief: "La idea principal en uno o dos párrafos cortos.",
  intermediate: "El concepto y sus relaciones, con una aclaración práctica.",
  detailed: "Desarrollo paso a paso, con conexiones y límites del concepto.",
};
export const EXPLANATION_LIMITS = { brief: { min: 80, max: 1200 }, intermediate: { min: 180, max: 3000 }, detailed: { min: 350, max: 6000 } };
export const EXPLANATION_FAILURES = ["provider_unavailable", "provider_refused", "invalid_explanation", "timeout"] as const;
export type ExplanationFailureCode = typeof EXPLANATION_FAILURES[number];
export const EXPLANATION_MESSAGES: Record<ExplanationFailureCode, string> = {
  provider_unavailable: "Gemini no está disponible o su cuota gratuita se agotó. Espera antes de reintentar; no se usará un proveedor de pago.",
  provider_refused: "No fue posible generar una explicación para este contenido. Revisa el fragmento y la dificultad.",
  invalid_explanation: "La explicación recibida no pudo verificarse. No se guardó contenido incompleto; puedes reintentar.",
  timeout: "La generación tardó demasiado. Puedes reintentar; no se publicará un resultado incompleto.",
};
export const explanationContentSchema = z.object({
  title: z.string().trim().min(3).max(160), text: z.string().trim().min(80).max(6000),
  sourceQuote: z.string().trim().min(8).max(500), topicReference: z.string().trim().min(3).max(200),
}).strict();
export type ExplanationContent = z.infer<typeof explanationContentSchema>;
export function validateExplanation(value: unknown, context: AnalysisContext, diagnosis: ContextDiagnosis, level: DetailLevel) {
  const output = explanationContentSchema.parse(value), limits = EXPLANATION_LIMITS[level];
  const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!context.enough || !diagnosis.sufficient || output.text.length < limits.min || output.text.length > limits.max
    // Match the transaction's literal checks before attempting persistence.
    || !context.selectedText.includes(output.sourceQuote)
    || output.topicReference !== diagnosis.topic
    || !diagnosis.concepts.some(concept => normalize(output.text).toLocaleLowerCase("es").includes(normalize(concept).toLocaleLowerCase("es"))))
    throw Error("Explanation does not match the saved source, topic or detail level");
  return output;
}
export const explanationRecordSchema = z.object({
  request_id: z.string().uuid(), detail_level: z.enum(DETAIL_LEVELS), version: z.number().int().positive(),
  status: z.enum(["draft", "processing", "ready", "error"]), approval_status: z.literal("pending"),
  attempt_id: z.string().uuid().nullable(), analysis_attempt_id: z.string().uuid().nullable(), choice_version: z.number().int().nonnegative(),
  content: explanationContentSchema.nullable(), model: z.string().nullable(), error_code: z.enum(EXPLANATION_FAILURES).nullable(),
  started_at: z.string().datetime({ offset: true }).nullable(), updated_at: z.string().datetime({ offset: true }),
  lease_expires_at: z.string().datetime({ offset: true }).nullable(), finished_at: z.string().datetime({ offset: true }).nullable(), attempts: z.number().int().nonnegative(),
});
export type ExplanationRecord = z.infer<typeof explanationRecordSchema>;
export const explanationViewSchema = z.object({ generation: explanationRecordSchema.nullable(), choiceVersion: z.number().int().nonnegative(),
  canConfigure: z.boolean(), canGenerate: z.boolean(), providerAvailable: z.boolean(), explanationChosen: z.boolean() });
export type ExplanationView = z.infer<typeof explanationViewSchema>;
const commonInput = { documentId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), choiceVersion: z.number().int().positive() };
export const explanationInputSchema = z.discriminatedUnion("action", [
  z.object({ ...commonInput, action: z.literal("configure"), level: z.enum(DETAIL_LEVELS) }).strict(),
  z.object({ ...commonInput, action: z.literal("generate") }).strict(),
]);
