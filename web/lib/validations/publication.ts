import { z } from "zod";
const id = z.string().uuid();
export const PUBLICATION_VISIBILITIES = ["public", "private", "unpublished"] as const;
export const publicationVisibilitySchema = z.enum(PUBLICATION_VISIBILITIES);
export const publicationInputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), documentId: id, operationId: id, requireIdentification: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal("publish"), documentId: id, operationId: id, expectedVersion: z.number().int().nonnegative(), confirmed: z.literal(true) }).strict(),
  z.object({ action: z.literal("visibility"), documentId: id, publicationId: id, operationId: id,
    visibility: publicationVisibilitySchema, expectedVersion: z.number().int().nonnegative(), confirmed: z.literal(true) }).strict(),
]);
export const publicationReceiptSchema = z.object({ id, version: z.number().int().positive(), documentId: id, name: z.string(), createdAt: z.string(),
  requireIdentification: z.boolean().default(false),
  visibility: publicationVisibilitySchema, visibilityVersion: z.number().int().nonnegative(), visibilityUpdatedAt: z.string(),
  publishedAt: z.string().nullable(), url: z.string().url().nullable(),
  counts: z.object({ reinforcements: z.number().int().nonnegative(), media: z.number().int().nonnegative(), quizzes: z.number().int().nonnegative() }).strict(),
  items: z.array(z.object({ title: z.string(), pageNumber: z.number().int().positive(), quizTitle: z.string().nullable(), mediaCount: z.number().int().nonnegative() }).strict()).max(500),
}).strict();
export type PublicationReceipt = z.infer<typeof publicationReceiptSchema>;
export type PublicationVisibility = z.infer<typeof publicationVisibilitySchema>;
export const publicationVisibilityEventSchema = z.object({ operationId: id, publicationId: id, publicationVersion: z.number().int().positive(),
  from: publicationVisibilitySchema, to: publicationVisibilitySchema, version: z.number().int().nonnegative(), occurredAt: z.string() }).strict();
export const publicationManagementSchema = z.object({ latest: publicationReceiptSchema.nullable(), current: publicationReceiptSchema.nullable(),
  events: z.array(publicationVisibilityEventSchema).max(20) }).strict();
export const publicationStatusSchema = publicationManagementSchema.extend({ canPublish: z.boolean() });
