"use server";

import {
  getRegistrationFieldErrors,
  registrationSchema,
  type RegistrationFieldErrors,
  type RegistrationInput,
} from "@/lib/validations/register";

export type RegistrationActionResult = {
  success: boolean;
  message: string;
  errors: RegistrationFieldErrors;
};

export async function validateRegistrationAction(
  input: RegistrationInput,
): Promise<RegistrationActionResult> {
  const result = registrationSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      message: "Revisa los datos marcados.",
      errors: getRegistrationFieldErrors(result.error),
    };
  }

  return {
    success: true,
    message: "Información validada correctamente.",
    errors: {},
  };
}