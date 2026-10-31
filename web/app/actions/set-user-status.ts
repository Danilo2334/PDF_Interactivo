"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export async function setUserStatusAction(formData: FormData) {
  const access = await checkPermission("users.status.update");

  if (!access.ok) {
    redirect(access.status === 401 ? "/login" : "/admin");
  }

  const userId = formData.get("userId");
  const value = formData.get("isActive");

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    typeof userId !== "string" ||
    !uuidPattern.test(userId) ||
    (value !== "true" && value !== "false")
  ) {
    redirect("/admin?result=invalid");
  }

  if (userId === access.userId) {
    redirect("/admin?result=self");
  }

  const isActive = value === "true";
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: userId,
    p_is_active: isActive,
  });

  if (error) {
    console.error("Error cambiando el estado:", error.code);
    redirect("/admin?result=error");
  }

  revalidatePath("/admin");
  redirect(`/admin?result=${isActive ? "activated" : "blocked"}`);
}
