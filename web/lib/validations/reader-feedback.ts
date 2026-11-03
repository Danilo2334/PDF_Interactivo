import { z } from "zod";

export const clarityRatingSchema = z.enum(["useful", "unclear"]);
// Comments are plain text. Normalize controls/line endings without interpreting HTML.
export function normalizeFeedbackComment(value: string) {
  return value.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}
export const feedbackCommentSchema = z.string().max(2000).transform(normalizeFeedbackComment).pipe(z.string().max(1000));
export const readerFeedbackInputSchema = z.object({ operationId: z.string().uuid(), pageNumber: z.number().int().positive(),
  rating: clarityRatingSchema, comment: feedbackCommentSchema.default("") }).strict();
export const readerFeedbackReceiptSchema = z.object({ id: z.string().uuid(), pageNumber: z.number().int().positive(),
  rating: clarityRatingSchema, comment: z.string().max(1000), createdAt: z.iso.datetime({ offset: true }) }).strict();
export const readerFeedbackStatusSchema = z.object({ enabled: z.boolean(), receipt: readerFeedbackReceiptSchema.nullable() }).strict();
export type ReaderFeedbackReceipt = z.infer<typeof readerFeedbackReceiptSchema>;
