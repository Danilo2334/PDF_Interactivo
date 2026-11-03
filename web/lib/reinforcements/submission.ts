import { reinforcementReceiptSchema, requestContentKey, type ReinforcementContent, type ReinforcementReceipt } from "@/lib/validations/reinforcement-request";

export type SubmissionState = { status: "idle" | "sending" | "success" | "error"; contentKey?: string; receipt?: ReinforcementReceipt; message?: string };
export const IDLE_SUBMISSION: SubmissionState = { status: "idle" };

// The controller lives in the workspace: closing the dialog does not discard a retry key.
export function createSubmissionController(onState: (state: SubmissionState) => void, dependencies: {
  fetch?: typeof fetch; uuid?: () => string;
} = {}) {
  let pending = false;
  let attempt: { contentKey: string; idempotencyKey: string; receipt?: ReinforcementReceipt } | null = null;
  return {
    reset() { if (!pending) { attempt = null; onState(IDLE_SUBMISSION); } },
    async send(projectId: string, content: ReinforcementContent) {
      if (pending) return;
      const contentKey = requestContentKey(projectId, content);
      if (attempt?.contentKey !== contentKey) attempt = { contentKey, idempotencyKey: (dependencies.uuid ?? (() => crypto.randomUUID()))() };
      if (attempt.receipt) { onState({ status: "success", contentKey, receipt: attempt.receipt }); return; }
      const current = attempt;
      pending = true;
      onState({ status: "sending", contentKey });
      try {
        const response = await (dependencies.fetch ?? fetch)(`/api/projects/${projectId}/reinforcement-requests`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, idempotencyKey: current.idempotencyKey }), signal: AbortSignal.timeout(30_000),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "No fue posible confirmar la solicitud.");
        const receipt = reinforcementReceiptSchema.parse(body.request);
        current.receipt = receipt;
        onState({ status: "success", contentKey, receipt });
      } catch (error) {
        onState({ status: "error", contentKey, message: error instanceof Error && error.name === "Error" ? error.message
          : "No pudimos confirmar el resultado. Reintenta sin cambiar el contenido: se conservará el identificador del envío." });
      } finally { pending = false; }
    },
  };
}
