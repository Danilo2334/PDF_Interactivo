import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { cardInputSchema, cardRecordSchema } from "@/lib/validations/reinforcement-card";

export async function postCard(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 1000); if (input.response) return input.response;
  const parsed = cardInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa la versión y el estado inicial de la tarjeta." }, 400);
  const body = parsed.data, access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  try {
    const saved = await access.db.rpc("save_reinforcement_card", { p_request_id: requestId, p_document_id: body.documentId,
      p_reinforcement_id: body.reinforcementId, p_approved_version_id: body.approvedVersionId,
      p_expected_version: body.expectedVersion, p_initial_expanded: body.initialExpanded, p_operation_id: body.operationId });
    if (saved.error) {
      const status = saved.error.code === "42501" ? 403 : ["PT409", "40001", "23514"].includes(saved.error.code) ? 409 : 503;
      return reply({ message: status === 409 ? "La tarjeta o su contenido cambiaron. Recarga el proyecto antes de guardar otra vez."
        : status === 403 ? "Ya no tienes permiso para guardar esta tarjeta." : "No fue posible confirmar la tarjeta. Reintenta sin cambiar los datos." }, status);
    }
    const result = cardRecordSchema.safeParse(saved.data);
    return result.success ? reply({ card: result.data }) : reply({ message: "No se pudo verificar la tarjeta guardada. Recarga el proyecto." }, 503);
  } catch { return reply({ message: "No fue posible confirmar la tarjeta. Reintenta sin cambiar los datos." }, 503); }
}
