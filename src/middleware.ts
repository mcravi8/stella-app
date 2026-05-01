import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // API routes do their own auth (or are intentionally public, like /api/scrape-hn-show
  // hit by cron). Running the cookie-refreshing supabase.auth.getUser() here on calls
  // with no cookies has thrown MIDDLEWARE_INVOCATION_FAILED in production. Skip them.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next({ request });
  }

  // PWA manifest + auto-generated icon routes must be reachable to logged-out users
  // (the browser fetches them on the login page itself, before any auth context
  // exists). Without this, the manifest fetch gets redirected to /login and parsed
  // as HTML — which kills standalone-mode launch from the home screen.
  const p = request.nextUrl.pathname;
  if (
    p === '/manifest.webmanifest' ||
    p === '/icon' ||
    p === '/apple-icon' ||
    p === '/favicon.ico' ||
    p.startsWith('/icon/') ||
    p.startsWith('/apple-icon/')
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any));
        },
      },
    }
  );

  // Don't let a transient Supabase hiccup crash the entire middleware chain
  // and surface as MIDDLEWARE_INVOCATION_FAILED to the user.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error('[middleware] supabase.auth.getUser() failed:', err);
  }

  const PUBLIC_PATHS = ['/login', '/signup', '/auth/', '/success', '/cancel', '/unauthorized'];
  const isPublic = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
