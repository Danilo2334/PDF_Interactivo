import { z } from "zod";
import { reviewHeadSchema, reviewVersionSchema, reviewEventSchema } from "@/lib/validations/example";
export const regenerationInputSchema = z.discriminatedUnion("action", [
  z.object({action:z.literal("prepare"),documentId:z.string().uuid()}).strict(),
  z.object({action:z.literal("regenerate"),documentId:z.string().uuid(),expectedVersion:z.number().int().min(1).max(99),
    instructions:z.string().trim().min(3).max(500),operationId:z.string().uuid()}).strict(),
]);
export const regenerationJobSchema = z.object({operation_id:z.string().uuid(),request_id:z.string().uuid(),actor_id:z.string().uuid(),
  expected_version:z.number().int(),instructions:z.string(),status:z.enum(["processing","ready","error"]),
  started_at:z.string().datetime({offset:true}),lease_expires_at:z.string().datetime({offset:true}),finished_at:z.string().datetime({offset:true}).nullable(),
  result_version:z.number().int().nullable(),model:z.string().nullable(),error_code:z.enum(["provider_unavailable","provider_refused","invalid_content","timeout"]).nullable()});
export const regenerationViewSchema = z.object({kind:z.enum(["explanation","example","image","summary"]).nullable(),ready:z.boolean(),providerAvailable:z.boolean(),processing:z.boolean(),
  review:reviewHeadSchema.nullable(),versions:z.array(reviewVersionSchema),events:z.array(reviewEventSchema),job:regenerationJobSchema.nullable()});
export type RegenerationView=z.infer<typeof regenerationViewSchema>;
export type GenerationAdjustment={instructions:string;previous:Record<string,unknown>};
