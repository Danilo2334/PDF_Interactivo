import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { generateQuiz, getQuizConfiguration, QuizFailure } from "@/lib/reinforcements/quiz-provider";
import { signQuizProof } from "@/lib/reinforcements/quiz-proof";
import { quizInputSchema, quizJobSchema, quizHeadSchema, quizSourceSchema, quizContentSchema, quizViewSchema, QUIZ_MESSAGES } from "@/lib/validations/quiz";

const jobFields = "operation_id,request_id,source_version_id,expected_version,question_count,status,started_at,lease_expires_at,finished_at,result_version,error_code,model";
function failure(code?: string) {
  const status = code === "42501" ? 403 : ["PT409", "40001", "23514"].includes(code ?? "") ? 409 : code === "P0001" ? 429 : 503;
  return reply({ message: status === 403 ? "Ya no tienes permiso para este quiz privado." : status === 409
    ? "La fuente, elección o versión cambió, o hay una generación en curso. Actualiza antes de continuar."
    : status === 429 ? "Hay varios intentos recientes. Espera antes de generar otro quiz." : "No se pudo confirmar la operación del quiz. Actualiza o reintenta sin cambiar los datos." }, status);
}
export async function getQuiz(request: Request, projectId: string, requestId: string) {
  const query = new URL(request.url).searchParams, access = await authorizeRequest(projectId, requestId, query.get("documentId"));
  if (access.response) return access.response;
  const sourceId = query.get("sourceVersionId");
  if (!z.string().uuid().safeParse(sourceId).success) return reply({ message: "Selecciona una versión del refuerzo válida." }, 400);
  try {
    const source = await access.db.rpc("get_reinforcement_quiz_source", { p_request_id: requestId, p_document_id: query.get("documentId"), p_source_version_id: sourceId });
    if (source.error) return failure(source.error.code);
    const results = await Promise.all([
      access.db.from("reinforcement_quiz_heads").select("*").eq("request_id", requestId).maybeSingle(),
      access.db.from("reinforcement_quiz_versions").select("*").eq("request_id", requestId).order("version", { ascending: false }).limit(20),
      access.db.from("reinforcement_quiz_events").select("operation_id,request_id,version,action,actor_id,occurred_at").eq("request_id", requestId).order("occurred_at", { ascending: false }).limit(20),
      access.db.from("reinforcement_quiz_jobs").select(jobFields).eq("request_id", requestId).order("started_at", { ascending: false }).limit(1),
    ]);
    if (results.some(result => result.error)) return failure();
    const head = results[0].data, versions = results[1].data ?? [];
    let approved = versions.find(v => v.id === head?.approved_version_id) ?? null;
    if (head?.approved_version_id && !approved) {
      const older = await access.db.from("reinforcement_quiz_versions").select("*").eq("request_id", requestId).eq("id", head.approved_version_id).maybeSingle();
      if (older.error || !older.data) return failure(); approved = older.data;
    }
    const latestJob = results[3].data?.[0] ?? null;
    const parsed = quizViewSchema.safeParse({ source: source.data, head, versions, approvedVersion: approved, events: results[2].data,
      job: latestJob, processing: latestJob?.status === "processing" && Date.parse(latestJob.lease_expires_at) > Date.now(), providerAvailable: getQuizConfiguration() !== null });
    return parsed.success && parsed.data.source?.requestId === requestId && parsed.data.source.documentId === access.row.document_id
      && parsed.data.source.versionId === sourceId && parsed.data.versions.every(v => v.request_id === requestId && v.source.documentId === access.row.document_id)
      ? reply(parsed.data) : failure();
  } catch { return failure(); }
}
export async function postQuiz(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 24000); if (input.response) return input.response;
  const parsed = quizInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Revisa la elección, cantidad de preguntas, respuestas y versión. Aprobar requiere confirmación explícita." }, 400);
  const body = parsed.data, access = await authorizeRequest(projectId, requestId, body.documentId);
  if (access.response) return access.response;
  const proof = { ...body, userId: access.userId, requestId, inputHash: createHash("sha256").update(JSON.stringify({ ...body, userId: access.userId, requestId })).digest("hex") };
  try {
    if (body.action !== "generate") {
      const saved = await access.db.rpc("change_reinforcement_quiz", signQuizProof(proof));
      if (saved.error) return failure(saved.error.code);
      const head = quizHeadSchema.safeParse(saved.data?.head);
      return head.success ? reply({ head: head.data }) : failure();
    }
    const config = getQuizConfiguration(); if (!config) return reply({ message: QUIZ_MESSAGES.provider_unavailable }, 503);
    const claim = await access.db.rpc("change_reinforcement_quiz", signQuizProof({ ...proof, action: "start" }));
    if (claim.error) return failure(claim.error.code);
    if (claim.data?.disposition !== "started") {
      const job = claim.data?.job ? quizJobSchema.safeParse(claim.data.job) : null;
      if (claim.data?.job && !job?.success) return failure();
      return reply({ job: job?.success ? job.data : null }, claim.data?.disposition === "busy" ? 202 : 200);
    }
    let output: Awaited<ReturnType<typeof generateQuiz>> | null = null, errorCode: QuizFailure["code"] = "invalid_quiz", quota = false;
    try {
      const source = quizSourceSchema.parse(claim.data.source), previous = claim.data.previous ? quizContentSchema.parse(claim.data.previous) : undefined;
      if (source.requestId !== requestId || source.documentId !== body.documentId || source.versionId !== body.sourceVersionId || source.pageNumber !== access.row.page_number)
        throw new QuizFailure("invalid_quiz");
      output = await generateQuiz(source, body.questionCount, config, fetch, previous);
    } catch (error) { if (error instanceof QuizFailure) { errorCode = error.code; quota = error.quotaExhausted; } }
    const saved = await access.db.rpc("change_reinforcement_quiz", signQuizProof({ ...proof, action: "finish", status: output ? "ready" : "error",
      content: output?.content ?? null, model: output?.model ?? null, errorCode: output ? null : errorCode }));
    if (saved.error) return failure(saved.error.code);
    const job = quizJobSchema.safeParse(saved.data?.job);
    return job.success ? reply({ job: job.data, ...(job.data.error_code ? { message: QUIZ_MESSAGES[job.data.error_code] } : {}) }, quota ? 429 : 200) : failure();
  } catch { return failure(); }
}
