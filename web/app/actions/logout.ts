"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LogoutActionState } from "@/lib/auth/logout-state";

export async function logoutAction(
  _previousState: LogoutActionState,
): Promise<LogoutActionState> {
  void _previousState;

  let failureMessage: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      failureMessage = "No fue posible cerrar la sesión. Inténtalo nuevamente.";
    }
  } catch {
    failureMessage = "No fue posible cerrar la sesión. Inténtalo nuevamente.";
  }

  if (failureMessage) {
    return {
      message: failureMessage,
      tone: "error",
    };
  }

  redirect("/login?logout=success");
}
