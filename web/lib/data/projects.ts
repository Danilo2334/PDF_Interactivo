import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OwnerProject = {
  id: string;
  name: string;
  status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
};

export async function getOwnerProjects(): Promise<OwnerProject[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error consultando proyectos:", error);
    return [];
  }

  return (data ?? []) as OwnerProject[];
}
