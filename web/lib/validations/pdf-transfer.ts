import { z } from "zod";
import { PDF_MAX_SIZE_BYTES } from "@/lib/validations/pdf-file";

export const pdfTransferSchema = z.object({
  action: z.enum(["prepare", "complete"]), operationId: z.uuid(),
  file: z.object({ name: z.string().min(1).max(255).regex(/^[^/\\\u0000-\u001f]+\.pdf$/i),
    type: z.literal("application/pdf"), size: z.number().int().positive().max(PDF_MAX_SIZE_BYTES),
    sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
}).strict();
export const pdfReplacementTransferSchema = pdfTransferSchema.extend({ documentId: z.uuid(), confirmed: z.literal(true) });
export type PdfTransfer = z.infer<typeof pdfTransferSchema>;
