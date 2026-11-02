import "server-only";
import { randomUUID } from "node:crypto";

const safeCodes = new Set(["ORIGIN_REJECTED", "ACCESS_REJECTED", "INVALID_UPLOAD", "INVALID_PDF",
  "UPLOAD_CONFLICT", "UPLOAD_UNAVAILABLE", "UPLOAD_GONE", "timeout", "provider_unavailable",
  "provider_refused", "invalid_content", "insufficient_context", "invalid_response"]);
type Operation = "pdf.upload" | "pdf.replace" | "reinforcement.analysis" | "reinforcement.recommendations"
  | "reinforcement.explanation" | "reinforcement.example" | "reinforcement.summary" | "reinforcement.visual"
  | "reinforcement.quiz" | "reinforcement.regeneration" | "reinforcement.review";

function businessError(body: Record<string, unknown>) {
  for (const key of ["analysis", "generation", "recommendations", "regeneration", "job"]) {
    const value = body[key];
    if (value && typeof value === "object" && "status" in value && ["error", "insufficient"].includes(String(value.status))) {
      const record = value as Record<string, unknown>;
      return typeof record.error_code === "string" && safeCodes.has(record.error_code) ? record.error_code : "OPERATION_FAILED";
    }
  }
  return null;
}

export function withOperationDiagnostics<Context>(operation: Operation,
  handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context) => {
    const reference = randomUUID(), started = Date.now();
    let response: Response;
    try { response = await handler(request, context); }
    catch { response = Response.json({ message: "No fue posible completar la operación. Conserva tus datos y reintenta; si persiste, comunica la referencia a soporte." }, { status: 503 }); }
    let body: Record<string, unknown> | null = null;
    if (response.headers.get("content-type")?.includes("application/json")) {
      try { body = await response.clone().json(); } catch { /* never log upstream content */ }
    }
    const business = body ? businessError(body) : null;
    if (response.status >= 400 || business) {
      const proposedCode = body?.code;
      const code = business ?? (typeof proposedCode === "string" && safeCodes.has(proposedCode) ? proposedCode
        : response.status === 401 ? "SESSION_REQUIRED" : response.status === 403 ? "ACCESS_REJECTED"
          : response.status === 409 ? "VERSION_CONFLICT" : response.status === 429 ? "QUOTA_EXCEEDED"
            : response.status >= 500 ? "SERVICE_UNAVAILABLE" : "REQUEST_REJECTED");
      // No URLs, request IDs, content, filenames, credentials, provider bodies or stacks.
      console.error(JSON.stringify({ event: "operation_failure", operation, code, reference,
        date: new Date().toISOString(), status: response.status, elapsedMs: Date.now() - started }));
      if (body) {
        body.reference = reference;
        if (typeof body.message === "string") body.message += ` Referencia: ${reference}.`;
        response = Response.json(body, { status: response.status, headers: response.headers });
        response.headers.delete("content-length");
      }
    }
    response.headers.set("x-operation-reference", reference);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
}
