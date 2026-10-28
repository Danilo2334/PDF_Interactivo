import { z } from "zod";
import { explanationRecordSchema } from "@/lib/validations/explanation";
import { reviewHeadSchema, reviewVersionSchema, reviewEventSchema } from "@/lib/validations/example";
import type { AnalysisContext, ContextDiagnosis } from "@/lib/validations/contextual-analysis";

export const VISUAL_MODES = ["image", "diagram"] as const;
export type VisualMode = typeof VISUAL_MODES[number];
export const VISUAL_LABELS = { image: "Imagen", diagram: "Diagrama" };
export const VISUAL_SYMBOLS = ["pendulum", "water", "sun", "cloud", "plant", "book", "atom", "energy", "cycle"] as const;
export const visualSceneSchema = z.object({
  kind: z.enum(VISUAL_MODES),
  nodes: z.array(z.object({ id: z.string().regex(/^n[1-6]$/), label: z.string().trim().min(1).max(60),
    detail: z.string().trim().min(1).max(160), symbol: z.enum(VISUAL_SYMBOLS) }).strict()).min(1).max(6),
  edges: z.array(z.object({ from: z.string().regex(/^n[1-6]$/), to: z.string().regex(/^n[1-6]$/), label: z.string().trim().min(1).max(40) }).strict()).max(8),
}).strict().superRefine((scene, ctx) => {
  const ids = new Set(scene.nodes.map(n => n.id));
  if (ids.size !== scene.nodes.length || scene.edges.some(e => !ids.has(e.from) || !ids.has(e.to) || e.from === e.to)) ctx.addIssue({ code: "custom", message: "Invalid visual references" });
  if (scene.kind === "diagram" && (scene.nodes.length < 2 || !scene.edges.length)
    || scene.kind === "image" && (scene.nodes.length > 4 || scene.edges.length)) ctx.addIssue({ code: "custom", message: "Visual structure does not match the selected mode" });
});
export const visualContentSchema = z.object({ title: z.string().trim().min(3).max(160), text: z.string().trim().min(80).max(1600),
  sourceQuote: z.string().trim().min(8).max(500), topicReference: z.string().min(3).max(200), consistentWithSource: z.boolean(), scene: visualSceneSchema }).strict();
export type VisualContent = z.infer<typeof visualContentSchema>;
export function validateVisual(value: unknown, context: AnalysisContext, diagnosis: ContextDiagnosis, mode: VisualMode) {
  const output = visualContentSchema.parse(value);
  if (!context.enough || !diagnosis.sufficient || !output.consistentWithSource || output.scene.kind !== mode
    || !context.selectedText.includes(output.sourceQuote) || output.topicReference !== diagnosis.topic) throw Error("Visual does not match its saved source");
  return output;
}
export const VISUAL_FAILURES = ["provider_unavailable", "provider_refused", "invalid_visual", "timeout"] as const;
export type VisualFailureCode = typeof VISUAL_FAILURES[number];
export const VISUAL_MESSAGES: Record<VisualFailureCode, string> = {
  provider_unavailable: "Gemini no está disponible o su cuota gratuita se agotó. Espera antes de reintentar; no se usará un proveedor de pago.",
  provider_refused: "No fue posible generar este recurso. Revisa el fragmento y su dificultad.",
  invalid_visual: "El recurso recibido no pudo verificarse. No se publicó; puedes solicitar otro resultado.",
  timeout: "La generación agotó su tiempo. Puedes reintentar sin publicar un recurso incompleto.",
};
export const visualRecordSchema = explanationRecordSchema.omit({ detail_level: true }).extend({ mode: z.enum(VISUAL_MODES),
  visual_brief: z.string().min(20).max(2000), instructions: z.string().max(500),
  content: visualContentSchema.nullable(), error_code: z.enum(VISUAL_FAILURES).nullable() });
export const visualReviewVersionSchema = reviewVersionSchema.extend({ visual_content: visualContentSchema.nullable() });
export const visualReviewEventSchema = reviewEventSchema.extend({ action: z.enum(["edit", "approve", "discard", "regenerate"]) });
export const visualViewSchema = z.object({ generation: visualRecordSchema.nullable(), choiceVersion: z.number().int().nonnegative(),
  visualChosen: z.boolean(), providerAvailable: z.boolean(), canConfigure: z.boolean(), canGenerate: z.boolean(), canRegenerate: z.boolean(),
  review: reviewHeadSchema.nullable(), versions: z.array(visualReviewVersionSchema).max(20), events: z.array(visualReviewEventSchema).max(20) });
export type VisualView = z.infer<typeof visualViewSchema>;
const common = { documentId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), choiceVersion: z.number().int().positive() };
export const visualInputSchema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("configure"), mode: z.enum(VISUAL_MODES) }).strict(),
  z.object({ ...common, action: z.literal("generate") }).strict(),
  z.object({ ...common, action: z.literal("regenerate"), reviewVersion: z.number().int().positive(), instructions: z.string().trim().max(500).default("") }).strict(),
]);
