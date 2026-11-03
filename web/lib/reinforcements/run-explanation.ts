import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { analysisRecordSchema, validateDiagnosis } from "@/lib/validations/contextual-analysis";
import { explanationInputSchema, explanationRecordSchema, explanationViewSchema, EXPLANATION_MESSAGES } from "@/lib/validations/explanation";
import { getExplanationConfiguration, generateExplanation, ExplanationFailure } from "@/lib/reinforcements/explanation-provider";
import { signExplanationProof } from "@/lib/reinforcements/explanation-proof";

function failure(code?: string) {
  const status = code === "42501" ? 403 : ["PT409", "23514"].includes(code ?? "") ? 409 : code === "P0001" ? 429 : 503;
  return reply({ message: status === 403 ? "Ya no tienes permiso para esta solicitud." : status === 409
    ? "La solicitud, la elección o el nivel cambió. Actualiza antes de continuar." : status === 429
      ? "Hay varias generaciones recientes o en curso. Espera antes de reintentar."
      : "No fue posible confirmar la operación. Actualiza antes de reintentar." }, status);
}
export async function getExplanation(request: Request, projectId: string, requestId: string) {
  const access = await authorizeRequest(projectId, requestId, new URL(request.url).searchParams.get("documentId"));
  if (access.response) return access.response;
  const [stored, choice] = await Promise.all([
    access.db.from("reinforcement_generations").select("*").eq("request_id", requestId).maybeSingle(),
    access.db.from("reinforcement_requests").select("recommended_type,recommendation_choice_version").eq("id", requestId).maybeSingle(),
  ]);
  if (stored.error || choice.error || !choice.data) return failure();
  const parsed = explanationRecordSchema.nullable().safeParse(stored.data);
  if (!parsed.success) return failure();
  const generation = parsed.data, explanationChosen = choice.data.recommended_type === "explanation";
  const editable = explanationChosen && (access.row.status === "pending" && access.row.stage === "choosing"
    || access.row.status === "error" && access.row.stage === "failed");
  const expired = generation?.status === "processing" && Date.parse(generation.lease_expires_at ?? "") <= Date.now();
  const providerAvailable = getExplanationConfiguration() !== null;
  const view = explanationViewSchema.safeParse({ generation, choiceVersion: choice.data.recommendation_choice_version, explanationChosen, providerAvailable,
    canConfigure: editable && (!generation || ["draft", "error"].includes(generation.status)),
    canGenerate: explanationChosen && providerAvailable && !!generation && generation.choice_version === choice.data.recommendation_choice_version
      && (editable && ["draft", "error"].includes(generation.status) || expired && access.row.stage === "generating"),
  });
  return view.success ? reply(view.data) : failure();
}
export async function postExplanation(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request); if (input.response) return input.response;
  const parsed = explanationInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa el nivel y la versión de la explicación." }, 400);
  const body = parsed.data, access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  const stored = await access.db.from("reinforcement_analyses").select("*").eq("request_id", requestId).maybeSingle();
  if (stored.error) return failure();
  const source = analysisRecordSchema.safeParse(stored.data), analysis = source.success ? source.data : null;
  if (!analysis || analysis.status !== "ready" || !analysis.context?.enough || !analysis.diagnosis?.sufficient)
    return reply({ message: "Primero completa un diagnóstico con contexto suficiente y elige Explicación." }, 409);
  try { validateDiagnosis(analysis.diagnosis, analysis.context); } catch { return failure("PT409"); }
  const config = getExplanationConfiguration();
  // Configuring a level does not call the provider and works during an outage.
  if (body.action === "generate" && !config) return reply({ message: EXPLANATION_MESSAGES.provider_unavailable }, 503);
  const proof = { userId: access.userId, requestId, documentId: body.documentId, analysisAttemptId: analysis.attempt_id,
    choiceVersion: body.choiceVersion, expectedVersion: body.expectedVersion, attemptId: crypto.randomUUID() };
  let claim;
  try { claim = await access.db.rpc("change_reinforcement_explanation", signExplanationProof({ ...proof,
    action: body.action === "configure" ? "configure" : "start", ...(body.action === "configure" ? { level: body.level } : {}) })); }
  catch { return failure(); }
  if (claim.error) return failure(claim.error.code);
  const current = explanationRecordSchema.safeParse(claim.data?.generation);
  if (!current.success) return failure();
  if (body.action === "configure" || claim.data.disposition !== "started")
    return reply({ generation: current.data }, claim.data.disposition === "busy" ? 202 : 200);
  let output: Awaited<ReturnType<typeof generateExplanation>> | null = null, errorCode = null, quota = false;
  try { output = await generateExplanation(analysis.context, analysis.diagnosis, current.data.detail_level, config!); }
  catch (error) { errorCode = error instanceof ExplanationFailure ? error.code : "provider_unavailable"; quota = error instanceof ExplanationFailure && error.quotaExhausted; }
  let saved;
  try { saved = await access.db.rpc("change_reinforcement_explanation", signExplanationProof({ ...proof, action: "finish",
    status: output ? "ready" : "error", content: output?.content ?? null, model: output?.model ?? null, errorCode })); }
  catch { return failure(); }
  if (saved.error) return failure(saved.error.code);
  const result = explanationRecordSchema.safeParse(saved.data?.generation);
  return result.success ? reply({ generation: result.data, ...(quota ? { message: EXPLANATION_MESSAGES.provider_unavailable } : {}) }, quota ? 429 : 200) : failure();
}
