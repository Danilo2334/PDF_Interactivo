import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/access";
import { databaseRolledBack, isSameOriginMutation } from "@/lib/documents/mutation-request";
import { createClient } from "@/lib/supabase/server";
import { validatePdfFile } from "@/lib/validations/pdf-file";

const identifiers = z.object({ projectId: z.uuid(), documentId: z.uuid() });
const bucket = "pdf-documents";
function result(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isSameOriginMutation(request)) return result("Solicitud no permitida.", 403);
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return result(access.message, access.status);
  const { projectId } = await params;
  let form: FormData;
  try { form = await request.formData(); } catch { return result("No fue posible leer la solicitud.", 400); }
  const ids = identifiers.safeParse({ projectId, documentId: form.get("documentId") });
  if (!ids.success) return result("El documento no está disponible.", 404);
  if (form.get("confirmed") !== "true") return result("Confirma el reemplazo antes de continuar.", 400);

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("document_id, status").eq("id", projectId).eq("owner_id", access.userId).maybeSingle();
  if (projectError) return result("No fue posible consultar el proyecto.", 503);
  if (!project) return result("El documento no está disponible.", 404);
  if (project.document_id !== ids.data.documentId || project.status === "deleting") {
    return result("El documento cambió. Recarga el proyecto antes de reintentar.", 409);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return result("Selecciona el nuevo PDF.", 400);
  const validation = await validatePdfFile(file);
  if (!validation.valid) return result(validation.message, validation.code === "FILE_TOO_LARGE" ? 413 : 422);
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
    if (pdf.getPageCount() < 1) return result("El PDF no contiene páginas válidas.", 422);
  } catch { return result("El PDF está dañado, incompleto o no puede leerse.", 422); }

  const documentId = crypto.randomUUID();
  const path = `${access.userId}/${documentId}.pdf`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: "application/pdf", upsert: false,
  });
  if (uploadError) return result("No fue posible almacenar el reemplazo. El PDF vigente se conserva.", 503);

  const { error } = await supabase.rpc("replace_project_pdf", {
    p_project_id: projectId, p_expected_document_id: ids.data.documentId,
    p_document_id: documentId, p_original_name: file.name, p_storage_path: path, p_size_bytes: file.size,
  });
  if (error) {
    console.error("No se confirmó el reemplazo del PDF:", { code: error.code });
    if (!databaseRolledBack(error.code)) {
      return result("No se pudo confirmar el reemplazo. Recarga el proyecto para comprobar su estado antes de reintentar.", 503);
    }
    const { error: cleanupError } = await supabase.storage.from(bucket).remove([path]);
    if (cleanupError) {
      console.error("Limpieza de reemplazo temporal pendiente.");
      return result("El PDF vigente se conserva. No se completó la limpieza del archivo temporal; inténtalo más tarde.", 503);
    }
    return result(error.code === "40001"
      ? "El documento cambió. Recarga el proyecto antes de reintentar."
      : "No fue posible completar el reemplazo. El PDF vigente se conserva.", error.code === "40001" ? 409 : 503);
  }
  revalidatePath("/documents");
  revalidatePath(`/projects/${projectId}`);
  return result("PDF reemplazado correctamente. Los refuerzos anteriores conservan su versión original.", 200);
}
