import "server-only";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { requestRecordSchema } from "@/lib/validations/request-list";

export const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function authorizeRequest(projectId: string, requestId: string, documentId: string | null) {
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

export async function readSmallJson(request: Request): Promise<{ body: unknown; response?: never } | { response: Response; body?: never }> {
  // Bound the stream before allocating its body. Only a version and action
  // belong here; the server obtains document context independently.
  const reader = request.body?.getReader();
  if (!reader) return { response: reply({ message: "Solicitud no válida." }, 400) };
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1000) { await reader.cancel(); return { response: reply({ message: "Solicitud demasiado grande." }, 413) }; }
      chunks.push(chunk.value);
    }
  } catch { return { response: reply({ message: "No fue posible leer la solicitud." }, 400) }; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(bytes);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return { response: reply({ message: "Solicitud no válida." }, 400) }; }
  return { body };
}
