import { z } from "zod";
import { explanationRecordSchema } from "@/lib/validations/explanation";
import type { AnalysisContext, ContextDiagnosis } from "@/lib/validations/contextual-analysis";

export const EXAMPLE_MODES = ["practical", "analogy"] as const;
export type ExampleMode = typeof EXAMPLE_MODES[number];
export const EXAMPLE_LABELS = { practical: "Ejemplo práctico", analogy: "Analogía" };
export const EXAMPLE_DESCRIPTIONS = { practical: "Una situación concreta que aplica el concepto.", analogy: "Una comparación familiar que aclara la idea y señala sus límites." };
export const EXAMPLE_FAILURES = ["provider_unavailable", "provider_refused", "invalid_example", "timeout"] as const;
export type ExampleFailureCode = typeof EXAMPLE_FAILURES[number];
export const EXAMPLE_MESSAGES: Record<ExampleFailureCode, string> = {
  provider_unavailable: "Gemini no está disponible o su cuota gratuita se agotó. Espera antes de reintentar; no se usará un proveedor de pago.",
  provider_refused: "No fue posible generar este contenido. Revisa la selección y la dificultad.",
  invalid_example: "La respuesta no pudo verificarse con el fragmento. No se guardó contenido incompleto; puedes reintentar.",
  timeout: "La generación tardó demasiado. Puedes reintentar; no se publicará un resultado incompleto.",
};
export const exampleContentSchema = z.object({ title: z.string().trim().min(3).max(160), text: z.string().trim().min(120).max(6000),
  sourceQuote: z.string().trim().min(8).max(500), topicReference: z.string().trim().min(3).max(200),
  relation: z.string().trim().min(20).max(1200), limitations: z.string().trim().min(20).max(1200), consistentWithSource: z.boolean() }).strict();
export type ExampleContent = z.infer<typeof exampleContentSchema>;
export function validateExample(value: unknown, context: AnalysisContext, diagnosis: ContextDiagnosis) {
  const result = exampleContentSchema.parse(value);
  if (!context.enough || !diagnosis.sufficient || !result.consistentWithSource || !context.selectedText.includes(result.sourceQuote)
    || result.topicReference !== diagnosis.topic || !diagnosis.concepts.some(c => result.text.toLocaleLowerCase("es").includes(c.toLocaleLowerCase("es"))))
    throw Error("Example does not match the saved source and diagnosis");
  return result;
}
export const exampleRecordSchema = explanationRecordSchema.omit({ detail_level: true }).extend({ mode: z.enum(EXAMPLE_MODES), content: exampleContentSchema.nullable(), error_code: z.enum(EXAMPLE_FAILURES).nullable() });
export const reviewHeadSchema = z.object({ request_id: z.string().uuid(), current_version: z.number().int().positive(), decision: z.enum(["pending", "approved", "discarded"]),
  approved_version_id: z.string().uuid().nullable(), approved_by: z.string().uuid().nullable(), approved_at: z.string().datetime({ offset: true }).nullable(), updated_at: z.string().datetime({ offset: true }) });
export const reviewVersionSchema = z.object({ id: z.string().uuid(), request_id: z.string().uuid(), version: z.number().int().positive(), origin: z.enum(["ai", "owner"]),
  title: z.string(), text: z.string(), actor_id: z.string().uuid(), created_at: z.string().datetime({ offset: true }) });
export const reviewEventSchema = z.object({ operation_id: z.string().uuid(), request_id: z.string().uuid(), version: z.number().int().positive(),
  action: z.enum(["edit", "approve", "discard", "regenerate"]), actor_id: z.string().uuid(), occurred_at: z.string().datetime({ offset: true }) });
export const exampleViewSchema = z.object({ generation: exampleRecordSchema.nullable(), choiceVersion: z.number().int().nonnegative(),
  canConfigure: z.boolean(), canGenerate: z.boolean(), providerAvailable: z.boolean(), exampleChosen: z.boolean(),
  review: reviewHeadSchema.nullable(), versions: z.array(reviewVersionSchema).max(20), events: z.array(reviewEventSchema).max(20) });
export type ExampleView = z.infer<typeof exampleViewSchema>;
const common = { documentId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), choiceVersion: z.number().int().positive() };
export const exampleInputSchema = z.discriminatedUnion("action", [z.object({ ...common, action: z.literal("configure"), mode: z.enum(EXAMPLE_MODES) }).strict(), z.object({ ...common, action: z.literal("generate") }).strict()]);
const reviewCommon = { documentId: z.string().uuid(), expectedVersion: z.number().int().positive(), operationId: z.string().uuid() };
export const reviewInputSchema = z.discriminatedUnion("action", [
  z.object({ ...reviewCommon, action: z.literal("edit"), title: z.string().trim().min(3).max(160), text: z.string().trim().min(80).max(6000) }).strict(),
  z.object({ ...reviewCommon, action: z.literal("approve"), confirmed: z.literal(true) }).strict(),
  z.object({ ...reviewCommon, action: z.literal("discard") }).strict(),
]);
