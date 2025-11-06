"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await authClient.getSession();

        // Check if session exists - the structure is { data: { session, user }, error }
        if (session?.data?.user) {
          setIsAuthenticated(true);
          // Redirect authenticated users to dashboard
          router.push("/dashboard");
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      }
    }

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <main className="p-8 flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">SocialPost</h1>
        <div className="flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </main>
    );
  }

  // Show sign-in form for unauthenticated users
  if (isAuthenticated === false) {
    return (
      <main className="p-8 flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">SocialPost</h1>
        <div className="flex flex-col gap-8 w-96 mx-auto">
          <p className="text-center">
            Log in to schedule your social media posts
          </p>
          <Link href="/login">
            <Button className="w-full">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="w-full">
              Sign up
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  // Redirecting authenticated users
  return (
    <main className="p-8 flex flex-col gap-8">
      <h1 className="text-4xl font-bold text-center">SocialPost</h1>
      <div className="flex justify-center items-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    </main>
  );
}
