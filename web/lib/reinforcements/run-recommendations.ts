import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { analysisRecordSchema, validateDiagnosis } from "@/lib/validations/contextual-analysis";
import { recommendationInputSchema, recommendationRecordSchema, recommendationViewSchema, choiceReceiptSchema,
  RECOMMENDATION_MESSAGES, type RecommendationOption } from "@/lib/validations/recommendations";
import { getRecommendationConfiguration, recommendReinforcement, RecommendationFailure } from "@/lib/reinforcements/recommendation-provider";
import { signRecommendationProof } from "@/lib/reinforcements/recommendation-proof";

type Access = Extract<Awaited<ReturnType<typeof authorizeRequest>>, { db: unknown }>;
async function savedAnalysis(access: Access) {
  const result = await access.db.from("reinforcement_analyses").select("*").eq("request_id", access.row.id).maybeSingle();
  if (result.error) return { response: reply({ message: "No fue posible consultar el diagnóstico." }, 503) };
  const parsed = analysisRecordSchema.nullable().safeParse(result.data);
  if (!parsed.success) return { response: reply({ message: "El diagnóstico guardado no pudo verificarse." }, 409) };
  const analysis = parsed.data;
  if (!analysis || analysis.status !== "ready" || !analysis.context?.enough || !analysis.diagnosis?.sufficient) return { analysis: null };
  try { validateDiagnosis(analysis.diagnosis, analysis.context); }
  catch { return { response: reply({ message: "El diagnóstico guardado no pudo verificarse." }, 409) }; }
  return { analysis: { ...analysis, context: analysis.context, diagnosis: analysis.diagnosis } };
}
function failure(code?: string) {
  const status = code === "42501" ? 403 : ["40001", "23514"].includes(code ?? "") ? 409 : code === "P0001" ? 429 : 503;
  return reply({ message: status === 403 ? "Ya no tienes permiso para esta solicitud." : status === 409
    ? "La solicitud o la elección cambió. Actualiza las opciones antes de continuar." : status === 429
      ? "Hay varias recomendaciones recientes o en curso. Espera un momento antes de reintentar."
      : "No fue posible confirmar la operación. Actualiza las opciones antes de reintentar." }, status);
}

export async function getRecommendations(request: Request, projectId: string, requestId: string) {
  const access = await authorizeRequest(projectId, requestId, new URL(request.url).searchParams.get("documentId"));
  if (access.response) return access.response;
  const [source, stored, selected] = await Promise.all([
    savedAnalysis(access),
    access.db.from("reinforcement_recommendations").select("*").eq("request_id", requestId).maybeSingle(),
    access.db.from("reinforcement_requests").select("recommended_type,recommendation_reason,recommendation_attempt_id,recommendation_selected_at,recommendation_choice_version")
      .eq("id", requestId).eq("owner_id", access.userId).maybeSingle(),
  ]);
  if (source.response) return source.response;
  if (stored.error || selected.error || !selected.data) return failure();
  const parsed = recommendationRecordSchema.nullable().safeParse(stored.data);
  if (!parsed.success) return failure();
  const recommendations = parsed.data, selection = selected.data;
  if (recommendations && recommendations.analysis_attempt_id !== source.analysis?.attempt_id) return failure("40001");
  const choosing = access.row.status === "pending" && access.row.stage === "choosing";
  const available = getRecommendationConfiguration() !== null;
  const view = recommendationViewSchema.safeParse({ recommendations, analysisReady: !!source.analysis, providerAvailable: available,
    choice: selection.recommended_type ? { type: selection.recommended_type, justification: selection.recommendation_reason,
      attemptId: selection.recommendation_attempt_id, selectedAt: selection.recommendation_selected_at } : null,
    choiceVersion: selection.recommendation_choice_version,
    canRecommend: !!source.analysis && available && choosing && !selection.recommended_type && (!recommendations || recommendations.status === "error"
      || recommendations.status === "processing" && Date.parse(recommendations.lease_expires_at) <= Date.now()),
    canChoose: choosing && !!source.analysis && recommendations?.status === "ready",
  });
  return view.success ? reply(view.data) : failure();
}

export async function postRecommendations(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request); if (input.response) return input.response;
  const parsed = recommendationInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa la operación y la opción elegida." }, 400);
  const body = parsed.data;
  const access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  if (body.action === "choose") {
    let saved;
    try { saved = await access.db.rpc("choose_reinforcement_option", { p_request_id: requestId, p_document_id: body.documentId,
      p_attempt_id: body.attemptId, p_type: body.type, p_expected_version: body.expectedVersion }); }
    catch { return failure(); }
    if (saved.error) return failure(saved.error.code);
    const receipt = choiceReceiptSchema.safeParse(saved.data);
    return receipt.success && receipt.data.choice ? reply(receipt.data) : failure();
  }
  const source = await savedAnalysis(access); if (source.response) return source.response;
  if (!source.analysis) return reply({ message: "Primero completa un análisis con contexto suficiente." }, 409);
  const config = getRecommendationConfiguration();
  if (!config) return reply({ message: RECOMMENDATION_MESSAGES.provider_unavailable }, 503);
  const attemptId = crypto.randomUUID();
  const proof = { userId: access.userId, requestId, documentId: body.documentId, analysisAttemptId: source.analysis.attempt_id, attemptId };
  let claim;
  try { claim = await access.db.rpc("change_reinforcement_recommendations", signRecommendationProof({ ...proof, action: "start" })); }
  catch { return failure(); }
  if (claim.error) return failure(claim.error.code);
  const existing = recommendationRecordSchema.safeParse(claim.data?.recommendations);
  if (!existing.success) return failure();
  if (claim.data.disposition !== "started") return reply({ recommendations: existing.data }, claim.data.disposition === "busy" ? 202 : 200);

  let options: RecommendationOption[] = [], model: string | null = null, errorCode: string | null = null;
  let status: "ready" | "empty" | "error" = "error";
  try {
    const result = await recommendReinforcement(source.analysis.context, source.analysis.diagnosis, config);
    options = result.options; model = result.model; status = options.length ? "ready" : "empty";
  } catch (error) { errorCode = error instanceof RecommendationFailure ? error.code : "provider_unavailable"; }
  let saved;
  try { saved = await access.db.rpc("change_reinforcement_recommendations", signRecommendationProof({ ...proof, action: "finish", status, options, model, errorCode,
    emptyReason: status === "empty" ? "No se encontraron opciones que aporten suficientemente al tema y a tu dificultad. Prepara una nueva solicitud con más contexto." : null })); }
  catch { return failure(); }
  if (saved.error) return failure(saved.error.code);
  const result = recommendationRecordSchema.safeParse(saved.data?.recommendations);
  return result.success ? reply({ recommendations: result.data }) : failure();
}
