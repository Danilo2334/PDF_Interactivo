import "server-only";
import { z } from "zod";
import { checkPermission, getCurrentAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { readSmallJson, reply } from "@/lib/reinforcements/request-service";
import { loadReader, ReaderUnavailable, serverClient } from "@/lib/readers/repository";
import { readerObjectId } from "@/lib/readers/model";
import { getReaderSession } from "@/lib/readers/session";
import { publicationOrigin } from "@/lib/publications/proof";
import { documentVisitor, signReinforcementOpen, visitSession } from "@/lib/readers/visit-session";
import { reinforcementOpenInputSchema, reinforcementOpenReceiptSchema, reinforcementUsageSchema } from "@/lib/validations/reinforcement-opens";

export async function postReinforcementOpen(request: Request, token: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 50000); if (input.response) return input.response;
  const parsed = reinforcementOpenInputSchema.safeParse(input.body);
  if (!parsed.success) return reply({ message: "Referencia de consulta no válida." }, 400);
  try {
    const context = await loadReader(request, token);
    if (context.privateTest) return reply({ recorded: false, count: 0 });
    const reader = getReaderSession(request, token);
    if (!reader || context.snapshot.requireIdentification && !reader.identified) return reply({ message: "Actualiza la lectura antes de registrar la consulta." }, 428);
    const access = await getCurrentAccess();
    if (!access.ok && access.status === 503) return reply({ message: "No fue posible comprobar la consulta." }, 503);
    if (access.ok && access.userId === context.ownerId) return reply({ recorded: false, count: 0 });
    const session = visitSession(request);
    if (session.cookie) return reply({ message: "Actualiza la lectura para renovar la visita." }, 428);
    const catalog = new Map(context.snapshot.items.map(i => [readerObjectId(context.hash, "r", i.id), i]));
    const items = [];
    for (const ref of parsed.data.items) {
      const item = catalog.get(ref.id);
      if (!item || item.pageNumber !== ref.pageNumber) return reply({ message: "El refuerzo no corresponde a esta página y publicación." }, 409);
      items.push({ id: item.id, pageNumber: item.pageNumber });
    }
    const proof = signReinforcementOpen({ operationId: parsed.data.operationId, visitId: parsed.data.visitId, items,
      publicationId: context.id, publicationHash: context.hash, publicationToken: token, accessVersion: context.accessVersion,
      origin: publicationOrigin(), visitorHash: documentVisitor(context.documentId, session.nonce), identified: reader.identified });
    const result = await context.db.rpc("record_reinforcement_open", proof);
    if (result.error) return reply({ message: "No fue posible registrar la consulta." }, result.error.code === "PT404" ? 404 : result.error.code === "42501" ? 403 : result.error.code === "PT409" ? 409 : 503);
    return reply(reinforcementOpenReceiptSchema.parse(result.data));
  } catch (error) { return reply({ message: error instanceof ReaderUnavailable ? error.message : "No fue posible registrar la consulta." }, error instanceof ReaderUnavailable ? error.status : 503); }
}

export async function getReinforcementUsage(request: Request, projectId: string) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) return reply({ message: access.message }, access.status);
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (![projectId, documentId].every(v => z.string().uuid().safeParse(v).success)) return reply({ message: "Proyecto o documento no válido." }, 400);
  try {
    const db = await createClient(), privileged = serverClient();
    let project = await db.from("projects").select("owner_id,document_id,status").eq("id", projectId).maybeSingle();
    if (!project.error && !project.data && access.role === "admin") project = await privileged.from("projects").select("owner_id,document_id,status").eq("id", projectId).maybeSingle();
    if (project.error) throw Error("Query failed");
    if (!project.data || project.data.owner_id !== access.userId && access.role !== "admin") return reply({ message: "Proyecto no disponible." }, 404);
    if (project.data.document_id !== documentId || project.data.status === "deleting") return reply({ message: "El documento cambió. Actualiza el proyecto." }, 409);
    // Snapshot contents remain server-only. Admin aggregate access grants no access to another owner's PDF or quiz keys.
    const [usage, publications] = await Promise.all([
      db.rpc("get_reinforcement_open_totals", { p_project_id: projectId, p_document_id: documentId }),
      privileged.from("experience_publications").select("snapshot,version").eq("project_id", projectId).eq("document_id", documentId).eq("owner_id", project.data.owner_id).not("published_at", "is", null).order("version", { ascending: true }),
    ]);
    if (usage.error || publications.error) throw Error("Query failed");
    const parsed = reinforcementUsageSchema.parse(usage.data), catalog = new Map(parsed.rows.map(row => [row.id, row]));
    for (const publication of publications.data ?? []) for (const item of publication.snapshot.items) {
      const previous = catalog.get(item.id);
      catalog.set(item.id, { id: item.id, pageNumber: item.pageNumber, title: item.title, frequency: previous?.frequency ?? 0, visits: previous?.visits ?? 0, percentage: previous?.percentage ?? 0 });
    }
    return reply(reinforcementUsageSchema.parse({ ...parsed, rows: [...catalog.values()].sort((a, b) => a.pageNumber - b.pageNumber || a.title.localeCompare(b.title, "es")) }));
  } catch { return reply({ message: "No fue posible consultar el uso de refuerzos." }, 503); }
}
