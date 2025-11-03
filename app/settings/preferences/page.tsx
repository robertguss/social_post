"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { PreferenceForm } from "@/components/features/PreferenceForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Posting Preferences Settings Page
 *
 * Allows users to define custom posting time windows that override research-based recommendations
 */
export default function PostingPreferencesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [preferenceToDelete, setPreferenceToDelete] = useState<Id<"posting_preferences"> | null>(null);

  // Fetch user preferences
  const userPreferences = useQuery(api.postingPreferences.getPostingPreferences, {});
  const deletePreference = useMutation(api.postingPreferences.deletePostingPreference);
  const resetAll = useMutation(api.postingPreferences.resetAllPostingPreferences);

  // Fetch default recommendations for comparison (we'll show Twitter Monday as example)
  const defaultRecommendations = useQuery(api.recommendations.getRecommendedTimes, {
    date: getNextMonday(), // Show Monday's recommendations as example
    platform: "twitter",
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const handleDeleteClick = (preferenceId: Id<"posting_preferences">) => {
    setPreferenceToDelete(preferenceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!preferenceToDelete) return;

    try {
      await deletePreference({ preferenceId: preferenceToDelete });
      toast.success("Preference deleted", {
        description: "Reverted to default recommendations for this time slot",
      });
      setDeleteDialogOpen(false);
      setPreferenceToDelete(null);
    } catch (error) {
      toast.error("Failed to delete preference", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleResetAll = async () => {
    try {
      await resetAll();
      toast.success("All preferences reset", {
        description: "All custom preferences have been cleared. Using default recommendations.",
      });
      setResetDialogOpen(false);
    } catch (error) {
      toast.error("Failed to reset preferences", {
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
          <div className="container mx-auto max-w-6xl p-6">
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Posting Preferences</h1>
                  <p className="mt-2 text-muted-foreground">
                    Define your preferred posting times to override default recommendations
                  </p>
                </div>
                <Button onClick={() => setIsFormOpen(true)} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Preference
                </Button>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Default Recommendations Column */}
                <Card>
                  <CardHeader>
                    <CardTitle>Default Recommendations</CardTitle>
                    <CardDescription>
                      Research-based best practices for optimal engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        These recommendations are based on industry research and engagement data.
                      </p>
                      {defaultRecommendations && defaultRecommendations.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Example: Twitter on Monday</p>
                          {defaultRecommendations
                            .filter((rec) => rec.source !== "user preference")
                            .map((rec, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div>
                                  <p className="font-medium">{rec.timeRange}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Engagement Score: {rec.engagementScore}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading recommendations...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Your Custom Preferences Column */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Your Custom Preferences</CardTitle>
                        <CardDescription>
                          Your preferred posting times (overrides defaults)
                        </CardDescription>
                      </div>
                      {userPreferences && userPreferences.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResetDialogOpen(true)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset All
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!userPreferences || userPreferences.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground">
                          No custom preferences yet. Add your first preference to override default
                          recommendations.
                        </p>
                        <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Preference
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userPreferences.map((pref) => (
                          <div
                            key={pref._id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium capitalize">{pref.platform}</p>
                                <span className="text-sm text-muted-foreground">
                                  {getDayName(pref.dayOfWeek)}
                                </span>
                              </div>
                              <div className="mt-1 space-y-1">
                                {pref.customTimeRanges.map((range, index) => (
                                  <p key={index} className="text-sm text-muted-foreground">
                                    {formatTimeRange(range.startHour, range.endHour)}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(pref._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Helper Text */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Custom preferences will override defaults in the
                    scheduler picker. If you set a preference for &ldquo;Twitter Monday 7-9am&rdquo;, this time
                    will be prioritized whenever you schedule a Twitter post on Monday. All other
                    days and platforms will continue using research-based recommendations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Preference Form Modal */}
      <PreferenceForm open={isFormOpen} onOpenChange={setIsFormOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preference?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your custom preference and revert to default recommendations for
              this time slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Preferences?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your custom preferences and revert to research-based
              recommendations for all platforms and days. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAll}>Reset All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

// Helper functions
function getDayName(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek];
}

function formatTimeRange(startHour: number, endHour: number): string {
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split("T")[0];
}
