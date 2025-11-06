"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * If true, only allow access when user is NOT authenticated
   * (for login/signup pages)
   */
  requireUnauth?: boolean;
}

/**
 * Client-side authentication guard component
 *
 * IMPORTANT: This provides UX-level protection and loading states.
 * Always validate sessions on the server for actual security.
 */
export function AuthGuard({ children, requireUnauth = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Get session from Better Auth
        const session = await authClient.getSession();

        if (session?.user) {
          setIsAuthenticated(true);

          // If this is an unauth-only page (login/signup) and user is authenticated,
          // redirect to dashboard
          if (requireUnauth) {
            router.replace("/dashboard");
            return;
          }
        } else {
          setIsAuthenticated(false);

          // If authentication is required and user is not authenticated,
          // redirect to login
          if (!requireUnauth) {
            router.replace(`/login?from=${encodeURIComponent(pathname)}`);
            return;
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);

        if (!requireUnauth) {
          router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        }
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [router, pathname, requireUnauth]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if redirecting
  if (
    (requireUnauth && isAuthenticated) ||
    (!requireUnauth && !isAuthenticated)
  ) {
    return null;
  }

  // Render children if auth state matches requirements
  return <>{children}</>;
}
