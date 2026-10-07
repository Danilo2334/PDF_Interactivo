"use server";

import { cookies } from "next/headers";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/server";
import {
  getUpdatePasswordFieldErrors,
  updatePasswordSchema,
  type UpdatePasswordFieldErrors,
  type UpdatePasswordInput,
} from "@/lib/validations/update-password";

export type UpdatePasswordActionResult = {
  success: boolean;
  message: string;
  errors: UpdatePasswordFieldErrors;
};

export async function updatePasswordAction(
  input: UpdatePasswordInput,
): Promise<UpdatePasswordActionResult> {
  const result = updatePasswordSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      message: "Revisa las contraseñas ingresadas.",
      errors: getUpdatePasswordFieldErrors(result.error),
    };
  }

  const cookieStore = await cookies();

  if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== "verified") {
    return {
      success: false,
      message: "El enlace de recuperación es inválido o expiró.",
      errors: {},
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    cookieStore.delete(PASSWORD_RECOVERY_COOKIE);

    return {
      success: false,
      message: "El enlace de recuperación es inválido o expiró.",
      errors: {},
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return {
        success: false,
        message: "La nueva contraseña debe ser diferente a la anterior.",
        errors: {},
      };
    }

    return {
      success: false,
      message: "No fue posible actualizar la contraseña. Solicita un enlace nuevo.",
      errors: {},
    };
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  await supabase.auth.signOut({ scope: "local" });

  return {
    success: true,
    message: "Contraseña actualizada correctamente.",
    errors: {},
  };
}
