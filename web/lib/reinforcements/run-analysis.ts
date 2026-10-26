import "server-only";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { requestRecordSchema } from "@/lib/validations/request-list";
import { analysisInputSchema, analysisRecordSchema, ANALYSIS_MESSAGES, type AnalysisContext, type ContextDiagnosis } from "@/lib/validations/contextual-analysis";
import { buildAnalysisContext } from "@/lib/reinforcements/analysis-context";
import { readAnalysisPage } from "@/lib/pdf/read-analysis-page";
import { analyzeContext, getAnalysisConfiguration, AnalysisFailure } from "@/lib/reinforcements/analysis-provider";
import { signAnalysisProof } from "@/lib/reinforcements/analysis-proof";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function authorize(projectId: string, requestId: string, documentId: string | null) {
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return { response: reply({ message: access.message }, access.status) };
  if (![projectId, requestId, documentId].every(value => z.string().uuid().safeParse(value).success))
    return { response: reply({ message: "La solicitud o el documento no son válidos." }, 400) };
  const db = await createClient();
  const { data: project, error: projectError } = await db.from("projects").select("document_id,status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
  if (projectError) return { response: reply({ message: "No fue posible consultar el proyecto." }, 503) };
  if (!project) return { response: reply({ message: "Proyecto no disponible." }, 404) };
  if (project.document_id !== documentId || project.status === "deleting")
    return { response: reply({ message: "El documento cambió o se está eliminando. Recarga el proyecto." }, 409) };
  const { data: row, error } = await db.from("reinforcement_requests")
    .select("id,project_id,document_id,owner_id,page_number,status,stage,created_at,updated_at,error_message,selection,selected_text,text_source,category,need")
    .eq("id", requestId).eq("owner_id", access.userId).eq("project_id", projectId).eq("document_id", documentId).maybeSingle();
  if (error) return { response: reply({ message: "No fue posible consultar la solicitud." }, 503) };
  if (!row) return { response: reply({ message: "Solicitud no disponible." }, 404) };
  const parsed = requestRecordSchema.safeParse(row);
  if (!parsed.success) return { response: reply({ message: "La selección guardada no pudo verificarse." }, 409) };
  return { db, userId: access.userId, row: parsed.data };
}

type Authorized = Extract<Awaited<ReturnType<typeof authorize>>, { db: unknown }>;
async function withDeadline<T>(operation: PromiseLike<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([operation, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AnalysisFailure("timeout")), milliseconds);
  })]); } finally { clearTimeout(timer); }
}
async function prepare(access: Authorized): Promise<AnalysisContext> {
  const { db, row, userId } = access;
  const { data: document, error } = await db.from("documents").select("storage_path,size_bytes")
    .eq("id", row.document_id).eq("owner_id", userId).maybeSingle();
  if (error || !document || document.size_bytes <= 0 || document.size_bytes > 20 * 1024 * 1024)
    throw new AnalysisFailure("pdf_unavailable");
  const download = await withDeadline(db.storage.from("pdf-documents").download(document.storage_path), 15000);
  if (download.error || !download.data || download.data.size !== document.size_bytes) throw new AnalysisFailure("pdf_unavailable");
  let page;
  try { page = await readAnalysisPage(new Uint8Array(await download.data.arrayBuffer()), row.page_number, row.selection); }
  catch { throw new AnalysisFailure("pdf_unavailable"); }
  // Catch a PDF replacement/deletion that happened while it was being read.
  const current = await db.from("projects").select("document_id,status").eq("id", row.project_id).eq("owner_id", userId).maybeSingle();
  if (current.error || current.data?.document_id !== row.document_id || current.data.status === "deleting")
    throw new AnalysisFailure("pdf_unavailable");
  return buildAnalysisContext(row, page.pageText, page.areaText, page.pdfSha256);
}

function rpcError(code?: string) {
  const status = code === "42501" ? 403 : code === "40001" || code === "23514" ? 409 : code === "P0001" ? 429 : 503;
  const message = status === 403 ? "Ya no tienes permiso para analizar esta solicitud."
    : status === 409 ? "La solicitud cambió. Actualiza el detalle antes de continuar."
    : status === 429 ? "Hay varios análisis recientes o en curso. Espera un momento antes de reintentar."
    : "No fue posible guardar el análisis. Actualiza el detalle antes de reintentar.";
  return reply({ message }, status);
}

