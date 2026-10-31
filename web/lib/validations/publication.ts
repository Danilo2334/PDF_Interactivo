import { z } from "zod";
const id = z.string().uuid();
export const publicationInputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), documentId: id, operationId: id }).strict(),
  z.object({ action: z.literal("publish"), documentId: id, operationId: id, confirmed: z.literal(true) }).strict(),
]);
export const publicationReceiptSchema = z.object({ id, version: z.number().int().positive(), documentId: id, name: z.string(), createdAt: z.string(),
  publishedAt: z.string().nullable(), url: z.string().url().nullable(),
  counts: z.object({ reinforcements: z.number().int().nonnegative(), media: z.number().int().nonnegative(), quizzes: z.number().int().nonnegative() }).strict(),
  items: z.array(z.object({ title: z.string(), pageNumber: z.number().int().positive(), quizTitle: z.string().nullable(), mediaCount: z.number().int().nonnegative() }).strict()).max(500),
}).strict();
export type PublicationReceipt = z.infer<typeof publicationReceiptSchema>;
export const publicationStatusSchema = z.object({ latest: publicationReceiptSchema.nullable(), canPublish: z.boolean() });
