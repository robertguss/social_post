import { PostHistory } from "@/components/features/PostHistory";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export const metadata = {
  title: "Post History | Social Post Scheduler",
  description: "View your scheduled and published social media posts",
};

/**
 * Post History Page
 *
 * Displays a list of user's scheduled and published posts with filtering options.
 * Protected by Clerk middleware (configured in middleware.ts).
 */
export default function HistoryPage() {
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
            <PostHistory />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
