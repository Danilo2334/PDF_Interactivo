import "server-only";

import { hasLoginSession } from "@/lib/auth/login-session";
import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  parseUserRole,
  type Permission,
  type UserRole,
} from "@/lib/auth/permissions";

type AccessResult =
  | {
      ok: true;
      userId: string;
      role: UserRole;
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      message: string;
    };

export async function getCurrentAccess(): Promise<AccessResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      message: "Debes iniciar sesión.",
    };
  }

  if (!(await hasLoginSession(user.id))) {
    return {
      ok: false,
      status: 401,
      message: "Debes iniciar sesión nuevamente.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 503,
      message: "No fue posible verificar tus permisos.",
    };
  }

  const role = parseUserRole(profile?.role);

  if (!role || profile?.is_active !== true) {
    return {
      ok: false,
      status: 403,
      message: "Tu cuenta no tiene acceso habilitado.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    role,
  };
}

export async function checkPermission(
  permission: Permission,
): Promise<AccessResult> {
  const access = await getCurrentAccess();

  if (!access.ok) {
    return access;
  }

  if (!hasPermission(access.role, permission)) {
    return {
      ok: false,
      status: 403,
      message: "No tienes permiso para realizar esta acción.",
    };
  }

  return access;
}
