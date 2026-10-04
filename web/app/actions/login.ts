"use server";

import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error || !data.user || !data.session) {
    if (
      error?.code === "over_request_rate_limit" ||
      error?.status === 429
    ) {
      return {
        success: false,
        message: "Se realizaron demasiados intentos. Espera unos minutos.",
        errors: {},
      };
    }

    return {
      success: false,
      message: "Correo o contraseña incorrectos.",
      errors: {},
    };
  }

  return {
    success: true,
    message: "Inicio de sesión exitoso.",
    errors: {},
  };
}
