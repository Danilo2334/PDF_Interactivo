import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { reviewHeadSchema } from "@/lib/validations/example";
import { summaryReviewInputSchema, cleanConcepts, SUMMARY_LIMITS } from "@/lib/validations/summary";
import { analysisRecordSchema } from "@/lib/validations/contextual-analysis";

// Owner review is independent of provider availability and never calls AI.
export async function postSummaryReview(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 24000); if (input.response) return input.response;
  const parsed = summaryReviewInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa el título, texto y la versión. Debes confirmar la revisión antes de aprobar." }, 400);
  const body = parsed.data, access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  let concepts = null;
  if (body.action === "edit") {
    const [source, generation] = await Promise.all([access.db.from("reinforcement_analyses").select("*").eq("request_id", requestId).maybeSingle(), access.db.from("reinforcement_summaries").select("mode").eq("request_id", requestId).maybeSingle()]);
    const analysis = analysisRecordSchema.safeParse(source.data);
    if (source.error || generation.error) return reply({message:"No fue posible comprobar el contexto. Actualiza antes de reintentar."},503);
    const mode: unknown = generation.data?.mode;
    if (!analysis.success || !analysis.data.context || mode !== "compact" && mode !== "brief") return reply({message:"Actualiza el resumen y su contexto antes de editar."},409);
    if (body.text.length > SUMMARY_LIMITS[mode]) return reply({message:"El resumen supera la extensión guardada."},400);
    try { concepts = cleanConcepts(body.concepts, analysis.data.context); } catch { return reply({message:"Cada concepto necesita una cita literal del contexto que contenga su nombre; conserva al menos uno y como máximo ocho."},400); }
  }
  let saved;
  try { saved = await access.db.rpc("review_reinforcement_summary", { p_request_id: requestId, p_document_id: body.documentId,
    p_expected_version: body.expectedVersion, p_action: body.action, p_title: body.action === "edit" ? body.title : null,
    p_text: body.action === "edit" ? body.text : null, p_concepts: concepts, p_operation_id: body.operationId }); }
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
