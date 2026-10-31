import "server-only";

import { requireActiveUser } from "@/lib/auth/require-active-user";
import { createClient } from "@/lib/supabase/server";

export type OwnerProject = {
  id: string;
  document_id: string;
  name: string;
  status: "pending" | "processing" | "ready" | "failed" | "deleting";
  created_at: string;
  updated_at: string;
};

export async function getOwnerProjects(): Promise<OwnerProject[]> {
  const { userId } = await requireActiveUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, document_id, name, status, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error consultando proyectos:", error);
    throw new Error("No fue posible consultar los proyectos.");
  }

  return (data ?? []) as OwnerProject[];
}

export type PendingProjectDeletion = { project_id: string; document_id: string };
export async function getPendingProjectDeletions(): Promise<PendingProjectDeletion[]> {
  const { userId } = await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_deletions")
    .select("project_id, document_id").eq("owner_id", userId).eq("state", "pending");
  if (error) throw new Error("No fue posible consultar las eliminaciones pendientes.");
  return (data ?? []) as PendingProjectDeletion[];
}
