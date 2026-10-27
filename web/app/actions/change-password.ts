"use server";

import { createClient as createAuthClient } from "@supabase/supabase-js";
import { getCurrentAccess } from "@/lib/auth/access";
import { clearLoginSession } from "@/lib/auth/login-session";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, changePasswordErrors, type ChangePasswordInput, type ChangePasswordErrors } from "@/lib/validations/change-password";

type Result = { success: boolean; message: string; errors: ChangePasswordErrors };
export async function changePasswordAction(input: ChangePasswordInput): Promise<Result> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Revisa las contraseñas ingresadas.", errors: changePasswordErrors(parsed.error) };
  const access = await getCurrentAccess();
  if (!access.ok) return { success: false, message: access.message, errors: {} };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || user.id !== access.userId) return { success: false, message: "Inicia sesión nuevamente.", errors: {} };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { success: false, message: "No fue posible verificar la cuenta. Inténtalo más tarde.", errors: {} };

  // Reauthenticate in memory, without replacing the browser's cookies. This
  // verifies the current password even when the project's optional requirement is off.
  const verifier = createAuthClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const verified = await verifier.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
    if (verified.error || verified.data.user?.id !== access.userId) return {
      success: false, message: verified.error?.status === 429 ? "Demasiados intentos. Espera antes de volver a intentarlo." : "No fue posible verificar tu contraseña actual.",
      errors: { currentPassword: "Verifica tu contraseña actual." },
    };
    const freshAccess = await getCurrentAccess();
    if (!freshAccess.ok || freshAccess.userId !== access.userId) return { success: false, message: "Tu sesión ya no permite este cambio. Vuelve a ingresar.", errors: {} };
    const updated = await verifier.auth.updateUser({ password: parsed.data.password, current_password: parsed.data.currentPassword });
    if (updated.error) return { success: false, message: updated.error.code === "same_password" ? "La nueva contraseña debe ser diferente a la anterior."
      : updated.error.code === "weak_password" ? "La nueva contraseña no cumple los requisitos de seguridad."
      : "No fue posible cambiar la contraseña. Inténtalo más tarde.", errors: {} };
    // Revoke existing refresh sessions after rotation; always clear this login.
    await verifier.auth.signOut({ scope: "global" });
    await clearLoginSession();
    await supabase.auth.signOut({ scope: "local" });
    return { success: true, message: "Contraseña actualizada. Inicia sesión con la nueva contraseña.", errors: {} };
  } finally {
    await verifier.auth.signOut({ scope: "local" });
  }
}
