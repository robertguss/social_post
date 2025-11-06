"use client";

import { Authenticated } from "convex/react";
import { UserMenu } from "@/components/user-menu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export function Header() {
  const currentUser = useQuery(api.auth.getCurrentUser);

  return (
    <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
      <Link href="/" className="text-lg font-semibold hover:underline">
        Social Posting Scheduler
      </Link>
      <div className="flex items-center gap-4">
        <Authenticated>
          <Link href="/schedule" className="text-sm hover:underline">
            Schedule Post
          </Link>
          <Link href="/history" className="text-sm hover:underline">
            Post History
          </Link>
          <Link href="/settings" className="text-sm hover:underline">
            Settings
          </Link>
        </Authenticated>
        <UserMenu user={currentUser ? { name: currentUser.name, email: currentUser.email, image: currentUser.image } : undefined} />
      </div>
    </header>
  );
}
