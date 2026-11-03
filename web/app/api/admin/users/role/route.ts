import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/auth/access";
import { parseUserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

function reply(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers });
}

export async function PATCH(request: Request) {
  const access = await checkPermission("users.roles.update");

  if (!access.ok) {
    return reply(access.message, access.status);
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply("Origen de la solicitud no permitido.", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return reply("La solicitud no contiene un JSON válido.", 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("userId" in body) ||
    !("role" in body)
  ) {
    return reply("Debes indicar el usuario y el rol.", 400);
  }

  const userId = body.userId;
  const role = parseUserRole(body.role);

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    typeof userId !== "string" ||
    !uuidPattern.test(userId) ||
    !role
  ) {
    return reply("Usuario o rol inválido.", 400);
  }

  if (userId === access.userId) {
    return reply("No puedes modificar tu propio rol.", 400);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    if (error.code === "42501") {
      return reply("No tienes permiso para realizar esta acción.", 403);
    }

    if (error.code === "22023") {
      return reply("El cambio de rol solicitado no está permitido.", 400);
    }

    if (error.code === "P0002") {
      return reply("El usuario no existe.", 404);
    }

    console.error("Error cambiando el rol:", error.code);
    return reply("No fue posible actualizar el rol.", 500);
  }

  return NextResponse.json(
    {
      message: "Rol actualizado correctamente.",
      user: data,
    },
    { headers },
  );
}
