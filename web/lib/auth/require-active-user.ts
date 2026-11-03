import "server-only";

import { redirect } from "next/navigation";
import { getCurrentAccess } from "@/lib/auth/access";

export async function requireActiveUser() {
  const access = await getCurrentAccess();

  if (!access.ok) {
    if (access.status === 401) {
      redirect("/login");
    }

    if (access.status === 403) {
      redirect("/blocked");
    }

    throw new Error(access.message);
  }

  return access;
}
