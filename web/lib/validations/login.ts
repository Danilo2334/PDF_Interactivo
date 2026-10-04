import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo electrónico válido.")
    .toLowerCase(),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export type LoginInput = z.input<typeof loginSchema>;

export type LoginFieldErrors = Partial<
  Record<keyof LoginInput, string>
>;

export function getLoginFieldErrors(
  error: z.ZodError,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      (field === "email" || field === "password") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
