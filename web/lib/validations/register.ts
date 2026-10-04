import { z } from "zod";

export const registrationSchema = z.object({
  fullName: z.string().trim().min(1, "Ingresa tu nombre completo."),
  email: z.string().trim().email("Ingresa un correo electrónico válido."),
  password: z.string()
    .min(8, "La contraseña debe tener mínimo 8 caracteres.")
    .regex(/[A-Z]/, "Incluye una mayúscula.")
    .regex(/[a-z]/, "Incluye una minúscula.")
    .regex(/[0-9]/, "Incluye un número."),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type RegistrationFieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export function getRegistrationFieldErrors(error: z.ZodError<RegistrationInput>): RegistrationFieldErrors {
  const fields = z.flattenError(error).fieldErrors;
  return {
    fullName: fields.fullName?.[0],
    email: fields.email?.[0],
    password: fields.password?.[0],
  };
}
