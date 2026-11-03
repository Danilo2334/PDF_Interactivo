import "server-only";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_PAGE_SIZE, requestListQuerySchema, requestListSchema, requestDetailSchema } from "@/lib/validations/request-list";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const summaryColumns = "id,project_id,document_id,owner_id,page_number,status,stage,created_at,updated_at,error_message";

export async function readRequests(request: Request, projectId: string, requestId?: string): Promise<Response> {
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return reply({ message: access.message }, access.status);
  if (!z.string().uuid().safeParse(projectId).success || requestId && !z.string().uuid().safeParse(requestId).success)
    return reply({ message: "El proyecto o la solicitud no son válidos." }, 400);
  const params = new URL(request.url).searchParams;
  const query = requestListQuerySchema.safeParse({ documentId: params.get("documentId"), status: params.get("status") ?? "all", page: params.get("page") ?? "1" });
  if (!query.success) return reply({ message: "Revisa el documento, el estado y la página del listado." }, 400);
  const { documentId, status, page } = query.data;
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("document_id,status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
  if (projectError) return reply({ message: "No fue posible comprobar el proyecto." }, 503);
  if (!project) return reply({ message: "Proyecto no disponible." }, 404);
  if (project.document_id !== documentId || project.status === "deleting")
    return reply({ message: "El documento cambió o se está eliminando. Recarga el proyecto." }, 409);

  if (!requestId) {
    let rows = supabase.from("reinforcement_requests").select(summaryColumns, { count: "exact" })
      .eq("owner_id", access.userId).eq("project_id", projectId).eq("document_id", documentId);
    if (status !== "all") rows = rows.eq("status", status);
    const { data, error, count } = await rows.order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * REQUEST_PAGE_SIZE, page * REQUEST_PAGE_SIZE - 1);
    const result = requestListSchema.safeParse({ items: data, total: count, page, pageSize: REQUEST_PAGE_SIZE });
    if (error || !result.success) return reply({ message: "No fue posible consultar las solicitudes." }, 503);
    return reply(result.data);
  }

  const { data: row, error: rowError } = await supabase.from("reinforcement_requests")
    .select(`${summaryColumns},selection,selected_text,text_source,category,need`)
    .eq("id", requestId).eq("owner_id", access.userId).eq("project_id", projectId).eq("document_id", documentId).maybeSingle();
  if (rowError) return reply({ message: "No fue posible consultar la solicitud." }, 503);
  if (!row) return reply({ message: "Solicitud no disponible para este documento." }, 404);
  const { data: events, error: eventError, count } = await supabase.from("reinforcement_request_events")
    .select("id,request_id,previous_status,status,previous_stage,stage,actor_kind,actor_id,event_kind,occurred_at", { count: "exact" })
    .eq("request_id", requestId).order("occurred_at", { ascending: false }).order("id", { ascending: false })
    .range((page - 1) * REQUEST_PAGE_SIZE, page * REQUEST_PAGE_SIZE - 1);
  const result = requestDetailSchema.safeParse({ request: row, events, historyPage: page, historyTotal: count, pageSize: REQUEST_PAGE_SIZE });
  if (eventError || !result.success) return reply({ message: "No fue posible consultar el historial de la solicitud." }, 503);
  return reply(result.data);
}
