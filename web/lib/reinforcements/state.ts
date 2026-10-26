export const REQUEST_STATUSES = ["pending", "processing", "error", "generated", "approved"] as const;
export type RequestStatus = typeof REQUEST_STATUSES[number];
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pendiente", processing: "En proceso", error: "Error", generated: "Generada", approved: "Aprobada",
};
export const REQUEST_STAGES = ["queued", "analyzing", "choosing", "generating", "failed", "review", "approved"] as const;
export type RequestStage = typeof REQUEST_STAGES[number];
export const REQUEST_STAGE_LABELS: Record<RequestStage, string> = {
  queued: "En espera de análisis", analyzing: "Analizando la selección", choosing: "Esperando la elección del refuerzo",
  generating: "Generando contenido", failed: "Operación interrumpida", review: "Pendiente de revisión del propietario",
  approved: "Aprobado por el propietario",
};
