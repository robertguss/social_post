"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <>
      <main className="p-8 flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">
          Social Posting Scheduler
        </h1>
        <Authenticated>
          <WelcomeContent />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p className="text-center">
        Log in to schedule your social media posts
      </p>
      <SignInButton mode="modal">
        <button className="bg-foreground text-background px-4 py-2 rounded-md">
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="bg-foreground text-background px-4 py-2 rounded-md">
          Sign up
        </button>
      </SignUpButton>
    </div>
  );
}

function WelcomeContent() {
  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      <p className="text-center">
        Welcome to your social posting scheduler! Get started by connecting your
        accounts and scheduling your first post.
      </p>
      <div className="flex flex-col gap-4">
        <Link
          href="/schedule"
          className="bg-foreground text-background px-6 py-3 rounded-md text-center hover:opacity-90"
        >
          Schedule a Post
        </Link>
        <Link
          href="/settings"
          className="border-2 border-foreground text-foreground px-6 py-3 rounded-md text-center hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Connect Your Accounts
        </Link>
      </div>
    </div>
  );
}
