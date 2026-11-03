import { NextResponse } from "next/server";
import { getCurrentAccess } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getCurrentAccess();

  const headers = {
    "Cache-Control": "private, no-store",
  };

  if (!access.ok) {
    return NextResponse.json(
      { message: access.message },
      { status: access.status, headers },
    );
  }

  return NextResponse.json(
    {
      role: access.role,
      permissions: {
        editOwnProfile: hasPermission(
          access.role,
          "profile.update.own",
        ),
        manageOwnDocuments: hasPermission(
          access.role,
          "documents.manage.own",
        ),
        readUsers: hasPermission(access.role, "users.read"),
        changeRoles: hasPermission(
          access.role,
          "users.roles.update",
        ),
        changeAccountStatus: hasPermission(
          access.role,
          "users.status.update",
        ),
      },
    },
    { headers },
  );
}
