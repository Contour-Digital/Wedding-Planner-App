import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and redirects signed
// out users away from protected routes. Wired up in src/middleware.ts.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // setAll gets the whole batch in one call, unlike the older
        // get/set/remove API — that older API called set()/remove() once
        // per cookie, and each call here used to rebuild `response` from
        // scratch, so every write but the last got silently dropped. A
        // refreshed session's auth cookie is exactly the case that writes
        // more than one cookie at once, so that bug corrupted the session
        // on refresh — the next time the app reopened, the token couldn't
        // be read back and it looked signed out. Building `response` once
        // per request and writing every cookie onto that same object
        // (matching Supabase's own documented pattern) fixes it.
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    // Invite links are opened by people who don't have an account (or
    // aren't signed in) yet — both the landing page and the API it calls
    // to read/claim the invite need to be reachable before auth.
    request.nextUrl.pathname.startsWith("/invite") ||
    request.nextUrl.pathname.startsWith("/api/invite-link");

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
