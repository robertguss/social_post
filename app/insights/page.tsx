import { PerformanceInsights } from "@/components/features/PerformanceInsights";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export const metadata = {
  title: "Performance Insights | Social Post Scheduler",
  description: "View your post performance analytics and best posting times",
};

/**
 * Performance Insights Page
 *
 * Displays aggregated engagement metrics and best-performing posting times
 * based on historical data from Twitter and LinkedIn.
 *
 * NOTE: This feature requires API access to Twitter/LinkedIn engagement metrics.
 * See docs/features/performance-tracking.md for setup instructions.
 *
 * Protected by Clerk middleware (configured in middleware.ts).
 */
export default function InsightsPage() {
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
          <main className="min-h-screen py-8">
            <PerformanceInsights />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
