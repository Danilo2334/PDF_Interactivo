"use server";

import {
  getLoginFieldErrors,
  loginSchema,
  type LoginFieldErrors,
  type LoginInput,
} from "@/lib/validations/login";

export type LoginActionResult = {
  success: boolean;
  message: string;
  errors: LoginFieldErrors;
};

export async function loginAction(
  input: LoginInput,
): Promise<LoginActionResult> {
  const result = loginSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      message: "Revisa los datos marcados.",
      errors: getLoginFieldErrors(result.error),
    };
  }

  return {
    success: false,
    message: "El servicio de autenticación aún no está disponible.",
    errors: {},
  };
}
