"use client";

import { ConnectionManager } from "@/components/features/ConnectionManager";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Settings Page
 *
 * Manages user settings and platform connections.
 * Displays success/error messages from OAuth callbacks.
 */
export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Check for success/error messages from OAuth callback
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setMessage({ type: "success", text: success });
    } else if (error) {
      setMessage({ type: "error", text: error });
    }

    // Clear message after 5 seconds
    if (success || error) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="container mx-auto max-w-4xl p-6">
            <div className="space-y-6">
              {/* Page Header */}
              <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="mt-2 text-muted-foreground">
                  Manage your platform connections and account settings
                </p>
              </div>

              {/* Success/Error Messages */}
              {message && (
                <div
                  className={`rounded-lg border p-4 ${
                    message.type === "success"
                      ? "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
                      : "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
                  }`}
                >
                  <p className="font-medium">{message.text}</p>
                </div>
              )}

              {/* Platform Connections Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Platform Connections</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Connect your social media accounts to schedule and publish posts
                  </p>
                </div>

                <ConnectionManager />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
