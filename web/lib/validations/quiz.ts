import { z } from "zod";
import { reviewHeadSchema, reviewEventSchema } from "@/lib/validations/example";

export const QUIZ_FAILURES = ["provider_unavailable", "provider_refused", "invalid_quiz", "insufficient_quiz", "timeout", "source_changed"] as const;
export type QuizFailureCode = typeof QUIZ_FAILURES[number];
export const QUIZ_MESSAGES: Record<QuizFailureCode, string> = {
  provider_unavailable: "El servicio de IA no está disponible o se agotó su cuota. Espera antes de reintentar; no se cambiará de proveedor automáticamente.",
  provider_refused: "No fue posible formular preguntas con este refuerzo. Revisa su contenido antes de reintentar.",
  invalid_quiz: "Las preguntas, opciones o citas no pudieron validarse con el refuerzo. No se guardó esa versión; revisa la fuente antes de reintentar.",
  insufficient_quiz: "El refuerzo no contiene información suficiente para esa cantidad de preguntas claras. Prueba con menos preguntas o revisa el refuerzo; no se forzó un quiz.",
  timeout: "La generación tardó demasiado. Puedes reintentar; la versión aprobada anterior se conserva.",
  source_changed: "El refuerzo cambió durante la generación. Actualiza y revisa la fuente antes de reintentar.",
};
const normalized = (value: string) => value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
export const quizQuestionSchema = z.object({ prompt: z.string().trim().min(8).max(400),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(5), correctIndex: z.number().int().min(0).max(4),
  explanation: z.string().trim().min(20).max(1000), sourceQuote: z.string().trim().min(8).max(500),
}).strict().refine(q => q.correctIndex < q.options.length && new Set(q.options.map(normalized)).size === q.options.length,
  "Cada pregunta necesita opciones distintas y exactamente una respuesta correcta válida.");
export const quizContentSchema = z.object({ title: z.string().trim().min(3).max(160),
  allowRetries: z.boolean(), questions: z.array(quizQuestionSchema).min(1).max(3),
}).strict().refine(value => new Set(value.questions.map(q => normalized(q.prompt))).size === value.questions.length,
  "Las preguntas deben ser diferentes.");
export type QuizContent = z.infer<typeof quizContentSchema>;
export const quizGenerationSchema = z.object({ sufficient: z.boolean(), reason: z.string().trim().max(300), quiz: quizContentSchema.nullable() }).strict();
export const quizSourceSchema = z.object({ versionId: z.string().uuid(), requestId: z.string().uuid(), documentId: z.string().uuid(),
  pageNumber: z.number().int().positive(), title: z.string().min(3).max(160), text: z.string().min(80).max(6000),
  concepts: z.array(z.string().min(1).max(200)).max(8), hash: z.string().regex(/^[a-f0-9]{64}$/) });
export type QuizSource = z.infer<typeof quizSourceSchema>;
export function validateQuiz(value: unknown, source: QuizSource, count?: number) {
  const content = quizContentSchema.parse(value);
  if (count !== undefined && content.questions.length !== count || content.questions.some(q => !source.text.includes(q.sourceQuote)))
    throw Error("Quiz does not match the selected reinforcement");
  return content;
}
const timestamp = z.string().datetime({ offset: true });
export const quizVersionSchema = z.object({ id: z.string().uuid(), request_id: z.string().uuid(), version: z.number().int().positive(),
  source_version_id: z.string().uuid(), source: quizSourceSchema, content: quizContentSchema, origin: z.enum(["ai", "owner"]),
  actor_id: z.string().uuid(), created_at: timestamp, model: z.string().nullable() }).refine(value => value.source.versionId === value.source_version_id && value.source.requestId === value.request_id,
  "La fuente del quiz debe pertenecer a su refuerzo.");
export const quizHeadSchema = reviewHeadSchema.extend({ current_version: z.number().int().nonnegative(), choice: z.enum(["undecided", "generate", "omit"]),
  choice_version: z.number().int().nonnegative(), target_source_version_id: z.string().uuid().nullable() });
export const quizEventSchema = reviewEventSchema.extend({ version: z.number().int().nonnegative(), action: z.enum(["choose_generate", "choose_omit", "edit", "approve", "discard", "regenerate"]) });
export const quizJobSchema = z.object({ operation_id: z.string().uuid(), request_id: z.string().uuid(), source_version_id: z.string().uuid(),
  expected_version: z.number().int().nonnegative(), question_count: z.number().int().min(1).max(3), status: z.enum(["processing", "ready", "error"]),
  started_at: timestamp, lease_expires_at: timestamp, finished_at: timestamp.nullable(), result_version: z.number().int().positive().nullable(),
  error_code: z.enum(QUIZ_FAILURES).nullable(), model: z.string().nullable() });
export const quizViewSchema = z.object({ source: quizSourceSchema.nullable(), head: quizHeadSchema.nullable(),
  versions: z.array(quizVersionSchema).max(20), approvedVersion: quizVersionSchema.nullable(), events: z.array(quizEventSchema).max(20), job: quizJobSchema.nullable(), processing: z.boolean(), providerAvailable: z.boolean() });
export type QuizView = z.infer<typeof quizViewSchema>;
const common = { documentId: z.string().uuid(), sourceVersionId: z.string().uuid(), operationId: z.string().uuid() };
export const quizInputSchema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("choose"), choice: z.enum(["generate", "omit"]), choiceVersion: z.number().int().nonnegative() }).strict(),
  z.object({ ...common, action: z.literal("generate"), expectedVersion: z.number().int().nonnegative(), choiceVersion: z.number().int().positive(), questionCount: z.number().int().min(1).max(3) }).strict(),
  z.object({ ...common, action: z.literal("approve"), expectedVersion: z.number().int().positive(), confirmed: z.literal(true) }).strict(),
  z.object({ ...common, action: z.literal("discard"), expectedVersion: z.number().int().positive() }).strict(),
  z.object({ ...common, action: z.literal("edit"), expectedVersion: z.number().int().positive(), content: quizContentSchema }).strict(),
]);
