import { z } from "zod";
export const readerOpenInputSchema = z.object({ operationId: z.string().uuid() }).strict();
export const readerOpenReceiptSchema = z.object({ recorded: z.boolean(), visitId: z.string().uuid().nullable(), occurredAt: z.string().nullable() }).strict();
export const visitTotalsSchema = z.object({ total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), lastVisitedAt: z.string().nullable(), windowMinutes: z.literal(30) }).strict();
