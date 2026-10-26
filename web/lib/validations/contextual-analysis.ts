import { z } from "zod";

export const ANALYSIS_FAILURES = ["pdf_unavailable", "provider_unavailable", "provider_refused", "invalid_diagnosis", "timeout", "insufficient_context"] as const;
export type AnalysisFailureCode = typeof ANALYSIS_FAILURES[number];
export const ANALYSIS_MESSAGES: Record<AnalysisFailureCode, string> = {
  pdf_unavailable: "No fue posible leer el contexto de esta página. Reintenta o prepara una nueva solicitud con una transcripción más amplia.",
  provider_unavailable: "El servicio de análisis no está disponible en este momento. Inténtalo nuevamente más tarde.",
  provider_refused: "No fue posible analizar este contenido. Revisa la selección y la dificultad antes de preparar otra solicitud.",
  invalid_diagnosis: "La respuesta del análisis no pudo verificarse. Puedes reintentar.",
  timeout: "El análisis tardó demasiado. Puedes reintentar; no se publicará un resultado incompleto.",
  insufficient_context: "Falta contexto útil. Selecciona un fragmento más amplio o confirma una transcripción más completa en una nueva solicitud.",
};
export const analysisContextSchema = z.object({
  pageNumber: z.number().int().positive(), selectedText: z.string().min(1).max(20000),
  textSource: z.enum(["digital", "manual"]), nearbyText: z.string().max(6000),
  nearbySource: z.enum(["selection", "page", "none"]), need: z.string().min(20).max(2000),
  category: z.enum(["concept", "vocabulary", "procedure", "connection", "other"]),
  pdfSha256: z.string().regex(/^[a-f0-9]{64}$/), enough: z.boolean(), truncated: z.boolean(),
}).strict();
export type AnalysisContext = z.infer<typeof analysisContextSchema>;
export const diagnosisSchema = z.object({
  sufficient: z.boolean(), topic: z.string().max(200), concepts: z.array(z.string().min(1).max(120)).max(8),
  scope: z.string().max(2000), reason: z.string().max(700), quotes: z.array(z.string().trim().min(8).max(500)).max(3),
}).strict().refine(d => d.sufficient
  ? d.topic.trim().length >= 3 && d.scope.trim().length >= 20 && d.concepts.length > 0 && d.quotes.length > 0 && d.reason === ""
  : d.topic === "" && d.scope === "" && d.concepts.length === 0 && d.quotes.length === 0 && d.reason.trim().length >= 10);
export type ContextDiagnosis = z.infer<typeof diagnosisSchema>;
export const analysisRecordSchema = z.object({
  request_id: z.string().uuid(), attempt_id: z.string().uuid(), status: z.enum(["processing", "ready", "insufficient", "error"]),
  context: analysisContextSchema.nullable(), diagnosis: diagnosisSchema.nullable(), model: z.string().nullable(),
  error_code: z.enum(ANALYSIS_FAILURES).nullable(), started_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }), lease_expires_at: z.string().datetime({ offset: true }),
  finished_at: z.string().datetime({ offset: true }).nullable(), attempts: z.number().int().positive(),
});
export type AnalysisRecord = z.infer<typeof analysisRecordSchema>;
export const analysisViewSchema = z.object({ analysis: analysisRecordSchema.nullable(), available: z.boolean(), retryable: z.boolean() });
export const analysisInputSchema = z.object({ documentId: z.string().uuid(), action: z.enum(["prepare", "analyze"]) }).strict();

export function validateDiagnosis(value: unknown, context: AnalysisContext): ContextDiagnosis {
  const diagnosis = diagnosisSchema.parse(value);
  const normalize = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();
  const sources = [context.selectedText, context.nearbyText].map(normalize);
  if (diagnosis.sufficient && diagnosis.quotes.some(quote => normalize(quote).length < 8 || !sources.some(source => source.includes(normalize(quote)))))
    throw new Error("Diagnosis quotes are not present in the supplied context");
  return diagnosis;
}
