import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;
  const isPrivateRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/profile");

  if (!isAuthenticated && isPrivateRoute) {
    const loginUrl = new URL("/login", request.url);
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
  }

  if (isAuthenticated && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(dashboardUrl),
    );
  }

  return supabaseResponse;
}
