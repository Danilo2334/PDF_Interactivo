import { z } from "zod";
import { REQUEST_STATUSES, REQUEST_STAGES } from "@/lib/reinforcements/state";
import { reinforcementContentSchema } from "@/lib/validations/reinforcement-request";

export const REQUEST_PAGE_SIZE = 20;
export const requestFilterSchema = z.enum(["all", ...REQUEST_STATUSES]);
export type RequestFilter = z.infer<typeof requestFilterSchema>;
export const requestListQuerySchema = z.object({ documentId: z.string().uuid(), status: requestFilterSchema,
  page: z.string().regex(/^[1-9]\d{0,3}$/).transform(Number) });
const timestamp = z.string().datetime({ offset: true });
export const requestSummarySchema = z.object({
  id: z.string().uuid(), project_id: z.string().uuid(), document_id: z.string().uuid(), owner_id: z.string().uuid(),
  page_number: z.number().int().positive(), status: z.enum(REQUEST_STATUSES), stage: z.enum(REQUEST_STAGES),
  created_at: timestamp, updated_at: timestamp, error_message: z.string().nullable(),
});
export const requestRecordSchema = requestSummarySchema.extend({
  selection: reinforcementContentSchema.shape.fragment,
  selected_text: z.string().min(1).max(20000), text_source: z.enum(["digital", "manual"]),
  category: reinforcementContentSchema.shape.category, need: z.string().min(20).max(2000),
}).refine(row => !row.selection || row.selection.documentId === row.document_id && row.selection.pageNumber === row.page_number);
export type RequestSummary = z.infer<typeof requestSummarySchema>;
export type RequestRecord = z.infer<typeof requestRecordSchema>;
export const requestListSchema = z.object({ items: z.array(requestSummarySchema), page: z.number().int().positive(),
  total: z.number().int().nonnegative(), pageSize: z.literal(REQUEST_PAGE_SIZE) });
export type RequestList = z.infer<typeof requestListSchema>;
export const requestEventSchema = z.object({
  id: z.string().uuid(), request_id: z.string().uuid(), previous_status: z.enum(REQUEST_STATUSES).nullable(),
  status: z.enum(REQUEST_STATUSES), previous_stage: z.enum(REQUEST_STAGES).nullable(), stage: z.enum(REQUEST_STAGES),
  actor_kind: z.enum(["owner", "system", "migration"]), actor_id: z.string().uuid().nullable(),
  event_kind: z.enum(["created", "transition", "baseline"]), occurred_at: timestamp,
});
export const requestDetailSchema = z.object({ request: requestRecordSchema, events: z.array(requestEventSchema),
  historyPage: z.number().int().positive(), historyTotal: z.number().int().nonnegative(), pageSize: z.literal(REQUEST_PAGE_SIZE) });
export type RequestDetail = z.infer<typeof requestDetailSchema>;
