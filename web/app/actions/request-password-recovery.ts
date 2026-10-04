"use server";

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

  return {
    success: true,
    message:
      "Si existe una cuenta asociada a este correo, recibirás instrucciones para recuperar tu contraseña.",
    errors: {},
  };
}
