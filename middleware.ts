import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Better Auth route protection
 *
 * IMPORTANT: This middleware only does basic routing.
 * Actual authentication validation happens in the AuthGuard component.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API routes to pass through
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup"];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For all other routes, let them through
  // The AuthGuard component will handle authentication checks
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)).*)",
  ],
};
