import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { reviewInputSchema, reviewHeadSchema } from "@/lib/validations/example";

// Owner review is independent of provider availability and never calls AI.
export async function postReview(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 24000); if (input.response) return input.response;
  const parsed = reviewInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa el título, texto y la versión. Debes confirmar la revisión antes de aprobar." }, 400);
  const body = parsed.data, access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  let saved;
  try { saved = await access.db.rpc("review_reinforcement_draft", { p_request_id: requestId, p_document_id: body.documentId,
    p_expected_version: body.expectedVersion, p_action: body.action, p_title: body.action === "edit" ? body.title : null,
    p_text: body.action === "edit" ? body.text : null, p_operation_id: body.operationId }); }
  catch { return reply({ message: "No fue posible confirmar el cambio. Actualiza antes de reintentar." }, 503); }
  if (saved.error) {
    const status = saved.error.code === "42501" ? 403 : ["PT409", "23514"].includes(saved.error.code) ? 409 : saved.error.code === "P0001" ? 429 : 503;
    return reply({ message: status === 403 ? "Ya no tienes permiso para revisar este contenido." : status === 409
      ? "El borrador cambió en otra pestaña o ya se tomó una decisión. Actualiza para revisar la versión actual."
      : status === 429 ? "Se alcanzó el límite de versiones de este borrador." : "No fue posible guardar la revisión. Actualiza antes de reintentar." }, status);
  }
  const result = reviewHeadSchema.safeParse(saved.data);
  return result.success ? reply({ review: result.data }) : reply({ message: "La revisión guardada no pudo verificarse. Actualiza el resultado." }, 503);
}
