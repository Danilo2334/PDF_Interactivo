import { z } from "zod";
import { updatePasswordSchema } from "./update-password";

export const changePasswordSchema = updatePasswordSchema.safeExtend({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual.").max(1024),
  password: updatePasswordSchema.shape.password.max(1024),
  confirmPassword: updatePasswordSchema.shape.confirmPassword.max(1024),
}).refine(value => value.currentPassword !== value.password, {
  message: "La nueva contraseña debe ser diferente a la actual.", path: ["password"],
});
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordInput, string>>;
export function changePasswordErrors(error: z.ZodError): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === "currentPassword" || field === "password" || field === "confirmPassword") && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
