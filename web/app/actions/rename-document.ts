"use server";

import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { renameDocumentSchema, type RenameDocumentInput } from "@/lib/validations/rename-document";

export type RenameDocumentResult = {
  success: boolean;
  message: string;
  nameError?: string;
};

export async function renameDocumentAction(input: RenameDocumentInput): Promise<RenameDocumentResult> {
  const access = await checkPermission("documents.manage.own");
  if (!access.ok) return { success: false, message: access.message };

  const parsed = renameDocumentSchema.safeParse(input);
  if (!parsed.success) {
    const nameError = parsed.error.issues.find((issue) => issue.path[0] === "name")?.message;
    return { success: false, message: nameError ?? "El documento no está disponible.", nameError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.projectId)
    .eq("owner_id", access.userId)
    .select("id, name, updated_at")
    .maybeSingle();

  if (error) return { success: false, message: "No fue posible guardar el nombre. Inténtalo nuevamente." };
  if (!data) return { success: false, message: "El documento no está disponible." };

  // El trigger projects_set_updated_at guarda la fecha en la misma actualización.
  revalidatePath("/documents");
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { success: true, message: "Nombre actualizado correctamente." };
}
