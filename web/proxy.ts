import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/profile/:path*",
    "/documents/:path*",
    "/projects/:path*",
    "/admin/:path*",
    "/reset-password",
  ],
};
