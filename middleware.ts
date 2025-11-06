import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Better Auth route protection
 *
 * IMPORTANT: This only checks for the existence of a session cookie,
 * it does NOT validate the session. Always validate sessions on the server
 * for protected actions using auth.api.getSession().
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup", "/api/auth"];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");

  // If no session cookie exists, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists (but still needs server validation in components)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)).*)",
  ],
};
