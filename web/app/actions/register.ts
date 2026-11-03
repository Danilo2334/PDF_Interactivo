"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function registerOwnerAction(
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
      },
    },
  });

  if (error) {
    if (
      error.code === "user_already_exists" ||
      error.code === "email_exists"
    ) {
      return {
        success: false,
        message: "Este correo ya está registrado.",
        errors: {
          email: "Este correo ya está registrado.",
        },
      };
    }

    if (error.code === "weak_password") {
      return {
        success: false,
        message: "La contraseña no cumple los requisitos.",
        errors: {
          password: "La contraseña no cumple los requisitos.",
        },
      };
    }

    if (error.code === "over_email_send_rate_limit") {
      return {
        success: false,
        message:
          "Se realizaron demasiados intentos. Espera unos minutos.",
        errors: {},
      };
    }

    return {
      success: false,
      message:
        "No fue posible crear la cuenta. Inténtalo nuevamente.",
      errors: {},
    };
  }

  const identities = data.user?.identities;

  if (
    data.user &&
    Array.isArray(identities) &&
    identities.length === 0
  ) {
    return {
      success: false,
      message: "Este correo ya está registrado.",
      errors: {
        email: "Este correo ya está registrado.",
      },
    };
  }

  if (!data.user) {
    return {
      success: false,
      message:
        "No fue posible crear la cuenta. Inténtalo nuevamente.",
      errors: {},
    };
  }

  return {
    success: true,
    message: data.session
      ? "Cuenta creada correctamente."
      : "Cuenta creada. Revisa tu correo para confirmarla.",
    errors: {},
  };
}