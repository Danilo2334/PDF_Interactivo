import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { reply, readSmallJson } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { publicationInputSchema, publicationReceiptSchema } from "@/lib/validations/publication";
import { publicationOrigin, signPublicationProof } from "@/lib/publications/proof";
async function authorize(projectId: string, documentId: string | null) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) return { response: reply({ message: access.message }, access.status) };
  if (![projectId, documentId].every(v => z.string().uuid().safeParse(v).success)) return { response: reply({ message: "Proyecto o documento no válido." }, 400) };
  const db = await createClient();
  const project = await db.from("projects").select("document_id,status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
  if (project.error) return { response: reply({ message: "No fue posible consultar el proyecto." }, 503) };
  if (!project.data) return { response: reply({ message: "Proyecto no disponible." }, 404) };
  if (project.data.document_id !== documentId || project.data.status === "deleting") return { response: reply({ message: "El documento cambió. Recarga el proyecto." }, 409) };
  return { db, userId: access.userId };
}
export async function getPublication(request: Request, projectId: string) {
  try {
    const documentId = new URL(request.url).searchParams.get("documentId"), access = await authorize(projectId, documentId);
    if (access.response) return access.response;
    // Never serialize the private snapshot or answer configuration into this response.
    const result = await access.db!.rpc("change_experience_publication", signPublicationProof({ action: "status", projectId, documentId, userId: access.userId, operationId: randomUUID() }));
    if (result.error) return reply({ message: "No fue posible consultar la publicación." }, 503);
    const latest = publicationReceiptSchema.nullable().parse(result.data);
    return reply({ latest, canPublish: !!publicationOrigin() });
  } catch { return reply({ message: "No fue posible consultar la publicación." }, 503); }
}
export async function postPublication(request: Request, projectId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 1200); if (input.response) return input.response;
  const parsed = publicationInputSchema.safeParse(input.body); if (!parsed.success) return reply({ message: "Revisa la versión y confirma antes de publicar." }, 400);
  try {
    const access = await authorize(projectId, parsed.data.documentId); if (access.response) return access.response;
    const origin = publicationOrigin();
    if (parsed.data.action === "publish" && !origin) return reply({ message: "La publicación por enlace todavía no está habilitada en este entorno. La versión preparada permanece privada." }, 503);
    const proof = signPublicationProof({ ...parsed.data, projectId, userId: access.userId, ...(origin ? { origin } : {}) });
    const result = await access.db!.rpc("change_experience_publication", proof);
    if (result.error) {
      const code = result.error.code, status = code === "PT404" ? 404 : code === "PT409" ? 409 : code === "42501" ? 403 : 503;
      return reply({ message: status === 409 ? "La versión o el documento cambió. Actualiza antes de continuar." : "No fue posible confirmar la publicación. Reintenta sin cambiar la operación." }, status);
    }
    const receipt = publicationReceiptSchema.safeParse(result.data);
    if (!receipt.success) return reply({ message: "No fue posible verificar el resultado. Actualiza la publicación." }, 503);
    return reply({ receipt: receipt.data, canPublish: !!origin });
  } catch { return reply({ message: "No fue posible confirmar la publicación. Reintenta sin cambiar la operación." }, 503); }
}
