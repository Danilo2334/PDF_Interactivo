import "server-only";
import { z } from "zod";
import { getCurrentAccess, checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { loadReader, ReaderUnavailable, serverClient } from "@/lib/readers/repository";
import { getReaderSession } from "@/lib/readers/session";
import { publicationOrigin } from "@/lib/publications/proof";
import { attachVisitSession, documentVisitor, signReaderOpen, visitSession } from "@/lib/readers/visit-session";
import { readerOpenInputSchema, readerOpenReceiptSchema, visitTotalsSchema } from "@/lib/validations/reader-visits";
export async function postReaderOpen(request: Request, token: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 200); if (input.response) return input.response;
  const parsed = readerOpenInputSchema.safeParse(input.body); if (!parsed.success) return reply({ message: "Referencia de apertura no válida." }, 400);
  try {
    const context = await loadReader(request, token);
    if (context.privateTest) return reply({ recorded: false, visitId: null, occurredAt: null });
    const reader = getReaderSession(request, token);
    if (!reader || context.snapshot.requireIdentification && !reader.identified) return reply({ message: "Actualiza la lectura antes de registrar la apertura." }, 428);
    const access = await getCurrentAccess();
    if (!access.ok && access.status === 503) return reply({ message: "No fue posible comprobar la apertura." }, 503);
    if (access.ok && access.userId === context.ownerId) return reply({ recorded: false, visitId: null, occurredAt: null });
    const session = visitSession(request, parsed.data.operationId), proof = signReaderOpen({ ...parsed.data, publicationId: context.id, publicationHash: context.hash,
      publicationToken: token, accessVersion: context.accessVersion, origin: publicationOrigin(), visitorHash: documentVisitor(context.documentId, session.nonce), identified: reader.identified });
    const result = await context.db.rpc("record_reader_open", proof);
    if (result.error) return reply({ message: "No fue posible registrar la apertura." }, result.error.code === "PT404" ? 404 : result.error.code === "42501" ? 403 : result.error.code === "PT409" ? 409 : 503);
    const receipt = readerOpenReceiptSchema.parse(result.data), response = reply(receipt);
    if (session.cookie) attachVisitSession(response, session.cookie);
    return response;
  } catch (error) { return reply({ message: error instanceof ReaderUnavailable ? error.message : "No fue posible registrar la apertura." }, error instanceof ReaderUnavailable ? error.status : 503); }
}
export async function getVisitTotals(request: Request, projectId: string) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) return reply({ message: access.message }, access.status);
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (![projectId, documentId].every(v => z.string().uuid().safeParse(v).success)) return reply({ message: "Proyecto o documento no válido." }, 400);
  try {
    const db = await createClient();
    let project = await db.from("projects").select("owner_id,document_id,status").eq("id", projectId).maybeSingle();
    if (project.error) return reply({ message: "No fue posible consultar las visitas." }, 503);
    // Admin fallback grants access only to the aggregate, not to another owner's PDF.
    if (!project.data && access.role === "admin") project = await serverClient().from("projects").select("owner_id,document_id,status").eq("id", projectId).maybeSingle();
    if (project.error) return reply({ message: "No fue posible consultar las visitas." }, 503);
    if (!project.data || project.data.owner_id !== access.userId && access.role !== "admin") return reply({ message: "Proyecto no disponible." }, 404);
    if (project.data.document_id !== documentId || project.data.status === "deleting") return reply({ message: "El documento cambió. Actualiza el proyecto." }, 409);
    const result = await db.rpc("get_document_visit_totals", { p_project_id: projectId, p_document_id: documentId });
    if (result.error) return reply({ message: "No fue posible consultar las visitas." }, 503);
    return reply(visitTotalsSchema.parse(result.data));
  } catch { return reply({ message: "No fue posible consultar las visitas." }, 503); }
}
