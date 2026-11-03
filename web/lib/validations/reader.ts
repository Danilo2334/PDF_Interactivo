import { z } from "zod";
export const readerTokenSchema = z.string().regex(/^[a-f0-9]{48}$/);
export const readerIdentitySchema = z.object({ name: z.string().trim().max(80).default(""), email: z.union([z.literal(""), z.email().max(254)]).default("") }).strict()
  .refine(v => v.name.length >= 2 || v.email.length > 0, "Indica un nombre o un correo válido.");
const opaqueId = z.string().regex(/^[a-z]_[a-f0-9]{32}$/);
export const readerQuizSchema = z.object({ id: opaqueId, title: z.string(), allowRetries: z.boolean(),
  questions: z.array(z.object({ prompt: z.string(), options: z.array(z.string()).min(2).max(5) }).strict()).min(1).max(3) }).strict();
export const readerMediaSchema = z.object({ id: opaqueId, kind: z.enum(["image", "video", "link"]), title: z.string(), url: z.string().nullable() }).strict();
export const readerItemSchema = z.object({ id: opaqueId, title: z.string(), pageNumber: z.number().int().positive(), initialExpanded: z.boolean(),
  text: z.string(), type: z.string(), visual: z.record(z.string(), z.unknown()).nullable(), summary: z.record(z.string(), z.unknown()).nullable(),
  selection: z.record(z.string(), z.unknown()).nullable(), media: z.array(readerMediaSchema), quiz: readerQuizSchema.nullable() }).strict();
export const readerViewSchema = z.object({ name: z.string(), version: z.number().int().positive(), privateTest: z.boolean(), items: z.array(readerItemSchema).max(500) }).strict();
export const readerReplySchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("identification_required"), name: z.string(), version: z.number().int().positive(), privateTest: z.boolean() }).strict(),
  z.object({ state: z.literal("ready"), view: readerViewSchema }).strict(),
]);
export type ReaderView = z.infer<typeof readerViewSchema>;
export type ReaderItem = z.infer<typeof readerItemSchema>;
