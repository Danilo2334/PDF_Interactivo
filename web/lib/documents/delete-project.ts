import type { createClient } from "@/lib/supabase/server";
import { z } from "zod";

type Client = Awaited<ReturnType<typeof createClient>>;
type CleanupResult = { success: boolean; status: number; message: string };
const snapshotSchema = z.object({ state: z.enum(["pending", "completed"]), storage_paths: z.array(z.string()) });

// SCRUM-144: this is the single cleanup operation used by SCRUM-174 and retries.
export async function deleteOwnedProject(client: Client, input: {
  projectId: string; documentId: string; ownerId: string;
}): Promise<CleanupResult> {
  const { data, error } = await client.rpc("begin_project_deletion", {
    p_project_id: input.projectId, p_expected_document_id: input.documentId,
  });
  if (error) return {
    success: false, status: error.code === "42501" ? 404 : ["PT409", "40001"].includes(error.code ?? "") ? 409 : 503,
    message: ["PT409", "40001"].includes(error.code ?? "") ? "El documento cambió. Recarga y confirma su eliminación nuevamente."
      : error.code === "42501" ? "El documento no está disponible." : "No fue posible iniciar la eliminación. Inténtalo nuevamente.",
  };
  const snapshot = snapshotSchema.safeParse(data);
  if (!snapshot.success || snapshot.data.storage_paths.some(path => !path.startsWith(`${input.ownerId}/`))) {
    return { success: false, status: 503, message: "No fue posible confirmar la limpieza. Revisa el listado antes de reintentar." };
  }
  if (snapshot.data.state === "completed") return { success: true, status: 200, message: "Documento eliminado correctamente." };

  async function failed(stage: "storage" | "records"): Promise<CleanupResult> {
    console.error("Limpieza de documento pendiente:", { stage });
    try {
      await client.rpc("record_project_deletion_failure", { p_project_id: input.projectId, p_stage: stage });
    } catch { console.error("No fue posible registrar el fallo de limpieza."); }
    return { success: false, status: 503, message: "La eliminación está pendiente de limpieza. El contenido ya no está disponible. Reintenta desde Mis documentos." };
  }
  try {
    // Snapshot all media paths while the project is locked against new uploads.
    // Include retired and unfinished resources so their private files do not leak.
    for (let offset = 0; ; offset += 100) {
      const media = await client.from("reinforcement_media").select("storage_path").eq("project_id", input.projectId)
        .eq("owner_id", input.ownerId).not("storage_path", "is", null).order("id").range(offset, offset + 99);
      if (media.error || !Array.isArray(media.data) || media.data.some(row => typeof row.storage_path !== "string" || !row.storage_path.startsWith(`${input.ownerId}/`))) return failed("storage");
      if (media.data.length) {
        const removed = await client.storage.from("reinforcement-media").remove(media.data.map(row => row.storage_path));
        if (removed.error) return failed("storage");
      }
      if (media.data.length < 100) break;
    }
    const paths = snapshot.data.storage_paths;
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await client.storage.from("pdf-documents").remove(paths.slice(index, index + 100));
      if (error) return failed("storage");
    }
  } catch { return failed("storage"); }
  try {
    const { data: finished, error } = await client.rpc("finish_project_deletion", { p_project_id: input.projectId });
    if (error || finished !== true) return failed("records");
  } catch { return failed("records"); }
  return { success: true, status: 200, message: "Documento, versiones y datos vinculados eliminados correctamente." };
}
