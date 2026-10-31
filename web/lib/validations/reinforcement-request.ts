import { z } from "zod";
import type { DifficultyDraft } from "@/lib/validations/difficulty";
import type { SelectionTextDraft } from "@/lib/pdf/selection-text-draft";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/reinforcements/state";

export const MAX_REQUEST_TEXT = 20_000;
const uuid = z.string().uuid();
const rect = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  width: z.number().positive().max(1), height: z.number().positive().max(1) }).strict()
  .refine(r => r.x + r.width <= 1.000001 && r.y + r.height <= 1.000001, "La zona debe estar dentro de la página.");
const fragment = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("area"), documentId: uuid, pageNumber: z.number().int().positive(), rect }).strict(),
  z.object({ kind: z.literal("text"), documentId: uuid, pageNumber: z.number().int().positive(),
    text: z.string().trim().min(1).max(MAX_REQUEST_TEXT),
    range: z.object({ start: z.number().int().nonnegative(), end: z.number().int().positive() }).strict()
      .refine(r => r.end > r.start, "El rango de texto no es válido."),
    rects: z.array(rect).min(1).max(500) }).strict(),
]);

export const reinforcementContentSchema = z.object({
  documentId: uuid, pageNumber: z.number().int().positive(), fragment: fragment.nullable(),
  text: z.string().trim().min(1, "Confirma un texto que no esté vacío.").max(MAX_REQUEST_TEXT),
  source: z.enum(["digital", "manual"]),
  category: z.enum(["concept", "vocabulary", "procedure", "connection", "other"]),
  need: z.string().trim().min(20).max(2000),
}).strict().refine(value => !value.fragment || (value.fragment.documentId === value.documentId
  && value.fragment.pageNumber === value.pageNumber), { message: "La selección no corresponde a esta página y versión.", path: ["fragment"] });

export const reinforcementRequestSchema = z.object({ content: reinforcementContentSchema, idempotencyKey: uuid }).strict();
export type ReinforcementContent = z.infer<typeof reinforcementContentSchema>;
export type ReinforcementReceipt = { id: string; status: RequestStatus; createdAt: string };
export const reinforcementReceiptSchema = z.object({ id: uuid, status: z.enum(REQUEST_STATUSES), createdAt: z.string().datetime({ offset: true }) });

export function contentFromDraft(difficulty: DifficultyDraft | null, text: SelectionTextDraft | null):
  { content: ReinforcementContent | null; missing: string[] } {
  const missing: string[] = [];
  if (!difficulty) missing.push("Guarda la categoría y la dificultad de esta selección.");
  if (!text?.confirmed || text.status === "loading") missing.push("Confirma el texto que quieres enviar.");
  if (difficulty && text && (difficulty.documentId !== text.documentId || difficulty.pageNumber !== text.pageNumber
    || JSON.stringify(difficulty.fragment) !== JSON.stringify(text.fragment))) missing.push("Vuelve a confirmar la dificultad y el texto de la selección actual.");
  if (missing.length || !difficulty || !text) return { content: null, missing };
  const result = reinforcementContentSchema.safeParse({ documentId: difficulty.documentId, pageNumber: difficulty.pageNumber,
    fragment: difficulty.fragment, text: text.text, source: text.source, category: difficulty.category, need: difficulty.observation });
  return result.success ? { content: result.data, missing: [] }
    : { content: null, missing: ["Revisa la página y la selección. El texto debe tener entre 1 y 20.000 caracteres y la dificultad entre 20 y 2.000."] };
}

export function requestContentKey(projectId: string, content: ReinforcementContent): string {
  return JSON.stringify([projectId, reinforcementContentSchema.parse(content)]);
}
