"use client";

import { ConnectionManager } from "@/components/features/ConnectionManager";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

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

  // Fetch user preferences
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const updatePreferences = useMutation(api.userPreferences.updateUserPreferences);

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

  // Handle preference toggle
  const handlePrePopToggle = async (enabled: boolean) => {
    try {
      await updatePreferences({ enableContentPrePopulation: enabled });
      toast.success("Preference updated", {
        description: `Smart content pre-fill ${enabled ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      toast.error("Failed to update preference", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

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

              {/* Content Creation Preferences Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Content Creation</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Customize your content creation experience
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Smart Content Pre-fill</CardTitle>
                    <CardDescription>
                      Automatically pre-populate LinkedIn content with your Twitter content
                      for easy expansion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enable-pre-pop" className="text-base">
                          Enable Smart Content Pre-fill
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          When enabled, a button will appear to copy your Twitter content to
                          LinkedIn after you finish typing
                        </p>
                      </div>
                      <Switch
                        id="enable-pre-pop"
                        checked={userPreferences?.enableContentPrePopulation ?? true}
                        onCheckedChange={handlePrePopToggle}
                        aria-label="Toggle smart content pre-fill"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
