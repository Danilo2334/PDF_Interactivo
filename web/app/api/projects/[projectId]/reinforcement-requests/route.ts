import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { checkPermission } from "@/lib/auth/access";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { createClient } from "@/lib/supabase/server";
import { reinforcementRequestSchema } from "@/lib/validations/reinforcement-request";
import { requestHash, signRequestProof } from "@/lib/reinforcements/request-proof";

export const runtime = "nodejs";
const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return reply({ message: access.message }, access.status);
  const { projectId } = await params;
  if (!z.string().uuid().safeParse(projectId).success) return reply({ message: "Proyecto no válido." }, 400);
  const raw = await request.text();
  if (raw.length > 150_000) return reply({ message: "El contenido de la solicitud es demasiado grande." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply({ message: "La solicitud no tiene un formato válido." }, 400); }
  const parsed = reinforcementRequestSchema.safeParse(body);
  if (!parsed.success) return reply({ message: "Completa el texto, la dificultad y una selección coherente con la página y el documento." }, 400);
  const { content, idempotencyKey } = parsed.data;
  const supabase = await createClient();
  const hash = requestHash(projectId, content);
  const { data: existing, error: lookupError } = await supabase.from("reinforcement_requests")
    .select("id, input_hash, created_at, status").eq("owner_id", access.userId).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (lookupError) return reply({ message: "No fue posible comprobar el envío. Reintenta conservando el borrador." }, 503);
  if (existing) {
    if (existing.input_hash !== hash) return reply({ message: "Este identificador ya corresponde a otro contenido. Prepara una nueva solicitud." }, 409);
    return reply({ request: { id: existing.id, status: existing.status, createdAt: existing.created_at } }, 200);
  }
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("document_id, status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
  if (projectError) return reply({ message: "No fue posible consultar el proyecto." }, 503);
  if (!project) return reply({ message: "Proyecto no disponible." }, 404);
  if (project.document_id !== content.documentId || project.status === "deleting") return reply({ message: "El documento cambió o se está eliminando. Recarga el proyecto y prepara otra solicitud." }, 409);
  const { data: document, error: documentError } = await supabase.from("documents")
    .select("storage_path, size_bytes").eq("id", content.documentId).eq("owner_id", access.userId).maybeSingle();
  if (documentError) return reply({ message: "No fue posible consultar el documento." }, 503);
  if (!document) return reply({ message: "Documento no disponible." }, 404);
  const { data: file, error: downloadError } = await supabase.storage.from("pdf-documents").download(document.storage_path);
  if (downloadError || !file) return reply({ message: "No fue posible verificar el PDF. Reintenta conservando el borrador." }, 503);
  if (file.size !== document.size_bytes || file.size > 20 * 1024 * 1024) return reply({ message: "La versión del archivo no coincide con el documento registrado." }, 409);
  let pageCount: number;
  try { pageCount = (await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false })).getPageCount(); }
  catch { return reply({ message: "No fue posible leer las páginas del PDF." }, 422); }
  if (content.pageNumber > pageCount) return reply({ message: "La página seleccionada no existe en este PDF." }, 422);
  let proof: ReturnType<typeof signRequestProof>;
  try { proof = signRequestProof({ userId: access.userId, projectId, content, idempotencyKey, pageCount, storagePath: document.storage_path, sizeBytes: document.size_bytes }); }
  catch { return reply({ message: "El envío todavía no está habilitado. El borrador se conserva." }, 503); }
  const { data: result, error } = await supabase.rpc("create_reinforcement_request", proof);
  if (error) {
    if (error.code === "PT409" || error.code === "40001" || error.code === "23505") return reply({ message: "La versión o el contenido del envío cambió. Recarga el proyecto y prepara otra solicitud." }, 409);
    if (error.code === "42501") return reply({ message: "No tienes permiso para enviar esta solicitud." }, 403);
    return reply({ message: "No pudimos confirmar el envío. Reintenta sin cambiar el contenido para evitar duplicados." }, 503);
  }
  return reply({ request: result.request }, result.created ? 201 : 200);
}
