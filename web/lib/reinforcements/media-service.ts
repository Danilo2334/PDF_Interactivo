import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { authorizeRequest, readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { allowedMediaUrl, MEDIA_BUCKET, mediaInputSchema, mediaRecordSchema, VIDEO_LIMIT } from "@/lib/validations/reinforcement-media";
import { validateMediaFile } from "@/lib/reinforcements/media-file";
import { signMediaProof } from "@/lib/reinforcements/media-proof";

const fields = "id,reinforcement_id,approved_version_id,kind,title,file_name,mime_type,size_bytes,url,status,created_at,approved_at";
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
function failure(code?: string) {
  const status = code === "42501" ? 403 : ["PT409", "40001", "23514"].includes(code ?? "") ? 409 : code === "P0001" ? 429 : 503;
  return reply({ message: status === 403 ? "No tienes permiso para modificar este recurso." : status === 409 ? "El refuerzo o el recurso cambiaron. Recarga antes de intentarlo nuevamente."
    : status === 429 ? "Se alcanzó el límite de recursos (10 por refuerzo o 100 MB privados por cuenta)." : "No se pudo confirmar el recurso. Reintenta sin cambiar los datos." }, status);
}
async function boundedForm(request: Request) {
  const max = VIDEO_LIMIT + 16384;
  if (Number(request.headers.get("Content-Length") ?? 0) > max) return null;
  const reader = request.body?.getReader(); if (!reader) return null;
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.length; if (size > max) { await reader.cancel(); return null; } chunks.push(chunk.value);
  } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("Content-Type") ?? "" }, body: bytes }).formData();
}
export async function getMedia(request: Request, projectId: string, requestId: string) {
  const query = new URL(request.url).searchParams, access = await authorizeRequest(projectId, requestId, query.get("documentId"));
  if (access.response) return access.response;
  const reinforcementId = query.get("reinforcementId"); if (!z.string().uuid().safeParse(reinforcementId).success) return reply({ message: "Refuerzo no válido." }, 400);
  const rows = await access.db.from("reinforcement_media").select(fields).eq("request_id", requestId).eq("reinforcement_id", reinforcementId)
    .eq("status", "approved").order("created_at");
  const parsed = z.array(mediaRecordSchema).safeParse(rows.data);
  return !rows.error && parsed.success ? reply({ items: parsed.data }) : reply({ message: "No fue posible consultar los recursos. Reintenta." }, 503);
}
export async function postMedia(request: Request, projectId: string, requestId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const access = await authorizeRequest(projectId, requestId, new URL(request.url).searchParams.get("documentId"));
  if (access.response) return access.response;
  try {
    if (request.headers.get("Content-Type")?.startsWith("application/json")) {
      const input = await readSmallJson(request, 1000); if (input.response) return input.response;
      const parsed = z.object({ action: z.literal("remove"), documentId: z.string().uuid(), reinforcementId: z.string().uuid(), assetId: z.string().uuid() }).strict().safeParse(input.body);
      if (!parsed.success || parsed.data.documentId !== access.row.document_id) return reply({ message: "Recurso no válido." }, 400);
      const saved = await access.db.rpc("change_reinforcement_media", signMediaProof({ ...parsed.data, userId: access.userId, requestId }));
      return saved.error ? failure(saved.error.code) : reply({ removed: true, assetId: parsed.data.assetId });
    }
    let form: FormData | null;
    try { form = await boundedForm(request); } catch { return reply({ message: "No se pudo leer el archivo o formulario." }, 400); }
    if (!form) return reply({ message: "El envío supera los 20 MB o está vacío." }, 413);
    if (form.getAll("metadata").length !== 1 || form.getAll("file").length > 1 || [...form.keys()].some(key => !["metadata", "file"].includes(key)))
      return reply({ message: "El formulario contiene campos o archivos inesperados." }, 400);
    let raw: unknown; try { raw = JSON.parse(String(form.get("metadata"))); } catch { return reply({ message: "Datos del recurso no válidos." }, 400); }
    const parsed = mediaInputSchema.safeParse(raw);
    if (!parsed.success || parsed.data.documentId !== access.row.document_id) return reply({ message: "Revisa el título, recurso y aprobación explícita." }, 400);
    const input = parsed.data, file = form.get("file");
    let bytes: Uint8Array | null = null, fileName: string | null = null, mime: string | null = null, storagePath: string | null = null, url: string | null = null;
    if (input.kind === "link") {
      url = allowedMediaUrl(input.url ?? ""); if (!url || file !== null) return reply({ message: "Enlace no permitido. Usa HTTPS y uno de los dominios indicados, sin redirecciones ni credenciales." }, 415);
    } else {
      if (!(file instanceof File) || input.url) return reply({ message: "Selecciona un archivo válido." }, 400);
      const checked = await validateMediaFile(file);
      if ("error" in checked) return reply({ message: checked.error }, file.size > VIDEO_LIMIT ? 413 : 415);
      if (checked.kind !== input.kind) return reply({ message: "El archivo no corresponde al tipo elegido." }, 415);
      bytes = checked.bytes; fileName = file.name; mime = checked.mime;
      storagePath = `${access.userId}/${input.assetId}.${checked.extension}`;
    }
    const metadata = { userId: access.userId, requestId, documentId: input.documentId, reinforcementId: input.reinforcementId,
      approvedVersionId: input.approvedVersionId, assetId: input.assetId, kind: input.kind, title: input.title,
      fileName, mime, size: bytes?.length ?? 0, storagePath, url, fileHash: bytes ? sha(bytes) : null };
    const proof = { ...metadata, inputHash: sha(JSON.stringify(metadata)) };
    const prepared = await access.db.rpc("change_reinforcement_media", signMediaProof({ ...proof, action: "prepare" }));
    if (prepared.error) return failure(prepared.error.code);
    if (prepared.data?.status !== "approved" && bytes && storagePath && mime) {
      const uploaded = await access.db.storage.from(MEDIA_BUCKET).upload(storagePath, bytes, { contentType: mime, upsert: false });
      if (uploaded.error) {
        // An upload may have completed before its response was lost. Verify the
        // private bytes before continuing; never overwrite an existing object.
        const previous = await access.db.storage.from(MEDIA_BUCKET).download(storagePath);
        if (previous.error || !previous.data || sha(new Uint8Array(await previous.data.arrayBuffer())) !== metadata.fileHash) return failure();
      }
    }
    const saved = await access.db.rpc("change_reinforcement_media", signMediaProof({ ...proof, action: "approve" }));
    if (saved.error) return failure(saved.error.code);
    const result = mediaRecordSchema.safeParse(saved.data);
    return result.success && result.data.status === "approved" ? reply({ item: result.data }) : failure();
  } catch { return failure(); }
}
export async function getMediaFile(request: Request, projectId: string, requestId: string, assetId: string) {
  const access = await authorizeRequest(projectId, requestId, new URL(request.url).searchParams.get("documentId"));
  if (access.response) return access.response;
  if (!z.string().uuid().safeParse(assetId).success) return reply({ message: "Recurso no válido." }, 400);
  const row = await access.db.from("reinforcement_media").select("storage_path,mime_type,kind,status").eq("id", assetId).eq("request_id", requestId).eq("status", "approved").maybeSingle();
  if (row.error) return failure();
  if (!row.data?.storage_path || row.data.kind === "link") return reply({ message: "Recurso no disponible." }, 404);
  const range = request.headers.get("Range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return reply({ message: "Rango no válido." }, 416);
  try {
    const signed = await access.db.storage.from(MEDIA_BUCKET).createSignedUrl(row.data.storage_path, 30);
    if (signed.error || !signed.data?.signedUrl) return failure();
    const upstream = await fetch(signed.data.signedUrl, { cache: "no-store", headers: range ? { Range: range } : {}, signal: AbortSignal.timeout(30000), redirect: "error" });
    if (![200, 206, 416].includes(upstream.status)) { await upstream.body?.cancel(); return failure(); }
    const headers = new Headers({ "Content-Type": row.data.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin", "Content-Disposition": "inline", "Accept-Ranges": "bytes" });
    for (const name of ["Content-Length", "Content-Range"]) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch { return failure(); }
}
