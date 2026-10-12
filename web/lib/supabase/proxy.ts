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
  const userId = data?.claims?.sub;
  const pathname = request.nextUrl.pathname;

  const privatePaths = [
    "/dashboard",
    "/profile",
    "/documents",
    "/projects",
    "/admin",
    "/reset-password",
  ];

  const isPrivateRoute = privatePaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!userId && isPrivateRoute) {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(new URL("/login", request.url)),
    );
  }

  let isActive = false;

  if (userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return copyCookies(
        supabaseResponse,
        new NextResponse(
          "No fue posible verificar el estado de tu cuenta. Intenta nuevamente.",
          {
            status: 503,
            headers: { "Cache-Control": "private, no-store" },
          },
        ),
      );
    }

    isActive = profile?.is_active === true;

    if (!isActive && isPrivateRoute) {
      return copyCookies(
        supabaseResponse,
        NextResponse.redirect(new URL("/blocked", request.url)),
      );
    }
  }

  if (isActive && (pathname === "/" || pathname === "/login")) {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  return supabaseResponse;
}
