import { z } from "zod";

export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo electrónico válido.")
    .toLowerCase(),
});

export type PasswordRecoveryInput = z.input<
  typeof passwordRecoverySchema
>;

export type PasswordRecoveryFieldErrors = Partial<
  Record<keyof PasswordRecoveryInput, string>
>;

export function getPasswordRecoveryFieldErrors(
  error: z.ZodError,
): PasswordRecoveryFieldErrors {
  const errors: PasswordRecoveryFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (field === "email" && !errors.email) {
      errors.email = issue.message;
    }
  }

  return errors;
}
