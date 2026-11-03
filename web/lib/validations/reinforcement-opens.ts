import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const reinforcementOpenInputSchema = z.object({ operationId: z.string().uuid(), visitId: z.string().uuid(),
  items: z.array(z.object({ id: z.string().regex(/^r_[a-f0-9]{32}$/), pageNumber: z.number().int().positive().max(100000) }).strict()).min(1).max(500),
}).strict().refine(v => new Set(v.items.map(i => i.id)).size === v.items.length);
export const reinforcementOpenReceiptSchema = z.object({ recorded: z.boolean(), count }).strict();
export const reinforcementUsageRowSchema = z.object({ id: z.string().uuid(), pageNumber: z.number().int().positive(), title: z.string(), frequency: count, visits: count, percentage: z.number().min(0).max(100) }).strict();
export const reinforcementUsageSchema = z.object({ totalVisits: count, through: z.string(), rows: z.array(reinforcementUsageRowSchema) }).strict();
