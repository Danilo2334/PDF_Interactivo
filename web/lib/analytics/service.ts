import "server-only";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { reply } from "@/lib/reinforcements/request-service";
import { analyticsFilterSchema, documentAnalyticsSchema, type AnalyticsDocument } from "@/lib/validations/analytics";
import { analyticsCsv } from "@/lib/analytics/csv";

export async function analyticsDocuments(): Promise<AnalyticsDocument[]> {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) throw Error(access.message);
  const db = await createClient(), result: AnalyticsDocument[] = [];
  for (let offset = 0; ; offset += 200) {
    const projects = await db.from("projects").select("id,document_id,name,status").eq("owner_id", access.userId).neq("status", "deleting").order("id").range(offset, offset + 199);
    if (projects.error) throw Error("No fue posible consultar tus documentos.");
    const ids = (projects.data ?? []).map(p => p.document_id);
    if (ids.length) {
      const documents = await db.from("documents").select("id").eq("owner_id", access.userId).in("id", ids).in("status", ["uploaded", "ready"]);
      if (documents.error) throw Error("No fue posible consultar tus documentos.");
      const available = new Set(documents.data?.map(d => d.id));
      for (const p of projects.data ?? []) if (available.has(p.document_id)) result.push({ id: p.document_id, projectId: p.id, name: p.name });
    }
    if ((projects.data?.length ?? 0) < 200) break;
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id));
}

export async function getAnalytics(request: Request) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) return reply({ message: access.message }, access.status);
  const params = new URL(request.url).searchParams;
  const parsed = analyticsFilterSchema.safeParse({ projectId: params.get("projectId"), documentId: params.get("documentId"), from: params.get("from"), to: params.get("to"), through: params.get("through") ?? undefined });
  if (!parsed.success || parsed.data.through && Date.parse(parsed.data.through) > Date.now() + 1000 || params.has("format") && params.get("format") !== "csv") return reply({ message: "Elige un documento y un periodo válido. La fecha inicial no puede superar la final." }, 400);
  try {
    const db = await createClient(), f = parsed.data;
    const project = await db.from("projects").select("document_id,status").eq("id", f.projectId).eq("owner_id", access.userId).maybeSingle();
    if (project.error) throw Error("Project query failed");
    if (!project.data) return reply({ message: "Documento no disponible." }, 404);
    if (project.data.document_id !== f.documentId || project.data.status === "deleting") return reply({ message: "El documento cambió o se está eliminando. Actualiza el panel." }, 409);
    const through = f.through ?? new Date().toISOString();
    const result = await db.rpc("get_document_analytics", { p_project_id: f.projectId, p_document_id: f.documentId, p_from: f.from, p_to: f.to, p_through: through });
    if (result.error) return reply({ message: "No fue posible consultar la analítica de este documento." }, result.error.code === "PT404" ? 404 : result.error.code === "42501" ? 403 : result.error.code === "23514" ? 400 : 503);
    const data = documentAnalyticsSchema.parse(result.data);
    if (data.document.id !== f.documentId || data.document.projectId !== f.projectId || data.from !== f.from || data.to !== f.to || Date.parse(data.through) !== Date.parse(through)) throw Error("Unexpected analytics scope");
    // Recheck removal/replacement after the aggregate, including document tombstones through RLS.
    const [current, document] = await Promise.all([
      db.from("projects").select("document_id,status").eq("id", f.projectId).eq("owner_id", access.userId).maybeSingle(),
      db.from("documents").select("id,status").eq("id", f.documentId).eq("owner_id", access.userId).maybeSingle(),
    ]);
    if (current.error || document.error) throw Error("Availability query failed");
    if (!current.data || current.data.document_id !== f.documentId || current.data.status === "deleting" || !document.data || !["uploaded", "ready"].includes(document.data.status)) return reply({ message: "El documento dejó de estar disponible. Actualiza el panel." }, 409);
    if (params.get("format") === "csv") return new Response(analyticsCsv(data), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="analitica-${f.documentId}-${f.from}-${f.to}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    return reply(data);
  } catch { return reply({ message: "No fue posible consultar la analítica completa. Reintenta." }, 503); }
}