export async function getAnalysis(request: Request, projectId: string, requestId: string) {
  const access = await authorize(projectId, requestId, new URL(request.url).searchParams.get("documentId"));
  if (access.response) return access.response;
  const result = await access.db.from("reinforcement_analyses").select("*").eq("request_id", requestId).maybeSingle();
  const parsed = analysisRecordSchema.nullable().safeParse(result.data);
  if (result.error || !parsed.success) return reply({ message: "No fue posible consultar el análisis." }, 503);
  const analysis = parsed.data;
  const retryable = !analysis ? access.row.status === "pending" && access.row.stage === "queued"
    : analysis.status === "error" ? access.row.status === "error"
    : analysis.status === "processing" && access.row.stage === "analyzing" && Date.parse(analysis.lease_expires_at) <= Date.now();
  return reply({ analysis, available: getAnalysisConfiguration() !== null, retryable });
}

export async function postAnalysis(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  // Bound the stream before allocating its body. Only a version and action
  // belong here; the server obtains document context independently.
  const reader = request.body?.getReader();
  if (!reader) return reply({ message: "Solicitud no válida." }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1000) { await reader.cancel(); return reply({ message: "Solicitud demasiado grande." }, 413); }
      chunks.push(chunk.value);
    }
  } catch { return reply({ message: "No fue posible leer la solicitud." }, 400); }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(bytes);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply({ message: "Solicitud no válida." }, 400); }
  const parsed = analysisInputSchema.safeParse(body);
  if (!parsed.success) return reply({ message: "Revisa la operación y el documento." }, 400);
  const access = await authorize(projectId, requestId, parsed.data.documentId);
  if (access.response) return access.response;
  if (parsed.data.action === "prepare") {
    try { return reply({ context: await prepare(access) }); }
    catch (error) { const code = error instanceof AnalysisFailure ? error.code : "pdf_unavailable";
      return reply({ message: ANALYSIS_MESSAGES[code] }, 422); }
  }
  const config = getAnalysisConfiguration();
  if (!config) return reply({ message: ANALYSIS_MESSAGES.provider_unavailable }, 503);
  const proofBase = { userId: access.userId, requestId, documentId: parsed.data.documentId };
  const attemptId = crypto.randomUUID();
  let claim;
  try { claim = await access.db.rpc("change_reinforcement_analysis", signAnalysisProof({ ...proofBase, action: "start", attemptId })); }
  catch { return rpcError(); }
  if (claim.error) return rpcError(claim.error.code);
  const existing = analysisRecordSchema.safeParse(claim.data?.analysis);
  if (!existing.success) return rpcError();
  if (claim.data.disposition !== "started") return reply({ analysis: existing.data, available: true }, claim.data.disposition === "busy" ? 202 : 200);

  let context: AnalysisContext | null = null, diagnosis: ContextDiagnosis | null = null, model: string | null = null;
  let status: "ready" | "insufficient" | "error" = "error", code: string | null = null;
  try {
    context = await prepare(access);
    if (!context.enough) { status = "insufficient"; code = "insufficient_context"; }
    else {
      const result = await analyzeContext(context, config); diagnosis = result.diagnosis; model = result.model;
      status = diagnosis.sufficient ? "ready" : "insufficient"; code = diagnosis.sufficient ? null : "insufficient_context";
    }
  } catch (error) { code = error instanceof AnalysisFailure ? error.code : "provider_unavailable"; }
  let saved;
  try { saved = await access.db.rpc("change_reinforcement_analysis", signAnalysisProof({ ...proofBase, action: "finish", attemptId, status, context, diagnosis, model, errorCode: code })); }
  catch { return rpcError(); }
  if (saved.error) return rpcError(saved.error.code);
  const result = analysisRecordSchema.safeParse(saved.data?.analysis);
  return result.success ? reply({ analysis: result.data, available: true }) : rpcError();
}
