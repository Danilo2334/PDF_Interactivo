import { z } from "zod";

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Ingresa una nueva contraseña.")
      .min(8, "La contraseña debe tener mínimo 8 caracteres.")
      .regex(/[A-Z]/, "Incluye al menos una letra mayúscula.")
      .regex(/[a-z]/, "Incluye al menos una letra minúscula.")
      .regex(/[0-9]/, "Incluye al menos un número."),
    confirmPassword: z
      .string()
      .min(1, "Confirma la nueva contraseña."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.input<typeof updatePasswordSchema>;

export type UpdatePasswordFieldErrors = Partial<
  Record<keyof UpdatePasswordInput, string>
>;

export function getUpdatePasswordFieldErrors(
  error: z.ZodError,
): UpdatePasswordFieldErrors {
  const errors: UpdatePasswordFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      (field === "password" || field === "confirmPassword") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
