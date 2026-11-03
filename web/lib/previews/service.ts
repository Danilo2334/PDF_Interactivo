import "server-only";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { reply, readSmallJson } from "@/lib/reinforcements/request-service";
import { isSameOriginMutation } from "@/lib/documents/mutation-request";
import { previewGradeInputSchema } from "@/lib/validations/experience-preview";
import { buildPreview, gradeQuiz } from "@/lib/previews/model";
import type { Reinforcement } from "@/lib/types/reinforcement";
async function loadPreview(projectId: string, documentId: string | null) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) return { response: reply({ message: access.message }, access.status) };
  if (![projectId, documentId].every(v => z.string().uuid().safeParse(v).success)) return { response: reply({ message: "Proyecto o documento no válido." }, 400) };
  const db = await createClient(), project = await db.from("projects").select("id,document_id,name,status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
  if (project.error) return { response: reply({ message: "No fue posible abrir la vista previa." }, 503) };
  if (!project.data) return { response: reply({ message: "Proyecto no disponible." }, 404) };
  if (project.data.document_id !== documentId || project.data.status === "deleting") return { response: reply({ message: "El documento cambió. Regresa al editor y recarga el proyecto." }, 409) };
  // Explicit pagination avoids silently truncating projects at the Data API page limit.
  const rows: unknown[] = [], published: Reinforcement[] = [];
  for (let offset = 0; ; offset += 200) {
    const [requests, reinforcements] = await Promise.all([
      db.from("reinforcement_requests").select("id,project_id,document_id,page_number,selection,recommended_type,review:reinforcement_review_heads(*),versions:reinforcement_review_versions(*),quizHead:reinforcement_quiz_heads(*),quizVersions:reinforcement_quiz_versions(*),generation:reinforcement_generations(status,content)")
        .eq("project_id", projectId).eq("document_id", documentId).eq("owner_id", access.userId).order("id").range(offset, offset + 199),
      db.from("reinforcements").select("id,document_id,page_number,title,content,source_request_id,approved_version_id,card:reinforcement_cards(*),source:reinforcement_requests!source_request_id(id,project_id,document_id,page_number,selection),media:reinforcement_media(*)")
        .eq("document_id", documentId).order("id").range(offset, offset + 199),
    ]);
    if (requests.error || reinforcements.error) return { response: reply({ message: "No fue posible consultar el contenido actual. Reintenta la vista previa." }, 503) };
    rows.push(...requests.data ?? []);
    published.push(...(reinforcements.data ?? []).map(p => ({ ...p, card: Array.isArray(p.card) ? p.card[0] ?? null : p.card,
      source: Array.isArray(p.source) ? p.source[0] ?? null : p.source, media: (p.media ?? []).filter(m => m.status === "approved") })) as unknown as Reinforcement[]);
    if ((requests.data?.length ?? 0) < 200 && (reinforcements.data?.length ?? 0) < 200) break;
  }
  return { result: buildPreview(project.data, published, rows) };
}
export async function getExperiencePreview(request: Request, projectId: string) {
  try { const loaded = await loadPreview(projectId, new URL(request.url).searchParams.get("documentId")); return loaded.response ?? reply(loaded.result!.view); }
  catch { return reply({ message: "No fue posible validar la vista previa. Regresa al editor y revisa el contenido." }, 503); }
}
export async function postPreviewGrade(request: Request, projectId: string) {
  if (!isSameOriginMutation(request)) return reply({ message: "Origen de la solicitud no permitido." }, 403);
  const input = await readSmallJson(request, 1500); if (input.response) return input.response;
  const parsed = previewGradeInputSchema.safeParse(input.body); if (!parsed.success) return reply({ message: "Responde todas las preguntas antes de comprobar." }, 400);
  try {
    const loaded = await loadPreview(projectId, parsed.data.documentId); if (loaded.response) return loaded.response;
    const quiz = loaded.result!.grading.get(parsed.data.quizVersionId);
    if (!quiz || quiz.requestId !== parsed.data.requestId || quiz.sourceVersionId !== parsed.data.sourceVersionId) return reply({ message: "El quiz o su fuente cambió. Actualiza la vista previa." }, 409);
    let feedback; try { feedback = gradeQuiz(quiz.content, parsed.data.answers); } catch { return reply({ message: "Responde cada pregunta con una opción válida." }, 400); }
    // Read-only evaluation: never inserts reader attempts or modifies review state.
    return reply({ feedback });
  } catch { return reply({ message: "No fue posible comprobar las respuestas de prueba. Reintenta." }, 503); }
}
