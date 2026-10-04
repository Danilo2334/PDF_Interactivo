import { z } from "zod";

export const registrationSchema = z.object({
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

  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu correo electrónico.")
    .email("Ingresa un correo electrónico válido.")
    .toLowerCase(),

  password: z
    .string()
    .min(1, "Crea una contraseña.")
    .min(8, "La contraseña debe tener mínimo 8 caracteres.")
    .regex(/[A-Z]/, "Incluye al menos una letra mayúscula.")
    .regex(/[a-z]/, "Incluye al menos una letra minúscula.")
    .regex(/[0-9]/, "Incluye al menos un número."),
});

export type RegistrationInput = z.input<typeof registrationSchema>;

export type RegistrationFieldErrors = Partial<
  Record<keyof RegistrationInput, string>
>;

export function getRegistrationFieldErrors(
  error: z.ZodError,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      (field === "fullName" ||
        field === "email" ||
        field === "password") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}