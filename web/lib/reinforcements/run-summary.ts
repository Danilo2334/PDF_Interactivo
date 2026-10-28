import "server-only";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { analysisRecordSchema, validateDiagnosis } from "@/lib/validations/contextual-analysis";
import { summaryInputSchema, summaryRecordSchema, summaryViewSchema, summaryVersionSchema, SUMMARY_MESSAGES } from "@/lib/validations/summary";
import { reviewHeadSchema, reviewEventSchema } from "@/lib/validations/example";
import { getSummaryConfiguration, generateSummary, SummaryFailure } from "@/lib/reinforcements/summary-provider";
import { signSummaryProof } from "@/lib/reinforcements/summary-proof";

function failure(code?: string) {
  const status = code === "42501" ? 403 : ["PT409", "23514"].includes(code ?? "") ? 409 : code === "P0001" ? 429 : 503;
  return reply({ message: status === 403 ? "Ya no tienes permiso para esta solicitud." : status === 409
    ? "La solicitud, la elección o la modalidad cambió. Actualiza antes de continuar." : status === 429
      ? "Hay varias generaciones recientes o en curso. Espera antes de reintentar."
      : "No fue posible confirmar la operación. Actualiza antes de reintentar." }, status);
}
export async function getSummary(request: Request, projectId: string, requestId: string) {
  const access = await authorizeRequest(projectId, requestId, new URL(request.url).searchParams.get("documentId"));
  if (access.response) return access.response;
  const [stored, choice, head, versions, events] = await Promise.all([
    access.db.from("reinforcement_summaries").select("*").eq("request_id", requestId).maybeSingle(),
    access.db.from("reinforcement_requests").select("recommended_type,recommendation_choice_version").eq("id", requestId).maybeSingle(),
    access.db.from("reinforcement_review_heads").select("*").eq("request_id", requestId).maybeSingle(),
    access.db.from("reinforcement_review_versions").select("*").eq("request_id", requestId).order("version", { ascending: false }).limit(20),
    access.db.from("reinforcement_review_events").select("operation_id,request_id,version,action,actor_id,occurred_at").eq("request_id", requestId).order("occurred_at", { ascending: false }).limit(20),
  ]);
  if (stored.error || choice.error || head.error || versions.error || events.error || !choice.data) return failure();
  const review = reviewHeadSchema.nullable().safeParse(head.data);
  const history = summaryVersionSchema.array().safeParse(versions.data), audit = reviewEventSchema.array().safeParse(events.data);
  if (!review.success || !history.success || !audit.success) return failure();
  const parsed = summaryRecordSchema.nullable().safeParse(stored.data);
  if (!parsed.success) return failure();
  const generation = parsed.data, summaryChosen = choice.data.recommended_type === "summary";
  const editable = summaryChosen && (access.row.status === "pending" && access.row.stage === "choosing"
    || access.row.status === "error" && access.row.stage === "failed");
  const expired = generation?.status === "processing" && Date.parse(generation.lease_expires_at ?? "") <= Date.now();
  const providerAvailable = getSummaryConfiguration() !== null;
  const view = summaryViewSchema.safeParse({ review: review.data, versions: history.data, events: audit.data, generation, choiceVersion: choice.data.recommendation_choice_version, summaryChosen, providerAvailable,
    canConfigure: editable && (!generation || ["draft", "error"].includes(generation.status)),
    canGenerate: summaryChosen && providerAvailable && !!generation && generation.choice_version === choice.data.recommendation_choice_version
      && (editable && ["draft", "error"].includes(generation.status) || expired && access.row.stage === "generating"),
  });
  return view.success ? reply(view.data) : failure();
}
export async function postSummary(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request); if (input.response) return input.response;
  const parsed = summaryInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa la extensión y la versión del resumen." }, 400);
  const body = parsed.data, access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  const stored = await access.db.from("reinforcement_analyses").select("*").eq("request_id", requestId).maybeSingle();
  if (stored.error) return failure();
  const source = analysisRecordSchema.safeParse(stored.data), analysis = source.success ? source.data : null;
  if (!analysis || analysis.status !== "ready" || !analysis.context?.enough || !analysis.diagnosis?.sufficient)
    return reply({ message: "Primero completa un diagnóstico con contexto suficiente y elige Resumen." }, 409);
  try { validateDiagnosis(analysis.diagnosis, analysis.context); } catch { return failure("PT409"); }
  const config = getSummaryConfiguration();
  // Saving a modality does not call the provider and works during an outage.
  if (body.action === "generate" && !config) return reply({ message: SUMMARY_MESSAGES.provider_unavailable }, 503);
  const proof = { userId: access.userId, requestId, documentId: body.documentId, analysisAttemptId: analysis.attempt_id,
    choiceVersion: body.choiceVersion, expectedVersion: body.expectedVersion, attemptId: crypto.randomUUID() };
  let claim;
  try { claim = await access.db.rpc("change_reinforcement_summary", signSummaryProof({ ...proof,
    action: body.action === "configure" ? "configure" : "start", ...(body.action === "configure" ? { mode: body.mode } : {}) })); }
  catch { return failure(); }
  if (claim.error) return failure(claim.error.code);
  const current = summaryRecordSchema.safeParse(claim.data?.generation);
  if (!current.success) return failure();
  if (body.action === "configure" || claim.data.disposition !== "started")
    return reply({ generation: current.data }, claim.data.disposition === "busy" ? 202 : 200);
  let output: Awaited<ReturnType<typeof generateSummary>> | null = null, errorCode = null, quota = false;
  try { output = await generateSummary(analysis.context, analysis.diagnosis, current.data.mode, config!); }
  catch (error) { errorCode = error instanceof SummaryFailure ? error.code : "provider_unavailable"; quota = error instanceof SummaryFailure && error.quotaExhausted; }
  let saved;
  try { saved = await access.db.rpc("change_reinforcement_summary", signSummaryProof({ ...proof, action: "finish",
    status: output ? "ready" : "error", content: output?.content ?? null, model: output?.model ?? null, errorCode })); }
  catch { return failure(); }
  if (saved.error) return failure(saved.error.code);
  const result = summaryRecordSchema.safeParse(saved.data?.generation);
  return result.success ? reply({ generation: result.data, ...(quota ? { message: SUMMARY_MESSAGES.provider_unavailable } : {}) }, quota ? 429 : 200) : failure();
}
