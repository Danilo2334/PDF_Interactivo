"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileFieldErrors,
  profileSchema,
  type ProfileFieldErrors,
  type ProfileInput,
} from "@/lib/validations/profile";

export type UpdateProfileActionResult = {
  success: boolean;
  message: string;
  errors: ProfileFieldErrors;
};

export async function updateProfileAction(
  input: ProfileInput,
): Promise<UpdateProfileActionResult> {
  const result = profileSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      message: "Revisa los datos marcados.",
      errors: getProfileFieldErrors(result.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Tu sesión no es válida. Inicia sesión nuevamente.",
      errors: {},
    };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: result.data.fullName,
    },
  });

  if (error) {
    return {
      success: false,
      message: "No fue posible actualizar el perfil. Inténtalo nuevamente.",
      errors: {},
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return {
    success: true,
    message: "Perfil actualizado correctamente.",
    errors: {},
  };
}
