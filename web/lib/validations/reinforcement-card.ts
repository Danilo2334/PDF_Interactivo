import { z } from "zod";

export const cardInputSchema = z.object({ documentId: z.string().uuid(), reinforcementId: z.string().uuid(),
  approvedVersionId: z.string().uuid(), expectedVersion: z.number().int().min(0).max(999999),
  initialExpanded: z.boolean(), operationId: z.string().uuid() }).strict();
export const cardRecordSchema = z.object({ reinforcement_id: z.string().uuid(), approved_version_id: z.string().uuid(),
  initial_expanded: z.boolean(), version: z.number().int().positive(), operation_id: z.string().uuid(),
  updated_by: z.string().uuid(), updated_at: z.string().datetime({ offset: true }) });
export type CardRecord = z.infer<typeof cardRecordSchema>;
