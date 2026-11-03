import "server-only";

import { cookies } from "next/headers";

export const LOGIN_SESSION_COOKIE = "pdf-interactivo-login-session";

export function loginSessionValue(userId: string): string {
  const epoch = process.env.PDF_INTERACTIVO_LOGIN_EPOCH ?? "unmanaged";
  return `${epoch}:${userId}`;
}

export async function hasLoginSession(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(LOGIN_SESSION_COOKIE)?.value === loginSessionValue(userId);
}

export async function createLoginSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(LOGIN_SESSION_COOKIE, loginSessionValue(userId), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearLoginSession() {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_SESSION_COOKIE);
}
