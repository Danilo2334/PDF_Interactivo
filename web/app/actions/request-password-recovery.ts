"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getPasswordRecoveryFieldErrors,
  passwordRecoverySchema,
  type PasswordRecoveryFieldErrors,
  type PasswordRecoveryInput,
} from "@/lib/validations/password-recovery";

export type PasswordRecoveryActionResult = {
  success: boolean;
  message: string;
  errors: PasswordRecoveryFieldErrors;
};

export async function requestPasswordRecoveryAction(
  input: PasswordRecoveryInput,
): Promise<PasswordRecoveryActionResult> {
  const result = passwordRecoverySchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      message: "Revisa el correo ingresado.",
      errors: getPasswordRecoveryFieldErrors(result.error),
    };
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    result.data.email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    return {
      success: false,
      message:
        "No fue posible procesar la solicitud. Inténtalo nuevamente en unos minutos.",
      errors: {},
    };
  }

  return {
    success: true,
    message:
      "Si existe una cuenta asociada a este correo, recibirás instrucciones para recuperar tu contraseña.",
    errors: {},
  };
}
