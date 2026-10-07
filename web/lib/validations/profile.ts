import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Ingresa tu nombre completo.")
    .min(2, "El nombre debe tener mínimo 2 caracteres.")
    .max(100, "El nombre no puede superar los 100 caracteres.")
    .regex(
      /^[\p{L}\p{M}' -]+$/u,
      "El nombre contiene caracteres no permitidos.",
    ),
});

export type ProfileInput = z.input<typeof profileSchema>;

export type ProfileFieldErrors = Partial<
  Record<keyof ProfileInput, string>
>;

export function getProfileFieldErrors(
  error: z.ZodError,
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (field === "fullName" && !errors.fullName) {
      errors.fullName = issue.message;
    }
  }

  return errors;
}
