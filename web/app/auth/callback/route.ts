import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/server";

const RECOVERY_PATH = "/reset-password";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");

  if (!code || next !== RECOVERY_PATH) {
    return NextResponse.redirect(
      new URL("/forgot-password?error=invalid-link", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/forgot-password?error=invalid-link", request.url),
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(PASSWORD_RECOVERY_COOKIE, "verified", {
    httpOnly: true,
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.redirect(new URL(RECOVERY_PATH, request.url));
}
