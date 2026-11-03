import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { reply } from "@/lib/reinforcements/request-service";
import { readerSnapshotSchema, validateSnapshotSources } from "@/lib/readers/model";
import { consolidateQuizResults, type ResultPublication } from "@/lib/readers/quiz-results";
export async function getQuizResults(request: Request, projectId: string) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) return reply({ message: access.message }, access.status);
  const params = new URL(request.url).searchParams, documentId = params.get("documentId"), page = Number(params.get("page") ?? "1");
  if (![projectId, documentId].every(v => z.string().uuid().safeParse(v).success) || !Number.isSafeInteger(page) || page < 1) return reply({ message: "Proyecto, documento o página no válidos." }, 400);
  try {
    const db = await createClient(), through = new Date().toISOString();
    // No privileged fallback: another owner's answers remain private even for an admin.
    const project = await db.from("projects").select("document_id,status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
    if (project.error) throw Error("Project query failed");
    if (!project.data) return reply({ message: "Proyecto no disponible." }, 404);
    if (project.data.document_id !== documentId || project.data.status === "deleting") return reply({ message: "El documento cambió o se está eliminando. Actualiza el proyecto." }, 409);
    const available = await db.from("documents").select("id,status").eq("id", documentId).eq("owner_id", access.userId).maybeSingle();
    if (available.error) throw Error("Document query failed");
    if (!available.data || !["uploaded", "ready"].includes(available.data.status)) return reply({ message: "Documento no disponible para consultar resultados." }, 409);
    const publications = await db.from("experience_publications").select("id,owner_id,version,snapshot,snapshot_hash").eq("owner_id", access.userId).eq("project_id", projectId).eq("document_id", documentId)
      .not("published_at", "is", null).lte("published_at", through).order("version", { ascending: true });
    if (publications.error) throw Error("Publication query failed");
    const catalog: ResultPublication[] = (publications.data ?? []).map(row => {
      const snapshot = readerSnapshotSchema.parse(row.snapshot); validateSnapshotSources(snapshot, access.userId, documentId!);
      return { id: row.id, ownerId: row.owner_id, version: row.version, hash: row.snapshot_hash, snapshot };
    });
    const rows: unknown[] = [], ids = catalog.map(p => p.id);
    if (ids.length) for (let offset = 0; ; offset += 500) {
      const attempts = await db.from("quiz_reader_attempts").select("id,publication_id,quiz_version_id,owner_id,reader_id,publication_hash,attempt_number,answers,score,total,feedback,created_at")
        .eq("owner_id", access.userId).in("publication_id", ids).lte("created_at", through).order("id", { ascending: true }).range(offset, offset + 499);
      if (attempts.error) throw Error("Attempt query failed");
      rows.push(...attempts.data ?? []);
      if ((attempts.data?.length ?? 0) < 500) break;
      // Never show a partial aggregate as complete when the bounded read budget is exceeded.
      if (offset >= 9500) return reply({ message: "No fue posible completar la consulta de todos los resultados. Reintenta más tarde." }, 503);
    }
    const secret = process.env.REINFORCEMENT_REQUEST_SECRET;
    if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw Error("Signing unavailable");
    const result = consolidateQuizResults(catalog, rows, through, page, id => "Lector " + createHmac("sha256", secret).update(`quiz-result:${documentId}:${id}`).digest("hex").slice(0, 12));
    const [current, currentProject] = await Promise.all([
      db.from("documents").select("id").eq("id", documentId).eq("owner_id", access.userId).maybeSingle(),
      db.from("projects").select("document_id,status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle(),
    ]);
    if (current.error || currentProject.error) throw Error("Availability query failed");
    if (!current.data || !currentProject.data || currentProject.data.document_id !== documentId || currentProject.data.status === "deleting") return reply({ message: "El documento dejó de estar disponible. Actualiza el proyecto." }, 409);
    return reply(result);
  } catch { return reply({ message: "No fue posible consultar los resultados del quiz. Reintenta." }, 503); }
}
